import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  Plan,
  PlanStatus,
  PlanWorkspace,
} from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import {
  ArrowLeft,
  CalendarDays,
  ChevronRight,
  Compass,
  LoaderCircle,
  LockKeyhole,
  Plus,
  Search,
  UsersRound,
} from "lucide-react";
import {
  buildPlanInput,
  getPlansActor,
  planErrorMessage,
  planKeys,
  plansApi,
} from "./api";
import "./plans.css";

const statuses: Array<PlanStatus | "all"> = [
  "all",
  "planning",
  "confirmed",
  "completed",
  "archived",
];
const label = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);
function dateLabel(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date not set"
    : date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
}

function Layout({ children }: { children: ReactNode }) {
  const [path] = useLocation();
  return (
    <div className="wein-shell grain">
      <main className="plan-page page-enter">{children}</main>
      <nav className="plan-navigation" aria-label="Main navigation">
        <Link href="/discover">
          <Compass size={18} />
          Discover
        </Link>
        <Link href="/plans/new" aria-current={path === '/plans/new' ? 'page' : undefined}>
          <Plus size={18} />
          Create plan
        </Link>
        <Link href="/plans" aria-current={path !== '/plans/new' ? 'page' : undefined}>
          <UsersRound size={18} />
          Plans
        </Link>
      </nav>
    </div>
  );
}

function Loading({ text }: { text: string }) {
  return (
    <div className="plan-state" role="status">
      <LoaderCircle className="plan-spinner" size={24} />
      <p>{text}</p>
    </div>
  );
}

function ErrorState({ error, retry }: { error: unknown; retry: () => void }) {
  return (
    <div className="plan-state">
      <p role="alert">{planErrorMessage(error)}</p>
      <button className="outline-button" type="button" onClick={retry}>
        Try again
      </button>
    </div>
  );
}

function PlanCard({ plan }: { plan: Plan }) {
  return (
    <Link href={`/plans/${encodeURIComponent(plan.id)}`} className="plan-card">
      <span className="plan-card-icon">
        <UsersRound size={22} />
      </span>
      <div className="plan-card-copy">
        <h2>{plan.name}</h2>
        <p>{plan.description || "An outing waiting to happen."}</p>
        <div className="plan-card-meta">
          <span className={`plan-status status-${plan.status}`}>
            {label(plan.status)}
          </span>
          <span>{label(plan.privacy)}</span>
          <span>Updated {dateLabel(plan.updatedAt)}</span>
        </div>
      </div>
      <ChevronRight size={18} aria-hidden="true" />
    </Link>
  );
}

export function PlansList() {
  const [actor] = useState(getPlansActor);
  const [status, setStatus] = useState<PlanStatus | "all">("all");
  const [search, setSearch] = useState("");
  const filter = status === "all" ? undefined : status;
  const query = useQuery({
    queryKey: planKeys.list(actor, filter),
    queryFn: ({ signal }) => plansApi.list(actor, filter, signal),
    retry: false,
  });
  const plans =
    query.data?.plans.filter((plan) =>
      `${plan.name} ${plan.description ?? ""}`
        .toLowerCase()
        .includes(search.trim().toLowerCase()),
    ) ?? [];
  return (
    <Layout>
      <header className="plan-heading">
        <div>
          <p className="section-eyebrow">MAKE IT HAPPEN</p>
          <h1>Your plans</h1>
          <p>Good ideas deserve a plan.</p>
        </div>
        <Link className="plan-primary" href="/plans/new">
          <Plus size={17} />
          Create plan
        </Link>
      </header>
      <p className="plan-profile-note">
        Your plans are linked to this browser for now.
      </p>
      <label className="plan-search">
        <Search size={18} />
        <span className="sr-only">Search plans</span>
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search your plans"
        />
      </label>
      <div className="plan-filters" role="group" aria-label="Filter by status">
        {statuses.map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={status === value}
            onClick={() => setStatus(value)}
          >
            {label(value)}
          </button>
        ))}
      </div>
      {query.isPending ? (
        <Loading text="Loading your plans…" />
      ) : query.isError ? (
        <ErrorState error={query.error} retry={() => void query.refetch()} />
      ) : plans.length ? (
        <section className="plan-list" aria-label="Your plans">
          {plans.map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </section>
      ) : (
        <div className="plan-state">
          <UsersRound size={32} />
          <h2>
            {search || status !== "all"
              ? "No matching plans"
              : "Your next outing starts here"}
          </h2>
          <p>
            {search || status !== "all"
              ? "Try another search or status."
              : "Create your first plan and give it a name."}
          </p>
          {!search && status === "all" && (
            <Link className="plan-primary" href="/plans/new">
              Create your first plan
            </Link>
          )}
        </div>
      )}
    </Layout>
  );
}

