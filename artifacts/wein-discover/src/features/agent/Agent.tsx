import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { LoaderCircle, Send, Sparkles } from "lucide-react";
import { useLocation } from "wouter";
import type {
  DiscoveryEvent,
  DiscoveryLocation,
  DiscoverySearchParams,
} from "../discovery/types";
import { liveMapPlanPrefill } from "../live/map";
import "./agent.css";

type Message = { role: "user" | "assistant"; content: string };
type Reply = {
  reply: string;
  events: DiscoveryEvent[];
  search: DiscoverySearchParams;
  searched: boolean;
  action?: { type: "details" | "plan"; event: DiscoveryEvent };
};
export function eventPlanUrl(event: DiscoveryEvent) {
  return `/plans/new?${new URLSearchParams(liveMapPlanPrefill(event))}`;
}
export function WeinAgent({
  location,
  renderEvent,
}: {
  location: DiscoveryLocation;
  renderEvent: (event: DiscoveryEvent) => ReactNode;
}) {
  const [, navigate] = useLocation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState<Reply>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(false);
  const requestVersion = useRef(0);
  const locationKey = JSON.stringify(location);
  const previousLocation = useRef(locationKey);
  const controller = useRef<AbortController | undefined>(undefined);
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    if (previousLocation.current !== locationKey) {
      requestVersion.current++;
      controller.current?.abort();
      pending.current = false;
      setLoading(false);
      setError("");
      setMessages([]);
      setResult(undefined);
      previousLocation.current = locationKey;
    }
  }, [locationKey]);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pending.current || !prompt.trim()) return;
    const next: Message[] = [
      ...messages,
      { role: "user", content: prompt.trim() },
    ];
    pending.current = true;
    setLoading(true);
    setError("");
    const version = ++requestVersion.current;
    const requestController = new AbortController();
    controller.current = requestController;
    try {
      const response = await fetch("/api/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: requestController.signal,
        body: JSON.stringify({
          messages: next.slice(-23),
          recommendations: result?.events.map((event) => ({
            providerId: event.providerId,
            name: event.name,
          })),
          search: {
            ...(result?.search || location),
            timezone:
              location.timezone ||
              Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
        }),
      });
      const payload = await response.json();
      if (version !== requestVersion.current || requestController.signal.aborted) return;
      if (!response.ok)
        throw new Error(
          payload.message || "WEIN could not respond. Try again.",
        );
      setMessages([...next, { role: "assistant", content: payload.reply }]);
      setResult({
        ...payload,
        events: payload.searched ? payload.events : result?.events || [],
      });
      setPrompt("");
    } catch (failure) {
      if (version === requestVersion.current && !requestController.signal.aborted)
        setError(
          failure instanceof Error
            ? failure.message
            : "WEIN could not respond. Try again.",
        );
    } finally {
      if (version === requestVersion.current) {
        pending.current = false;
        setLoading(false);
      }
    }
  }
  return (
    <section className="discovery-assistant" aria-label="WEIN AI agent">
      <div className="assistant-heading">
        <div>
          <p className="section-eyebrow">WEIN AI</p>
          <h2>Find your next move</h2>
        </div>
        <Sparkles size={19} />
      </div>
      <p className="assistant-hint">
        Tell me your budget, date, distance or category. Refine your finds as we
        chat. Your messages and location are sent to OpenAI to answer.
      </p>
      <div className="agent-messages" role="log" aria-live="polite">
        {messages.map((message, index) => (
          <p key={index} className={`agent-message agent-${message.role}`}>
            <strong>{message.role === "user" ? "You" : "WEIN"}</strong>
            {message.content}
          </p>
        ))}
      </div>
      <form className="assistant-form" onSubmit={submit}>
        <input
          aria-label="Message WEIN"
          placeholder="Live music tonight under $25 within 10 km…"
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          maxLength={4000}
          disabled={loading}
        />
        <button aria-label="Send message" disabled={loading || !prompt.trim()}>
          {loading ? (
            <LoaderCircle size={17} className="spin" />
          ) : (
            <Send size={17} />
          )}
        </button>
      </form>
      {loading && (
        <p className="assistant-status" role="status">
          WEIN is finding your next move…
        </p>
      )}
      {error && (
        <p className="assistant-error" role="alert">
          {error} Your message is kept so you can retry.
        </p>
      )}
      {!loading && result?.searched && result.events.length === 0 && (
        <p className="assistant-empty">
          No matching events. Try a wider distance, another date or a higher
          budget.
        </p>
      )}
      {!loading && result?.action && (
        <button
          className="outline-button"
          onClick={() => {
            const action = result.action!;
            navigate(
              action.type === "plan"
                ? eventPlanUrl(action.event)
                : `/event/${encodeURIComponent(`Ticketmaster:${action.event.providerId}`)}`,
            );
          }}
        >
          {result.action.type === "plan"
            ? "Review prefilled Plan"
            : "Open event details"}
          : {result.action.event.name}
        </button>
      )}
      {!loading &&
        result?.events.map((event) => (
          <div className="agent-recommendation" key={event.id}>
            {renderEvent(event)}
            <button
              className="outline-button"
              onClick={() => navigate(eventPlanUrl(event))}
            >
              Add to Plan
            </button>
          </div>
        ))}
    </section>
  );
}
