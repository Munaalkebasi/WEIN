import { Router, type IRouter, type Request } from "express";
import {
  AddPlanMemberBody,
  AddPlanMemberParams,
  AddPlanMessageBody,
  AddPlanMessageParams,
  AddPlanPollSuggestionBody,
  AddPlanPollSuggestionParams,
  AddSharedPlanItemBody,
  AddSharedPlanItemParams,
  CompletePlanBody,
  CompletePlanParams,
  CreatePlanBody,
  CreatePlanPollBody,
  CreatePlanPollParams,
  FinalizePlanBody,
  FinalizePlanParams,
  GetPlanWorkspaceParams,
  ListPlansQueryParams,
  RegisterPlanMediaBody,
  RegisterPlanMediaParams,
  VoteOnPlanPollBody,
  VoteOnPlanPollParams,
} from "@workspace/api-zod";
import {
  and,
  asc,
  desc,
  eq,
  inArray,
} from "drizzle-orm";
import {
  db,
  planAttendanceTable,
  planDecisionsTable,
  planMediaTable,
  planMembersTable,
  planMemoriesTable,
  planMessagesTable,
  planPollOptionsTable,
  planPollVotesTable,
  planPollsTable,
  plansTable,
  planSharedItemsTable,
  type Plan,
  type PlanMember,
  type PlanPoll,
  type PlanPollOption,
} from "@workspace/db";
import { ApiError } from "../lib/api-error";

const router: IRouter = Router();

type SchemaLike = {
  safeParse: (input: unknown) =>
    | { success: true; data: unknown }
    | { success: false; error: { flatten: () => unknown } };
};

function parse<T>(schema: SchemaLike, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new ApiError(400, "VALIDATION_ERROR", "Request validation failed", {
      issues: result.error.flatten(),
    });
  }
  return result.data as T;
}

function actorFrom(request: Request): string {
  const actor = request.get("x-user-id")?.trim();
  if (!actor) {
    throw new ApiError(
      401,
      "ACTOR_REQUIRED",
      "X-User-Id is required until an authentication provider is integrated",
    );
  }
  return actor;
}

async function getPlan(planId: string): Promise<Plan> {
  const [plan] = await db
    .select()
    .from(plansTable)
    .where(eq(plansTable.id, planId));
  if (!plan) throw new ApiError(404, "PLAN_NOT_FOUND", "Plan was not found");
  return plan;
}

async function requireMember(
  planId: string,
  actor: string,
): Promise<{ plan: Plan; member: PlanMember }> {
  const plan = await getPlan(planId);
  const [member] = await db
    .select()
    .from(planMembersTable)
    .where(
      and(
        eq(planMembersTable.planId, planId),
        eq(planMembersTable.userId, actor),
      ),
    );
  if (!member) {
    throw new ApiError(
      403,
      "PLAN_MEMBERSHIP_REQUIRED",
      "You must be a member of this plan",
    );
  }
  return { plan, member };
}

function requirePermission(
  member: PlanMember,
  permission: "managePolls" | "finalize",
): void {
  const allowed =
    member.role === "owner" ||
    (permission === "managePolls"
      ? member.canManagePolls
      : member.canFinalize);
  if (!allowed) {
    throw new ApiError(
      403,
      "PLAN_PERMISSION_REQUIRED",
      permission === "managePolls"
        ? "Only the plan owner or permitted members can manage polls"
        : "Only the plan owner or permitted members can finalize this plan",
    );
  }
}

function cardFor(
  entityType: "place" | "event" | "activity",
  entityId: string,
) {
  return {
    entityType,
    entityId,
    title: null,
    category: null,
    imageUrl: null,
    rating: null,
    distanceKm: null,
    priceLevel: null,
    openStatus: null,
    ageRestriction: null,
  };
}

function optionCard(option: PlanPollOption) {
  if (
    (option.kind === "place" ||
      option.kind === "event" ||
      option.kind === "activity") &&
    option.entityId
  ) {
    return cardFor(option.kind, option.entityId);
  }
  return null;
}

