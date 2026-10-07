import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, Flame, Ticket } from "lucide-react";
import {
  buildCreation,
  categories,
  creationPlanUrl,
  readCreations,
  saveCreation,
  type Creation,
  type CreationFields,
  type CreationKind,
} from "./store";
import "../plans/plans.css";
import "./creations.css";

function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="wein-shell grain">
      <main className="plan-page page-enter">
        <Link className="back-link" href="/discover?tab=Create">
          <ArrowLeft size={17} />
          Create
        </Link>
        {children}
      </main>
      <nav className="plan-navigation" aria-label="Main navigation">
        <Link href="/discover">Discover</Link>
        <Link href="/creations">Your hangouts & events</Link>
        <Link href="/plans">Plans</Link>
      </nav>
    </div>
  );
}
function useSaved() {
  const [state, setState] = useState<{ items: Creation[]; error: string }>(() =>
    load(),
  );
  function load() {
    try {
      return { items: readCreations(), error: "" };
    } catch {
      return {
        items: [],
        error:
          "We couldn't read your saved hangouts and events. Your stored data has been kept. Check browser storage access and try again.",
      };
    }
  }
  return { ...state, retry: () => setState(load()) };
}
function StorageError({
  retry,
  message,
}: {
  retry: () => void;
  message: string;
}) {
  return (
    <div className="plan-state">
      <p role="alert">{message}</p>
      <button className="outline-button" onClick={retry}>
        Try again
      </button>
    </div>
  );
}
const dateLabel = (date: string) =>
  new Date(date).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

export function CreationsList() {
  const { items, error, retry } = useSaved();
  return (
    <Layout>
      <header className="plan-heading">
        <div>
          <p className="section-eyebrow">YOUR IDEAS</p>
          <h1>Your hangouts & events</h1>
        </div>
      </header>
      <p className="plan-profile-note">
        Saved only in this browser. These aren't published or visible to other
        people.
      </p>
      <div className="plan-form-actions">
        <Link className="plan-primary" href="/create/activity">
          Create hangout
        </Link>
        <Link className="plan-primary" href="/create/event">
          Create event
        </Link>
      </div>
      {error ? (
        <StorageError message={error} retry={retry} />
      ) : items.length ? (
        <section
          className="plan-list creation-list"
          aria-label="Saved hangouts and events"
        >
          {items.map((item) => (
            <Link
              className="plan-card"
              key={item.id}
              href={`/creations/${item.id}`}
            >
              <span className="plan-card-icon">
                {item.kind === "activity" ? <Flame /> : <Ticket />}
              </span>
              <div className="plan-card-copy">
                <h2>{item.title}</h2>
                <p>{item.place}</p>
                <div className="plan-card-meta">
                  <span>{item.kind === "activity" ? "Hangout" : "Event"}</span>
                  <span>{dateLabel(item.start)}</span>
                </div>
              </div>
            </Link>
          ))}
        </section>
      ) : (
        <div className="plan-state">
          <h2>No hangouts or events yet</h2>
          <p>Create one and its details will be saved here.</p>
        </div>
      )}
    </Layout>
  );
}

