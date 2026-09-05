import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";

export const planPrivacyEnum = pgEnum("plan_privacy", ["private", "public"]);
export const planStatusEnum = pgEnum("plan_status", [
  "planning",
  "confirmed",
  "completed",
  "archived",
]);
export const planMemberRoleEnum = pgEnum("plan_member_role", [
  "owner",
  "member",
]);
export const messageTypeEnum = pgEnum("plan_message_type", [
  "text",
  "emoji",
  "shared_item",
  "poll",
  "media",
  "system",
]);
export const discoveryEntityTypeEnum = pgEnum("discovery_entity_type", [
  "place",
  "event",
  "activity",
]);
export const pollKindEnum = pgEnum("plan_poll_kind", ["place", "date", "time"]);
export const pollSelectionModeEnum = pgEnum("plan_poll_selection_mode", [
  "single",
  "multiple",
]);
export const pollStatusEnum = pgEnum("plan_poll_status", ["open", "closed"]);
export const pollOptionKindEnum = pgEnum("plan_poll_option_kind", [
  "place",
  "event",
  "activity",
  "date",
  "time",
]);
export const mediaKindEnum = pgEnum("plan_media_kind", ["photo", "video"]);
export const mediaStorageStatusEnum = pgEnum("plan_media_storage_status", [
  "metadata_only",
  "pending",
  "available",
  "failed",
]);
export const attendanceStatusEnum = pgEnum("plan_attendance_status", [
  "invited",
  "going",
  "maybe",
  "not_going",
]);
export const ticketStatusEnum = pgEnum("plan_ticket_status", [
  "not_applicable",
  "unclaimed",
  "user_reported",
  "externally_confirmed",
]);
export const memoryVisibilityEnum = pgEnum("plan_memory_visibility", [
  "private",
  "members",
]);

const createdAtColumn = () =>
  timestamp("created_at", {
    withTimezone: true,
    mode: "date",
  }).defaultNow().notNull();

export const plansTable = pgTable(
  "plans",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    creatorUserId: text("creator_user_id").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    privacy: planPrivacyEnum("privacy").default("private").notNull(),
    status: planStatusEnum("status").default("planning").notNull(),
    createdAt: createdAtColumn(),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "date",
    }).defaultNow().notNull(),
  },
  (table) => [
    index("plans_creator_idx").on(table.creatorUserId),
    index("plans_status_idx").on(table.status, table.updatedAt),
  ],
);

export const planMembersTable = pgTable(
  "plan_members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    planId: uuid("plan_id")
      .notNull()
      .references(() => plansTable.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    displayName: text("display_name"),
    role: planMemberRoleEnum("role").default("member").notNull(),
    canFinalize: boolean("can_finalize").default(false).notNull(),
    canManagePolls: boolean("can_manage_polls").default(false).notNull(),
    joinedAt: createdAtColumn(),
  },
  (table) => [
    uniqueIndex("plan_members_plan_user_idx").on(table.planId, table.userId),
    index("plan_members_user_idx").on(table.userId),
  ],
);

export const planMessagesTable = pgTable(
  "plan_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    planId: uuid("plan_id")
      .notNull()
      .references(() => plansTable.id, { onDelete: "cascade" }),
    authorUserId: text("author_user_id").notNull(),
    type: messageTypeEnum("type").default("text").notNull(),
    body: text("body"),
    replyToMessageId: uuid("reply_to_message_id"),
    createdAt: createdAtColumn(),
  },
  (table) => [
    index("plan_messages_plan_created_idx").on(table.planId, table.createdAt),
    index("plan_messages_reply_idx").on(table.replyToMessageId),
  ],
);

export const planSharedItemsTable = pgTable(
  "plan_shared_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    planId: uuid("plan_id")
      .notNull()
      .references(() => plansTable.id, { onDelete: "cascade" }),
    sharedByUserId: text("shared_by_user_id").notNull(),
    entityType: discoveryEntityTypeEnum("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    messageId: uuid("message_id").references(() => planMessagesTable.id, {
      onDelete: "set null",
    }),
    createdAt: createdAtColumn(),
  },
  (table) => [
    index("plan_shared_items_plan_created_idx").on(
      table.planId,
      table.createdAt,
    ),
    index("plan_shared_items_entity_idx").on(
      table.entityType,
      table.entityId,
    ),
  ],
);

export const planPollsTable = pgTable(
  "plan_polls",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    planId: uuid("plan_id")
      .notNull()
      .references(() => plansTable.id, { onDelete: "cascade" }),
    createdByUserId: text("created_by_user_id").notNull(),
    kind: pollKindEnum("kind").notNull(),
    question: text("question").notNull(),
    selectionMode: pollSelectionModeEnum("selection_mode")
      .default("single")
      .notNull(),
    allowSuggestions: boolean("allow_suggestions").default(false).notNull(),
    status: pollStatusEnum("status").default("open").notNull(),
    expiresAt: timestamp("expires_at", {
      withTimezone: true,
      mode: "date",
    }),
    createdAt: createdAtColumn(),
    closedAt: timestamp("closed_at", { withTimezone: true, mode: "date" }),
  },
  (table) => [
    index("plan_polls_plan_status_idx").on(table.planId, table.status),
    index("plan_polls_expiry_idx").on(table.expiresAt),
  ],
);