export function CreatePlanPage() {
  const [actor] = useState(getPlansActor);
  const [, navigate] = useLocation();
  const cache = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [privacy, setPrivacy] = useState<"private" | "public">("private");
  const [validation, setValidation] = useState("");
  const submitting = useRef(false);
  const mutation = useMutation({
    mutationFn: (data: ReturnType<typeof buildPlanInput>) =>
      plansApi.create(actor, data),
    onSuccess: async (plan) => {
      await cache.invalidateQueries({ queryKey: planKeys.lists(actor) });
      navigate(`/plans/${encodeURIComponent(plan.id)}`);
    },
    onSettled: () => {
      submitting.current = false;
    },
  });
  function submit(event: FormEvent) {
    event.preventDefault();
    if (submitting.current) return;
    setValidation("");
    mutation.reset();
    try {
      const data = buildPlanInput(name, description, privacy);
      submitting.current = true;
      mutation.mutate(data);
    } catch (error) {
      setValidation((error as Error).message);
    }
  }
  return (
    <Layout>
      <Link className="back-link" href="/plans">
        <ArrowLeft size={17} />
        Your plans
      </Link>
      <header className="plan-heading">
        <div>
          <p className="section-eyebrow">BRING AN IDEA TO LIFE</p>
          <h1>Create a plan</h1>
          <p>Start with a name. The details can come together later.</p>
        </div>
      </header>
      <form
        className="plan-form"
        onSubmit={submit}
        noValidate
        aria-busy={mutation.isPending}
      >
        <fieldset disabled={mutation.isPending}>
          <label htmlFor="plan-name">
            Plan name <span aria-hidden="true">*</span>
          </label>
          <input
            id="plan-name"
            autoFocus
            required
            maxLength={120}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Friday night with friends"
            aria-describedby="plan-name-hint"
          />
          <p id="plan-name-hint" className="plan-field-hint">
            Required · up to 120 characters
          </p>
          <label htmlFor="plan-description">
            Description <span className="plan-optional">(optional)</span>
          </label>
          <textarea
            id="plan-description"
            rows={4}
            maxLength={2000}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="What’s the idea?"
          />
          <fieldset className="plan-privacy">
            <legend>Visibility</legend>
            <label>
              <input
                type="radio"
                name="privacy"
                value="private"
                checked={privacy === "private"}
                onChange={() => setPrivacy("private")}
              />
              <span>
                <strong>Private</strong>
                <small>For your group.</small>
              </span>
            </label>
            <label>
              <input
                type="radio"
                name="privacy"
                value="public"
                checked={privacy === "public"}
                onChange={() => setPrivacy("public")}
              />
              <span>
                <strong>Public</strong>
                <small>
                  Mark this plan as public. Access still requires membership.
                </small>
              </span>
            </label>
          </fieldset>
        </fieldset>
        {(validation || mutation.isError) && (
          <p className="plan-form-error" role="alert">
            {validation || planErrorMessage(mutation.error)}
          </p>
        )}
        <div className="plan-form-actions">
          <Link
            className="outline-button"
            href="/plans"
            onClick={(event) => {
              if (mutation.isPending) event.preventDefault();
            }}
            aria-disabled={mutation.isPending}
          >
            Cancel
          </Link>
          <button
            className="plan-primary"
            type="submit"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? (
              <>
                <LoaderCircle className="plan-spinner" size={17} />
                Creating…
              </>
            ) : (
              <>
                <Plus size={17} />
                Create plan
              </>
            )}
          </button>
        </div>
      </form>
    </Layout>
  );
}