export function CreationDetail({ id }: { id: string }) {
  const { items, error, retry } = useSaved();
  const item = items.find((item) => item.id === id);
  return (
    <Layout>
      {error ? (
        <StorageError message={error} retry={retry} />
      ) : !item ? (
        <div className="plan-state">
          <h1>Couldn't find this hangout or event</h1>
          <Link href="/creations">Your hangouts & events</Link>
        </div>
      ) : (
        <>
          <header className="plan-heading">
            <div>
              <p className="section-eyebrow">
                {item.kind === "activity" ? "Hangout" : "Event"}
              </p>
              <h1>{item.title}</h1>
            </div>
          </header>
          <p className="plan-profile-note" role="status">
            Saved in this browser only · Not published
          </p>
          <p className="plan-description">
            {item.description || "No description added."}
          </p>
          <dl className="creation-details">
            <dt>Place</dt>
            <dd>{item.place}</dd>
            <dt>Starts</dt>
            <dd>{dateLabel(item.start)}</dd>
            {item.end && (
              <>
                <dt>Ends</dt>
                <dd>{dateLabel(item.end)}</dd>
              </>
            )}
            <dt>Category</dt>
            <dd>{item.category}</dd>
            <dt>Cost per person</dt>
            <dd>{item.cost === 0 ? "Free" : `CAD ${item.cost}`}</dd>
            {item.capacity && (
              <>
                <dt>Capacity</dt>
                <dd>{item.capacity} people</dd>
              </>
            )}
            {item.organizer && (
              <>
                <dt>Organizer</dt>
                <dd>{item.organizer}</dd>
              </>
            )}
          </dl>
          {item.ticketUrl && (
            <a
              className="outline-button"
              href={item.ticketUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Ticket information
            </a>
          )}
          <div className="plan-form-actions">
            <Link
              className="outline-button"
              href={`/creations/${item.id}/edit`}
            >
              Edit details
            </Link>
            <Link className="plan-primary" href={creationPlanUrl(item)}>
              Make a Plan
            </Link>
          </div>
          <Link className="back-link" href="/creations">
            Your hangouts & events
          </Link>
        </>
      )}
    </Layout>
  );
}

function localDate(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}
export function CreationEditor({
  kind,
  id,
}: {
  kind?: CreationKind;
  id?: string;
}) {
  const saved = useSaved();
  const existing = saved.items.find((item) => item.id === id);
  if (saved.error)
    return (
      <Layout>
        <StorageError message={saved.error} retry={saved.retry} />
      </Layout>
    );
  if (id && !existing)
    return (
      <Layout>
        <div className="plan-state">
          <h1>Couldn't find this hangout or event</h1>
          <Link href="/creations">Your hangouts & events</Link>
        </div>
      </Layout>
    );
  return (
    <CreationForm
      key={existing?.id ?? kind}
      kind={existing?.kind ?? kind ?? "activity"}
      existing={existing}
    />
  );
}
function CreationForm({
  kind,
  existing,
}: {
  kind: CreationKind;
  existing?: Creation;
}) {
  const [, navigate] = useLocation();
  const [fields, setFields] = useState<CreationFields>({
    kind,
    title: existing?.title ?? "",
    description: existing?.description ?? "",
    place: existing?.place ?? "",
    category: existing?.category ?? "Social",
    start: localDate(existing?.start),
    end: localDate(existing?.end),
    cost: String(existing?.cost ?? 0),
    capacity: existing?.capacity ? String(existing.capacity) : "",
    organizer: existing?.organizer ?? "",
    ticketUrl: existing?.ticketUrl ?? "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const submitting = useRef(false);
  const update = (key: keyof CreationFields, value: string) =>
    setFields((current) => ({ ...current, [key]: value }));
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (submitting.current) return;
    setError("");
    let item: Creation;
    try {
      item = buildCreation(fields, existing);
    } catch (error) {
      setError((error as Error).message);
      return;
    }
    submitting.current = true;
    setSaving(true);
    // Allow the saving state to render before synchronous browser storage work.
    await new Promise((resolve) => setTimeout(resolve, 0));
    try {
      saveCreation(item);
      navigate(`/creations/${item.id}`);
    } catch {
      setError(
        "Couldn't save. Browser storage may be full or unavailable. Your form is still here; check storage and try again.",
      );
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  }
  const title = kind === "activity" ? "hangout" : "event";
  return (
    <Layout>
      <header className="plan-heading">
        <div>
          <p className="section-eyebrow">MAKE IT HAPPEN</p>
          <h1>
            {existing ? "Edit" : "Create"}{" "}
            {title === "event" ? "an event" : "a hangout"}
          </h1>
          <p>
            {kind === "activity"
              ? "Set up a quick, casual meetup with a place and time."
              : "Add the details of your organized event."}
          </p>
        </div>
      </header>
      <p className="plan-profile-note">
        Saved only in this browser. These details won't be published or shared.
      </p>
      <form
        className="plan-form creation-form"
        onSubmit={submit}
        noValidate
        aria-busy={saving}
      >
        <fieldset disabled={saving}>
          <label htmlFor="creation-title">Title *</label>
          <input
            id="creation-title"
            required
            autoFocus
            maxLength={120}
            value={fields.title}
            onChange={(e) => update("title", e.target.value)}
          />
          <label htmlFor="creation-description">Description (optional)</label>
          <textarea
            id="creation-description"
            maxLength={2000}
            rows={4}
            value={fields.description}
            onChange={(e) => update("description", e.target.value)}
          />
          <label htmlFor="creation-place">Place *</label>
          <input
            id="creation-place"
            required
            maxLength={200}
            placeholder="Venue or meeting point, city"
            value={fields.place}
            onChange={(e) => update("place", e.target.value)}
          />
          <label htmlFor="creation-category">Category</label>
          <select
            id="creation-category"
            value={fields.category}
            onChange={(e) => update("category", e.target.value)}
          >
            {categories.map((category) => (
              <option key={category}>{category}</option>
            ))}
          </select>
          <label htmlFor="creation-start">Start date and time *</label>
          <input
            id="creation-start"
            type="datetime-local"
            required
            value={fields.start}
            onChange={(e) => update("start", e.target.value)}
          />
          <p className="plan-field-hint">Times use your device's time zone.</p>
          <label htmlFor="creation-end">End date and time (optional)</label>
          <input
            id="creation-end"
            type="datetime-local"
            value={fields.end}
            onChange={(e) => update("end", e.target.value)}
          />
          <label htmlFor="creation-cost">Cost per person (CAD) *</label>
          <input
            id="creation-cost"
            type="number"
            min="0"
            max="100000"
            step="0.01"
            value={fields.cost}
            onChange={(e) => update("cost", e.target.value)}
          />
          <p className="plan-field-hint">Enter 0 for free.</p>
          <label htmlFor="creation-capacity">Capacity (optional)</label>
          <input
            id="creation-capacity"
            type="number"
            min="1"
            max="100000"
            step="1"
            value={fields.capacity}
            onChange={(e) => update("capacity", e.target.value)}
          />
          {kind === "event" && (
            <>
              <label htmlFor="creation-organizer">Organizer *</label>
              <input
                id="creation-organizer"
                required
                maxLength={120}
                value={fields.organizer}
                onChange={(e) => update("organizer", e.target.value)}
              />
              <label htmlFor="creation-tickets">Ticket link (optional)</label>
              <input
                id="creation-tickets"
                type="url"
                maxLength={2000}
                placeholder="https://…"
                value={fields.ticketUrl}
                onChange={(e) => update("ticketUrl", e.target.value)}
              />
            </>
          )}
        </fieldset>
        {error && (
          <p className="plan-form-error" role="alert">
            {error}
          </p>
        )}
        <div className="plan-form-actions">
          <button
            className="outline-button"
            type="button"
            disabled={saving}
            onClick={() =>
              navigate(
                existing ? `/creations/${existing.id}` : "/discover?tab=Create",
              )
            }
          >
            Cancel
          </button>
          <button className="plan-primary" disabled={saving}>
            {saving ? "Saving…" : existing ? "Save changes" : `Save ${title}`}
          </button>
        </div>
      </form>
    </Layout>
  );
}