export const planPollOptionsTable = pgTable(
  "plan_poll_options",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    pollId: uuid("poll_id")
      .notNull()
      .references(() => planPollsTable.id, { onDelete: "cascade" }),
    kind: pollOptionKindEnum("kind").notNull(),
    entityId: text("entity_id"),
    value: text("value"),
    addedByUserId: text("added_by_user_id").notNull(),
    isSuggestion: boolean("is_suggestion").default(false).notNull(),
    createdAt: createdAtColumn(),
  },
  (table) => [
    index("plan_poll_options_poll_idx").on(table.pollId, table.createdAt),
    index("plan_poll_options_entity_idx").on(table.kind, table.entityId),
  ],
);

export const planPollVotesTable = pgTable(
  "plan_poll_votes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    pollId: uuid("poll_id")
      .notNull()
      .references(() => planPollsTable.id, { onDelete: "cascade" }),
    optionId: uuid("option_id")
      .notNull()
      .references(() => planPollOptionsTable.id, { onDelete: "cascade" }),
    voterUserId: text("voter_user_id").notNull(),
    createdAt: createdAtColumn(),
  },
  (table) => [
    uniqueIndex("plan_poll_votes_poll_option_user_idx").on(
      table.pollId,
      table.optionId,
      table.voterUserId,
    ),
    index("plan_poll_votes_poll_idx").on(table.pollId),
    index("plan_poll_votes_voter_idx").on(table.voterUserId),
  ],
);

export const planDecisionsTable = pgTable(
  "plan_decisions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    planId: uuid("plan_id")
      .notNull()
      .references(() => plansTable.id, { onDelete: "cascade" }),
    placeEntityType: discoveryEntityTypeEnum("place_entity_type"),
    placeEntityId: text("place_entity_id"),
    dateValue: text("date_value"),
    timeValue: text("time_value"),
    lockedByUserId: text("locked_by_user_id").notNull(),
    lockedAt: createdAtColumn(),
  },
  (table) => [
    uniqueIndex("plan_decisions_plan_idx").on(table.planId),
    index("plan_decisions_place_idx").on(
      table.placeEntityType,
      table.placeEntityId,
    ),
  ],
);

export const planAttendanceTable = pgTable(
  "plan_attendance",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    planId: uuid("plan_id")
      .notNull()
      .references(() => plansTable.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    status: attendanceStatusEnum("status").default("invited").notNull(),
    ticketStatus: ticketStatusEnum("ticket_status")
      .default("not_applicable")
      .notNull(),
    updatedAt: createdAtColumn(),
  },
  (table) => [
    uniqueIndex("plan_attendance_plan_user_idx").on(table.planId, table.userId),
    index("plan_attendance_status_idx").on(table.planId, table.status),
  ],
);

export const planMediaTable = pgTable(
  "plan_media",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    planId: uuid("plan_id")
      .notNull()
      .references(() => plansTable.id, { onDelete: "cascade" }),
    uploadedByUserId: text("uploaded_by_user_id").notNull(),
    messageId: uuid("message_id").references(() => planMessagesTable.id, {
      onDelete: "set null",
    }),
    kind: mediaKindEnum("kind").notNull(),
    storageStatus: mediaStorageStatusEnum("storage_status")
      .default("metadata_only")
      .notNull(),
    storageKey: text("storage_key"),
    mediaUrl: text("media_url"),
    mimeType: text("mime_type"),
    byteSize: integer("byte_size"),
    durationSeconds: integer("duration_seconds"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: createdAtColumn(),
  },
  (table) => [
    index("plan_media_plan_created_idx").on(table.planId, table.createdAt),
    index("plan_media_status_idx").on(table.storageStatus),
  ],
);

export const planMemoriesTable = pgTable(
  "plan_memories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    planId: uuid("plan_id")
      .notNull()
      .references(() => plansTable.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    summary: text("summary"),
    visibility: memoryVisibilityEnum("visibility").default("members").notNull(),
    completedAt: timestamp("completed_at", {
      withTimezone: true,
      mode: "date",
    }).defaultNow().notNull(),
    createdAt: createdAtColumn(),
  },
  (table) => [
    uniqueIndex("plan_memories_plan_idx").on(table.planId),
    index("plan_memories_completed_idx").on(table.completedAt),
  ],
);

export const plansRelations = relations(plansTable, ({ many, one }) => ({
  members: many(planMembersTable),
  messages: many(planMessagesTable),
  sharedItems: many(planSharedItemsTable),
  polls: many(planPollsTable),
  decision: one(planDecisionsTable),
  attendance: many(planAttendanceTable),
  media: many(planMediaTable),
  memory: one(planMemoriesTable),
}));