async function serializePoll(
  poll: PlanPoll,
  actor: string,
): Promise<Record<string, unknown>> {
  const options = await db
    .select()
    .from(planPollOptionsTable)
    .where(eq(planPollOptionsTable.pollId, poll.id))
    .orderBy(asc(planPollOptionsTable.createdAt));
  const votes = await db
    .select()
    .from(planPollVotesTable)
    .where(eq(planPollVotesTable.pollId, poll.id));
  const totalVotes = votes.length;

  return {
    id: poll.id,
    planId: poll.planId,
    createdByUserId: poll.createdByUserId,
    kind: poll.kind,
    question: poll.question,
    selectionMode: poll.selectionMode,
    allowSuggestions: poll.allowSuggestions,
    status:
      poll.expiresAt && poll.expiresAt < new Date() ? "closed" : poll.status,
    expiresAt: poll.expiresAt,
    createdAt: poll.createdAt,
    totalVotes,
    options: options.map((option) => {
      const voteCount = votes.filter((vote) => vote.optionId === option.id)
        .length;
      return {
        id: option.id,
        pollId: option.pollId,
        kind: option.kind,
        entityId: option.entityId,
        value: option.value,
        card: optionCard(option),
        addedByUserId: option.addedByUserId,
        isSuggestion: option.isSuggestion,
        voteCount,
        percentage: totalVotes
          ? Math.round((voteCount / totalVotes) * 10000) / 100
          : 0,
        selectedByMe: votes.some(
          (vote) => vote.optionId === option.id && vote.voterUserId === actor,
        ),
        createdAt: option.createdAt,
      };
    }),
  };
}

async function loadPoll(
  planId: string,
  pollId: string,
): Promise<PlanPoll> {
  const [poll] = await db
    .select()
    .from(planPollsTable)
    .where(and(eq(planPollsTable.id, pollId), eq(planPollsTable.planId, planId)));
  if (!poll) throw new ApiError(404, "POLL_NOT_FOUND", "Poll was not found");
  return poll;
}

function validatePollOption(
  pollKind: "place" | "date" | "time",
  option: { kind: string; entityId?: string | null; value?: string | null },
) {
  if (pollKind === "place") {
    if (
      !["place", "event", "activity"].includes(option.kind) ||
      !option.entityId
    ) {
      throw new ApiError(
        400,
        "INVALID_POLL_OPTION",
        "Place polls require a place, event, or activity reference",
      );
    }
  } else if (option.kind !== pollKind || !option.value) {
    throw new ApiError(
      400,
      "INVALID_POLL_OPTION",
      `${pollKind} polls require a ${pollKind} value`,
    );
  }
}

router.get("/plans", async (request, response) => {
  const actor = actorFrom(request);
  const query = parse<{ status?: "planning" | "confirmed" | "completed" | "archived" }>(
    ListPlansQueryParams,
    request.query,
  );
  const memberships = await db
    .select({ planId: planMembersTable.planId })
    .from(planMembersTable)
    .where(eq(planMembersTable.userId, actor));
  const planIds = memberships.map((membership) => membership.planId);
  if (planIds.length === 0) return response.json({ plans: [] });

  const plans = await db
    .select()
    .from(plansTable)
    .where(
      query.status
        ? and(inArray(plansTable.id, planIds), eq(plansTable.status, query.status))
        : inArray(plansTable.id, planIds),
    )
    .orderBy(desc(plansTable.updatedAt));
  return response.json({ plans });
});

router.post("/plans", async (request, response) => {
  const actor = actorFrom(request);
  const body = parse<{
    name: string;
    description?: string;
    privacy?: "private" | "public";
  }>(CreatePlanBody, request.body);
  const plan = await db.transaction(async (transaction) => {
    const [created] = await transaction
      .insert(plansTable)
      .values({
        creatorUserId: actor,
        name: body.name,
        description: body.description,
        privacy: body.privacy ?? "private",
      })
      .returning();
    await transaction.insert(planMembersTable).values({
      planId: created.id,
      userId: actor,
      role: "owner",
      canFinalize: true,
      canManagePolls: true,
    });
    await transaction.insert(planAttendanceTable).values({
      planId: created.id,
      userId: actor,
      status: "going",
      ticketStatus: "not_applicable",
    });
    return created;
  });
  return response.status(201).json(plan);
});