function Workspace({
  workspace,
  actor,
}: {
  workspace: PlanWorkspace;
  actor: string;
}) {
  const {
    plan,
    members,
    attendance,
    decision,
    messages,
    polls,
    sharedItems,
    memory,
  } = workspace;
  return (
    <>
      <header className="plan-heading">
        <div>
          <p className="section-eyebrow">YOUR NEXT OUTING</p>
          <h1>{plan.name}</h1>
          <div className="plan-detail-meta">
            <span className={`plan-status status-${plan.status}`}>
              {label(plan.status)}
            </span>
            <span>
              <LockKeyhole size={14} />
              {label(plan.privacy)}
            </span>
            <span>
              <CalendarDays size={14} />
              Created {dateLabel(plan.createdAt)}
            </span>
          </div>
        </div>
      </header>
      {plan.description && (
        <p className="plan-description">{plan.description}</p>
      )}
      <section className="plan-section">
        <h2>The plan</h2>
        {decision ? (
          <dl className="plan-facts">
            <div>
              <dt>Date</dt>
              <dd>{decision.dateValue || "To be decided"}</dd>
            </div>
            <div>
              <dt>Time</dt>
              <dd>{decision.timeValue || "To be decided"}</dd>
            </div>
            <div>
              <dt>Place</dt>
              <dd>
                {decision.placeEntityId
                  ? "A place has been chosen"
                  : "To be decided"}
              </dd>
            </div>
          </dl>
        ) : (
          <p className="plan-muted">
            No date, time, or place has been confirmed yet.
          </p>
        )}
      </section>
      <section className="plan-section">
        <h2>
          Members <span className="plan-count">{members.length}</span>
        </h2>
        <ul className="plan-members">
          {members.map((member, index) => (
            <li key={member.id}>
              <span className="plan-avatar">
                <UsersRound size={18} />
              </span>
              <div>
                <strong>
                  {member.userId === actor
                    ? "You"
                    : member.displayName || `Member ${index + 1}`}
                </strong>
                <small>
                  {label(member.role)}
                  {attendance.find((entry) => entry.userId === member.userId)
                    ?.status === "going"
                    ? " · Going"
                    : ""}
                </small>
              </div>
            </li>
          ))}
        </ul>
      </section>
      <section className="plan-section">
        <h2>Shared ideas</h2>
        {sharedItems.length ? (
          <ul className="plan-items">
            {sharedItems.map((item) => (
              <li key={item.id}>
                {item.card?.title || `Shared ${item.entityType}`}
              </li>
            ))}
          </ul>
        ) : (
          <p className="plan-muted">
            No places or activities have been shared yet.
          </p>
        )}
      </section>
      <section className="plan-section">
        <h2>Polls</h2>
        {polls.length ? (
          polls.map((poll) => (
            <article className="plan-poll" key={poll.id}>
              <h3>{poll.question}</h3>
              <p className="plan-muted">
                {label(poll.status)} · {poll.totalVotes} votes
              </p>
              <ul>
                {poll.options.map((option) => (
                  <li key={option.id}>
                    <span>
                      {option.card?.title ||
                        option.value ||
                        `Suggested ${option.kind}`}
                    </span>
                    <span>{option.voteCount} votes</span>
                  </li>
                ))}
              </ul>
            </article>
          ))
        ) : (
          <p className="plan-muted">No polls yet.</p>
        )}
      </section>
      <section className="plan-section">
        <h2>Conversation</h2>
        {messages.length ? (
          <ol className="plan-messages">
            {messages.map((message) => (
              <li key={message.id}>
                <strong>
                  {message.authorUserId === actor
                    ? "You"
                    : members.find(
                        (member) => member.userId === message.authorUserId,
                      )?.displayName || "Member"}
                </strong>
                <p>
                  {message.body || `Shared ${message.type.replace("_", " ")}`}
                </p>
                <small>{dateLabel(message.createdAt)}</small>
              </li>
            ))}
          </ol>
        ) : (
          <p className="plan-muted">No messages yet.</p>
        )}
      </section>
      {memory && (
        <section className="plan-section">
          <h2>{memory.title}</h2>
          <p>{memory.summary || "An outing to remember."}</p>
        </section>
      )}
    </>
  );
}

export function PlanDetail({ planId }: { planId: string }) {
  const [actor] = useState(getPlansActor);
  const validId =
    /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(
      planId,
    );
  const query = useQuery({
    queryKey: planKeys.detail(actor, planId),
    queryFn: ({ signal }) => plansApi.detail(actor, planId, signal),
    enabled: validId,
    retry: false,
  });
  return (
    <Layout>
      <Link className="back-link" href="/plans">
        <ArrowLeft size={17} />
        Your plans
      </Link>
      {!validId ? (
        <p className="plan-state" role="alert">
          This plan could not be found.
        </p>
      ) : query.isPending ? (
        <Loading text="Loading your plan…" />
      ) : query.isError ? (
        <ErrorState error={query.error} retry={() => void query.refetch()} />
      ) : (
        <Workspace workspace={query.data} actor={actor} />
      )}
    </Layout>
  );
}