export const planMembersRelations = relations(planMembersTable, ({ one }) => ({
  plan: one(plansTable, {
    fields: [planMembersTable.planId],
    references: [plansTable.id],
  }),
}));

export const planMessagesRelations = relations(
  planMessagesTable,
  ({ one }) => ({
    plan: one(plansTable, {
      fields: [planMessagesTable.planId],
      references: [plansTable.id],
    }),
  }),
);

export const planSharedItemsRelations = relations(
  planSharedItemsTable,
  ({ one }) => ({
    plan: one(plansTable, {
      fields: [planSharedItemsTable.planId],
      references: [plansTable.id],
    }),
  }),
);

export const planPollsRelations = relations(planPollsTable, ({ one, many }) => ({
  plan: one(plansTable, {
    fields: [planPollsTable.planId],
    references: [plansTable.id],
  }),
  options: many(planPollOptionsTable),
  votes: many(planPollVotesTable),
}));

export const planPollOptionsRelations = relations(
  planPollOptionsTable,
  ({ one, many }) => ({
    poll: one(planPollsTable, {
      fields: [planPollOptionsTable.pollId],
      references: [planPollsTable.id],
    }),
    votes: many(planPollVotesTable),
  }),
);

export const planPollVotesRelations = relations(
  planPollVotesTable,
  ({ one }) => ({
    poll: one(planPollsTable, {
      fields: [planPollVotesTable.pollId],
      references: [planPollsTable.id],
    }),
    option: one(planPollOptionsTable, {
      fields: [planPollVotesTable.optionId],
      references: [planPollOptionsTable.id],
    }),
  }),
);

export const planDecisionsRelations = relations(
  planDecisionsTable,
  ({ one }) => ({
    plan: one(plansTable, {
      fields: [planDecisionsTable.planId],
      references: [plansTable.id],
    }),
  }),
);

export const planAttendanceRelations = relations(
  planAttendanceTable,
  ({ one }) => ({
    plan: one(plansTable, {
      fields: [planAttendanceTable.planId],
      references: [plansTable.id],
    }),
  }),
);

export const planMediaRelations = relations(planMediaTable, ({ one }) => ({
  plan: one(plansTable, {
    fields: [planMediaTable.planId],
    references: [plansTable.id],
  }),
}));

export const planMemoriesRelations = relations(
  planMemoriesTable,
  ({ one }) => ({
    plan: one(plansTable, {
      fields: [planMemoriesTable.planId],
      references: [plansTable.id],
    }),
  }),
);

export const insertPlanSchema = createInsertSchema(plansTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertPlanMemberSchema = createInsertSchema(planMembersTable).omit({
  id: true,
  joinedAt: true,
});
export const insertPlanMessageSchema = createInsertSchema(planMessagesTable).omit({
  id: true,
  createdAt: true,
});
export const insertPlanSharedItemSchema = createInsertSchema(
  planSharedItemsTable,
).omit({ id: true, createdAt: true });
export const insertPlanPollSchema = createInsertSchema(planPollsTable).omit({
  id: true,
  createdAt: true,
  closedAt: true,
});
export const insertPlanPollOptionSchema = createInsertSchema(
  planPollOptionsTable,
).omit({ id: true, createdAt: true });
export const insertPlanPollVoteSchema = createInsertSchema(
  planPollVotesTable,
).omit({ id: true, createdAt: true });
export const insertPlanDecisionSchema = createInsertSchema(
  planDecisionsTable,
).omit({ id: true, lockedAt: true });
export const insertPlanAttendanceSchema = createInsertSchema(
  planAttendanceTable,
).omit({ id: true, updatedAt: true });
export const insertPlanMediaSchema = createInsertSchema(planMediaTable).omit({
  id: true,
  createdAt: true,
});
export const insertPlanMemorySchema = createInsertSchema(
  planMemoriesTable,
).omit({ id: true, createdAt: true });

export type Plan = typeof plansTable.$inferSelect;
export type InsertPlan = typeof plansTable.$inferInsert;
export type PlanMember = typeof planMembersTable.$inferSelect;
export type InsertPlanMember = typeof planMembersTable.$inferInsert;
export type PlanMessage = typeof planMessagesTable.$inferSelect;
export type PlanSharedItem = typeof planSharedItemsTable.$inferSelect;
export type PlanPoll = typeof planPollsTable.$inferSelect;
export type PlanPollOption = typeof planPollOptionsTable.$inferSelect;
export type PlanPollVote = typeof planPollVotesTable.$inferSelect;
export type PlanDecision = typeof planDecisionsTable.$inferSelect;
export type PlanAttendance = typeof planAttendanceTable.$inferSelect;
export type PlanMedia = typeof planMediaTable.$inferSelect;
export type PlanMemory = typeof planMemoriesTable.$inferSelect;