router.get("/plans/:planId", async (request, response) => {
  const actor = actorFrom(request);
  const { planId } = parse<{ planId: string }>(
    GetPlanWorkspaceParams,
    request.params,
  );
  const { plan } = await requireMember(planId, actor);
  const [
    members,
    messages,
    sharedItems,
    polls,
    [decision],
    attendance,
    media,
    [memory],
  ] = await Promise.all([
    db
      .select()
      .from(planMembersTable)
      .where(eq(planMembersTable.planId, planId))
      .orderBy(asc(planMembersTable.joinedAt)),
    db
      .select()
      .from(planMessagesTable)
      .where(eq(planMessagesTable.planId, planId))
      .orderBy(asc(planMessagesTable.createdAt)),
    db
      .select()
      .from(planSharedItemsTable)
      .where(eq(planSharedItemsTable.planId, planId))
      .orderBy(asc(planSharedItemsTable.createdAt)),
    db
      .select()
      .from(planPollsTable)
      .where(eq(planPollsTable.planId, planId))
      .orderBy(desc(planPollsTable.createdAt)),
    db
      .select()
      .from(planDecisionsTable)
      .where(eq(planDecisionsTable.planId, planId)),
    db
      .select()
      .from(planAttendanceTable)
      .where(eq(planAttendanceTable.planId, planId)),
    db
      .select()
      .from(planMediaTable)
      .where(eq(planMediaTable.planId, planId))
      .orderBy(desc(planMediaTable.createdAt)),
    db
      .select()
      .from(planMemoriesTable)
      .where(eq(planMemoriesTable.planId, planId)),
  ]);

  return response.json({
    plan,
    members,
    messages,
    sharedItems: sharedItems.map((item) => ({
      ...item,
      card: cardFor(item.entityType, item.entityId),
    })),
    polls: await Promise.all(polls.map((poll) => serializePoll(poll, actor))),
    decision: decision ?? null,
    attendance,
    media,
    memory: memory ?? null,
  });
});

router.post("/plans/:planId/members", async (request, response) => {
  const actor = actorFrom(request);
  const { planId } = parse<{ planId: string }>(
    AddPlanMemberParams,
    request.params,
  );
  const { member } = await requireMember(planId, actor);
  if (member.role !== "owner") {
    throw new ApiError(403, "PLAN_OWNER_REQUIRED", "Only the plan owner can add members");
  }
  const body = parse<{
    userId: string;
    displayName?: string;
    canFinalize?: boolean;
    canManagePolls?: boolean;
  }>(AddPlanMemberBody, request.body);
  const [existing] = await db
    .select()
    .from(planMembersTable)
    .where(
      and(
        eq(planMembersTable.planId, planId),
        eq(planMembersTable.userId, body.userId),
      ),
    );
  if (existing) throw new ApiError(409, "MEMBER_EXISTS", "User is already a member");
  const [created] = await db.transaction(async (transaction) => {
    const [newMember] = await transaction
      .insert(planMembersTable)
      .values({
        planId,
        userId: body.userId,
        displayName: body.displayName,
        canFinalize: body.canFinalize ?? false,
        canManagePolls: body.canManagePolls ?? false,
      })
      .returning();
    await transaction.insert(planAttendanceTable).values({
      planId,
      userId: body.userId,
      status: "invited",
      ticketStatus: "not_applicable",
    });
    return [newMember];
  });
  return response.status(201).json(created);
});

router.post("/plans/:planId/messages", async (request, response) => {
  const actor = actorFrom(request);
  const { planId } = parse<{ planId: string }>(
    AddPlanMessageParams,
    request.params,
  );
  await requireMember(planId, actor);
  const body = parse<{
    type: "text" | "emoji" | "shared_item" | "poll" | "media" | "system";
    body?: string;
    replyToMessageId?: string | null;
  }>(AddPlanMessageBody, request.body);
  if (body.replyToMessageId) {
    const [reply] = await db
      .select({ id: planMessagesTable.id })
      .from(planMessagesTable)
      .where(
        and(
          eq(planMessagesTable.id, body.replyToMessageId),
          eq(planMessagesTable.planId, planId),
        ),
      );
    if (!reply) {
      throw new ApiError(
        400,
        "INVALID_REPLY",
        "The reply target must belong to this plan",
      );
    }
  }
  const [message] = await db
    .insert(planMessagesTable)
    .values({
      planId,
      authorUserId: actor,
      type: body.type,
      body: body.body,
      replyToMessageId: body.replyToMessageId,
    })
    .returning();
  return response.status(201).json(message);
});

router.post("/plans/:planId/shared-items", async (request, response) => {
  const actor = actorFrom(request);
  const { planId } = parse<{ planId: string }>(
    AddSharedPlanItemParams,
    request.params,
  );
  await requireMember(planId, actor);
  const body = parse<{
    entityType: "place" | "event" | "activity";
    entityId: string;
    messageId?: string | null;
  }>(AddSharedPlanItemBody, request.body);
  const [sharedItem] = await db.transaction(async (transaction) => {
    let messageId = body.messageId ?? null;
    if (messageId) {
      const [message] = await transaction
        .select({ id: planMessagesTable.id })
        .from(planMessagesTable)
        .where(
          and(
            eq(planMessagesTable.id, messageId),
            eq(planMessagesTable.planId, planId),
          ),
        );
      if (!message) {
        throw new ApiError(
          400,
          "INVALID_MESSAGE",
          "The message target must belong to this plan",
        );
      }
    }
    if (!messageId) {
      const [message] = await transaction
        .insert(planMessagesTable)
        .values({
          planId,
          authorUserId: actor,
          type: "shared_item",
        })
        .returning({ id: planMessagesTable.id });
      messageId = message.id;
    }
    return transaction
      .insert(planSharedItemsTable)
      .values({
        planId,
        sharedByUserId: actor,
        entityType: body.entityType,
        entityId: body.entityId,
        messageId,
      })
      .returning();
  });
  return response.status(201).json({
    ...sharedItem,
    card: cardFor(sharedItem.entityType, sharedItem.entityId),
  });
});

router.post("/plans/:planId/polls", async (request, response) => {
  const actor = actorFrom(request);
  const { planId } = parse<{ planId: string }>(
    CreatePlanPollParams,
    request.params,
  );
  const { member } = await requireMember(planId, actor);
  requirePermission(member, "managePolls");
  const body = parse<{
    kind: "place" | "date" | "time";
    question: string;
    selectionMode?: "single" | "multiple";
    allowSuggestions?: boolean;
    expiresAt?: Date;
    options: Array<{
      kind: "place" | "event" | "activity" | "date" | "time";
      entityId?: string;
      value?: string;
    }>;
  }>(CreatePlanPollBody, request.body);
  body.options.forEach((option) => validatePollOption(body.kind, option));

  const poll = await db.transaction(async (transaction) => {
    const [created] = await transaction
      .insert(planPollsTable)
      .values({
        planId,
        createdByUserId: actor,
        kind: body.kind,
        question: body.question,
        selectionMode: body.selectionMode ?? "single",
        allowSuggestions: body.allowSuggestions ?? false,
        expiresAt: body.expiresAt,
      })
      .returning();
    await transaction.insert(planPollOptionsTable).values(
      body.options.map((option) => ({
        pollId: created.id,
        kind: option.kind,
        entityId: option.entityId,
        value: option.value,
        addedByUserId: actor,
      })),
    );
    return created;
  });
  return response.status(201).json(await serializePoll(poll, actor));
});

router.post(
  "/plans/:planId/polls/:pollId/options",
  async (request, response) => {
    const actor = actorFrom(request);
    const { planId, pollId } = parse<{ planId: string; pollId: string }>(
      AddPlanPollSuggestionParams,
      request.params,
    );
    const { member } = await requireMember(planId, actor);
    const poll = await loadPoll(planId, pollId);
    if (!poll.allowSuggestions) {
      requirePermission(member, "managePolls");
    }
    if (poll.status !== "open" || (poll.expiresAt && poll.expiresAt < new Date())) {
      throw new ApiError(400, "POLL_CLOSED", "This poll is no longer accepting options");
    }
    const body = parse<{
      kind: "place" | "event" | "activity" | "date" | "time";
      entityId?: string;
      value?: string;
    }>(AddPlanPollSuggestionBody, request.body);
    validatePollOption(poll.kind, body);
    const [option] = await db
      .insert(planPollOptionsTable)
      .values({
        pollId,
        kind: body.kind,
        entityId: body.entityId,
        value: body.value,
        addedByUserId: actor,
        isSuggestion: true,
      })
      .returning();
    return response.status(201).json({
      id: option.id,
      pollId: option.pollId,
      kind: option.kind,
      entityId: option.entityId,
      value: option.value,
      card: optionCard(option),
      addedByUserId: option.addedByUserId,
      isSuggestion: option.isSuggestion,
      voteCount: 0,
      percentage: 0,
      selectedByMe: false,
      createdAt: option.createdAt,
    });
  },
);

router.post(
  "/plans/:planId/polls/:pollId/votes",
  async (request, response) => {
    const actor = actorFrom(request);
    const { planId, pollId } = parse<{ planId: string; pollId: string }>(
      VoteOnPlanPollParams,
      request.params,
    );
    await requireMember(planId, actor);
    const poll = await loadPoll(planId, pollId);
    if (poll.status !== "open" || (poll.expiresAt && poll.expiresAt < new Date())) {
      throw new ApiError(400, "POLL_CLOSED", "This poll is no longer accepting votes");
    }
    const body = parse<{ optionIds: string[] }>(
      VoteOnPlanPollBody,
      request.body,
    );
    const optionIds = [...new Set(body.optionIds)];
    if (poll.selectionMode === "single" && optionIds.length !== 1) {
      throw new ApiError(400, "SINGLE_CHOICE_POLL", "Choose exactly one option");
    }
    const options = await db
      .select()
      .from(planPollOptionsTable)
      .where(
        and(
          eq(planPollOptionsTable.pollId, pollId),
          inArray(planPollOptionsTable.id, optionIds),
        ),
      );
    if (options.length !== optionIds.length) {
      throw new ApiError(400, "INVALID_POLL_OPTION", "One or more options do not belong to this poll");
    }
    await db.transaction(async (transaction) => {
      await transaction
        .delete(planPollVotesTable)
        .where(
          and(
            eq(planPollVotesTable.pollId, pollId),
            eq(planPollVotesTable.voterUserId, actor),
          ),
        );
      await transaction.insert(planPollVotesTable).values(
        optionIds.map((optionId) => ({
          pollId,
          optionId,
          voterUserId: actor,
        })),
      );
    });
    return response.json(await serializePoll(poll, actor));
  },
);

router.post("/plans/:planId/finalize", async (request, response) => {
  const actor = actorFrom(request);
  const { planId } = parse<{ planId: string }>(
    FinalizePlanParams,
    request.params,
  );
  const { member } = await requireMember(planId, actor);
  requirePermission(member, "finalize");
  const body = parse<{
    placeOptionId?: string;
    dateOptionId?: string;
    timeOptionId?: string;
  }>(FinalizePlanBody, request.body ?? {});
  const optionIds = [
    body.placeOptionId,
    body.dateOptionId,
    body.timeOptionId,
  ].filter((optionId): optionId is string => Boolean(optionId));
  if (optionIds.length === 0) {
    throw new ApiError(400, "DECISION_REQUIRED", "Select at least one winning option");
  }
  const options = await db
    .select({ option: planPollOptionsTable, poll: planPollsTable })
    .from(planPollOptionsTable)
    .innerJoin(
      planPollsTable,
      eq(planPollsTable.id, planPollOptionsTable.pollId),
    )
    .where(
      and(
        eq(planPollsTable.planId, planId),
        inArray(planPollOptionsTable.id, optionIds),
      ),
    );
  if (options.length !== optionIds.length) {
    throw new ApiError(400, "INVALID_DECISION_OPTION", "A selected option is not part of this plan");
  }
  const requestedOptions: Array<{
    id: string;
    kind: "place" | "date" | "time";
  }> = [
    ...(body.placeOptionId
      ? [{ id: body.placeOptionId, kind: "place" as const }]
      : []),
    ...(body.dateOptionId
      ? [{ id: body.dateOptionId, kind: "date" as const }]
      : []),
    ...(body.timeOptionId
      ? [{ id: body.timeOptionId, kind: "time" as const }]
      : []),
  ];
  for (const requested of requestedOptions) {
    const selected = options.find(({ option }) => option.id === requested.id);
    if (!selected || selected.poll.kind !== requested.kind) {
      throw new ApiError(
        400,
        "INVALID_DECISION_OPTION",
        `The selected option must come from a ${requested.kind} poll`,
      );
    }
  }
  let placeEntityType: "place" | "event" | "activity" | null = null;
  let placeEntityId: string | null = null;
  let dateValue: string | null = null;
  let timeValue: string | null = null;
  for (const { option, poll } of options) {
    if (poll.kind === "place") {
      if (
        option.kind !== "place" &&
        option.kind !== "event" &&
        option.kind !== "activity"
      ) {
        throw new ApiError(400, "INVALID_DECISION_OPTION", "Place decision is invalid");
      }
      placeEntityType = option.kind;
      if (!option.entityId) {
        throw new ApiError(
          400,
          "INVALID_DECISION_OPTION",
          "Place decision is missing its canonical entity reference",
        );
      }
      placeEntityId = option.entityId;
    } else if (poll.kind === "date") {
      if (!option.value) {
        throw new ApiError(400, "INVALID_DECISION_OPTION", "Date decision is empty");
      }
      dateValue = option.value;
    } else if (poll.kind === "time") {
      if (!option.value) {
        throw new ApiError(400, "INVALID_DECISION_OPTION", "Time decision is empty");
      }
      timeValue = option.value;
    }
  }
  const decision = await db.transaction(async (transaction) => {
    const [existing] = await transaction
      .select()
      .from(planDecisionsTable)
      .where(eq(planDecisionsTable.planId, planId));
    const [saved] = existing
      ? await transaction
          .update(planDecisionsTable)
          .set({
            placeEntityType,
            placeEntityId,
            dateValue,
            timeValue,
            lockedByUserId: actor,
            lockedAt: new Date(),
          })
          .where(eq(planDecisionsTable.id, existing.id))
          .returning()
      : await transaction
          .insert(planDecisionsTable)
          .values({
            planId,
            placeEntityType,
            placeEntityId,
            dateValue,
            timeValue,
            lockedByUserId: actor,
          })
          .returning();
    await transaction
      .update(plansTable)
      .set({ status: "confirmed", updatedAt: new Date() })
      .where(eq(plansTable.id, planId));
    return saved;
  });
  return response.json(decision);
});

router.post("/plans/:planId/media", async (request, response) => {
  const actor = actorFrom(request);
  const { planId } = parse<{ planId: string }>(
    RegisterPlanMediaParams,
    request.params,
  );
  await requireMember(planId, actor);
  const body = parse<{
    kind: "photo" | "video";
    messageId?: string;
    mimeType?: string;
    byteSize?: number;
    durationSeconds?: number;
    metadata?: Record<string, unknown>;
  }>(RegisterPlanMediaBody, request.body);
  const [media] = await db
    .insert(planMediaTable)
    .values({
      planId,
      uploadedByUserId: actor,
      messageId: body.messageId,
      kind: body.kind,
      storageStatus: "metadata_only",
      mimeType: body.mimeType,
      byteSize: body.byteSize,
      durationSeconds: body.durationSeconds,
      metadata: body.metadata,
    })
    .returning();
  return response.status(201).json(media);
});

router.post("/plans/:planId/complete", async (request, response) => {
  const actor = actorFrom(request);
  const { planId } = parse<{ planId: string }>(
    CompletePlanParams,
    request.params,
  );
  const { plan, member } = await requireMember(planId, actor);
  requirePermission(member, "finalize");
  const body = parse<{
    title?: string;
    summary?: string;
    visibility?: "private" | "members";
  }>(CompletePlanBody, request.body ?? {});
  const [decision] = await db
    .select()
    .from(planDecisionsTable)
    .where(eq(planDecisionsTable.planId, planId));
  if (!decision) {
    throw new ApiError(400, "PLAN_NOT_FINALIZED", "Finalize the plan before completing it");
  }
  const result = await db.transaction(async (transaction) => {
    const [updatedPlan] = await transaction
      .update(plansTable)
      .set({ status: "completed", updatedAt: new Date() })
      .where(eq(plansTable.id, planId))
      .returning();
    const [existingMemory] = await transaction
      .select()
      .from(planMemoriesTable)
      .where(eq(planMemoriesTable.planId, planId));
    if (existingMemory) return { plan: updatedPlan, memory: existingMemory };
    const [memory] = await transaction
      .insert(planMemoriesTable)
      .values({
        planId,
        title: body.title ?? plan.name,
        summary: body.summary,
        visibility: body.visibility ?? "members",
      })
      .returning();
    return { plan: updatedPlan, memory };
  });
  return response.json(result);
});

export default router;