import {
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ErrorBoundary } from "@/components/error-boundary";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import {
  ArrowLeft,
  Apple,
  Bell,
  BookOpen,
  Bookmark,
  CalendarDays,
  Camera,
  Check,
  ChevronRight,
  CircleAlert,
  Clock3,
  Compass,
  Dumbbell,
  ExternalLink,
  Flame,
  Gift,
  Heart,
  ImagePlus,
  LocateFixed,
  LoaderCircle,
  Mail,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  Plus,
  Search,
  Send,
  Share2,
  Smartphone,
  Sparkles,
  Ticket,
  UserPlus,
  UserRound,
  UsersRound,
  Utensils,
  Video,
  Waves,
  X,
} from "lucide-react";
import { Route, Router as WouterRouter, Switch, useLocation } from "wouter";

import type {
  DiscoveryEvent,
  DiscoveryLocation,
  DiscoverySearchResponse,
} from "@/features/discovery/types";

type Category =
  | "All"
  | "Trending"
  | "Tonight"
  | "Music"
  | "Food"
  | "Sports"
  | "Social"
  | "Free"
  | "Learn";

type ItemCategory =
  | "Food & Drink"
  | "Music"
  | "Outdoors"
  | "Art"
  | "Nightlife"
  | "Learn";

type Tab = "Discover" | "Live" | "Create" | "Plans" | "You";

type LocationStatus = "idle" | "locating" | "ready" | "denied" | "error";

type DiscoverItem = {
  id: string;
  title: string;
  category: ItemCategory;
  time: string;
  distance: string;
  price: string;
  image: string;
  rating?: string;
  status?: "OPEN NOW" | "TRENDING";
  social?: string;
};

type AuthProvider = "Phone" | "Email" | "Google" | "Apple";

type LiveVibe = "Poppin'" | "Good" | "Mid" | "Dead";

type LiveStory = {
  id: string;
  title: string;
  image: string;
  count: number;
  vibe: LiveVibe;
};

type LivePost = {
  id: string;
  user: string;
  initials: string;
  place: string;
  city: string;
  image: string;
  minutesAgo: number;
  vibe: LiveVibe;
  caption: string;
  likes: number;
  comments: number;
};

const queryClient = new QueryClient();

const LOCATION_STORAGE_KEY = "wein-location";

const categories: {
  name: Category;
  icon: typeof Compass;
}[] = [
  { name: "All", icon: Compass },
  { name: "Trending", icon: Flame },
  { name: "Tonight", icon: Clock3 },
  { name: "Music", icon: Waves },
  { name: "Food", icon: Utensils },
  { name: "Sports", icon: Dumbbell },
  { name: "Social", icon: UsersRound },
  { name: "Free", icon: Gift },
  { name: "Learn", icon: BookOpen },
];

const items: DiscoverItem[] = [
  {
    id: "night-market",
    title: "Night Market After Dark",
    category: "Nightlife",
    time: "8:00 PM",
    distance: "4.2 km",
    price: "$15",
    image: "/images/night-market.jpg",
    rating: "4.6",
    status: "TRENDING",
    social: "3 friends saved this",
  },
  {
    id: "heritage-coffee",
    title: "Heritage Coffee Crawl",
    category: "Food & Drink",
    time: "7:30 PM",
    distance: "2.1 km",
    price: "Free",
    image: "/images/coffee.jpg",
    rating: "4.8",
    social: "12 people are going",
  },
  {
    id: "pixel-night",
    title: "Pixel Night at Glitch",
    category: "Nightlife",
    time: "9:00 PM",
    distance: "5.8 km",
    price: "$12",
    image: "/images/arcade.jpg",
    status: "OPEN NOW",
    social: "8 people are going",
  },
  {
    id: "river-sunset",
    title: "Nicomekl River Sunset Walk",
    category: "Outdoors",
    time: "6:15 PM",
    distance: "1.8 km",
    price: "Free",
    image: "/images/park.jpg",
    social: "5 friends saved this",
  },
  {
    id: "sunset-volleyball",
    title: "Sunset Volleyball",
    category: "Outdoors",
    time: "6:45 PM",
    distance: "3.6 km",
    price: "Free",
    image: "/images/park.jpg",
    social: "6 friends are going",
  },
  {
    id: "coffee-meet-people",
    title: "Coffee & Meet People",
    category: "Food & Drink",
    time: "7:00 PM",
    distance: "2.7 km",
    price: "$5",
    image: "/images/coffee.jpg",
    social: "A warm table for new faces",
  },
  {
    id: "python-night",
    title: "Beginner Python Night",
    category: "Learn",
    time: "7:30 PM",
    distance: "4.9 km",
    price: "Free",
    image: "/images/arcade.jpg",
    social: "Bring your curiosity",
  },
  {
    id: "food-crawl",
    title: "Downtown Food Crawl",
    category: "Food & Drink",
    time: "8:30 PM",
    distance: "6.2 km",
    price: "$20",
    image: "/images/coffee.jpg",
    status: "TRENDING",
    social: "9 people are going",
  },
  {
    id: "late-night-bowling",
    title: "Late Night Bowling",
    category: "Nightlife",
    time: "10:00 PM",
    distance: "7.1 km",
    price: "$18",
    image: "/images/arcade.jpg",
    status: "OPEN NOW",
    social: "Lane 8 is calling",
  },
];

const friends = [
  {
    initials: "AR",
    name: "Amara",
    title: "Heritage Coffee Crawl",
    image: "/images/coffee.jpg",
  },
  {
    initials: "JM",
    name: "Jae + 2",
    title: "Pixel Night at Glitch",
    image: "/images/arcade.jpg",
  },
  {
    initials: "SK",
    name: "Suki",
    title: "River Sunset Walk",
    image: "/images/park.jpg",
  },
];

const authOptions: {
  provider: AuthProvider;
  icon: typeof Smartphone;
}[] = [
  {
    provider: "Phone",
    icon: Smartphone,
  },
  {
    provider: "Email",
    icon: Mail,
  },
  {
    provider: "Google",
    icon: Compass,
  },
  {
    provider: "Apple",
    icon: Apple,
  },
];

const liveStories: LiveStory[] = [
  {
    id: "night-market",
    title: "Night Market",
    image: "/images/night-market.jpg",
    count: 18,
    vibe: "Poppin'",
  },
  {
    id: "downtown",
    title: "Downtown",
    image: "/images/arcade.jpg",
    count: 12,
    vibe: "Good",
  },
  {
    id: "coffee",
    title: "Coffee",
    image: "/images/coffee.jpg",
    count: 7,
    vibe: "Good",
  },
  {
    id: "outdoors",
    title: "Outside",
    image: "/images/park.jpg",
    count: 4,
    vibe: "Mid",
  },
];

const initialLivePosts: LivePost[] = [
  {
    id: "live-1",
    user: "samira.k",
    initials: "SK",
    place: "Night Market After Dark",
    city: "Richmond, BC",
    image: "/images/night-market.jpg",
    minutesAgo: 2,
    vibe: "Poppin'",
    caption: "So many good food spots tonight.",
    likes: 84,
    comments: 12,
  },
  {
    id: "live-2",
    user: "alex.r",
    initials: "AR",
    place: "Pixel Night at Glitch",
    city: "Vancouver, BC",
    image: "/images/arcade.jpg",
    minutesAgo: 8,
    vibe: "Good",
    caption: "Actually way busier than I expected.",
    likes: 39,
    comments: 6,
  },
  {
    id: "live-3",
    user: "maya.s",
    initials: "MS",
    place: "Nicomekl River Sunset Walk",
    city: "Surrey, BC",
    image: "/images/park.jpg",
    minutesAgo: 14,
    vibe: "Good",
    caption: "The sunset is crazy right now.",
    likes: 61,
    comments: 4,
  },
];

function readStoredLocation(): DiscoveryLocation {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const stored = window.localStorage.getItem(LOCATION_STORAGE_KEY);

    return stored ? (JSON.parse(stored) as DiscoveryLocation) : {};
  } catch {
    return {};
  }
}

function useDiscoveryLocation() {
  const [location, setLocation] = useState<DiscoveryLocation>(() =>
    readStoredLocation(),
  );

  const [status, setStatus] = useState<LocationStatus>(() =>
    Object.keys(readStoredLocation()).length ? "ready" : "idle",
  );

  useEffect(() => {
    try {
      if (Object.keys(location).length) {
        window.localStorage.setItem(
          LOCATION_STORAGE_KEY,
          JSON.stringify(location),
        );
      } else {
        window.localStorage.removeItem(LOCATION_STORAGE_KEY);
      }
    } catch {
      // Location still works for the current session.
    }
  }, [location]);

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setStatus("error");
      return;
    }

    setStatus("locating");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        });

        setStatus("ready");
      },
      (error) => {
        setStatus(error.code === error.PERMISSION_DENIED ? "denied" : "error");
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000,
      },
    );
  };

  const saveCity = (city: string) => {
    const cleaned = city.trim();

    if (!cleaned) {
      return;
    }

    setLocation({
      city: cleaned,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });

    setStatus("ready");
  };

  return {
    location,
    status,
    useCurrentLocation,
    saveCity,
  };
}

function locationLabel(location: DiscoveryLocation) {
  if (location.city) {
    return [location.city, location.region].filter(Boolean).join(", ");
  }

  if (location.latitude !== undefined) {
    return "Current location";
  }

  return "Choose location";
}

function eventDateLabel(event: DiscoveryEvent) {
  if (!event.startTime) {
    return "Date to be confirmed";
  }

  try {
    return new Intl.DateTimeFormat(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: event.timezone || undefined,
    }).format(new Date(event.startTime));
  } catch {
    return event.startTime;
  }
}

function eventPriceLabel(event: DiscoveryEvent) {
  if (event.priceMin === undefined && event.priceMax === undefined) {
    return "Price varies";
  }

  const currency = event.currency || "USD";

  if (event.priceMin === event.priceMax || event.priceMax === undefined) {
    return `${currency} ${event.priceMin}`;
  }

  return `${currency} ${event.priceMin}–${event.priceMax}`;
}

function eventSaveId(event: DiscoveryEvent) {
  return `event:${event.provider}:${event.providerId}`;
}

function vibeEmoji(vibe: LiveVibe) {
  if (vibe === "Poppin'") return "🔥";
  if (vibe === "Good") return "🙂";
  if (vibe === "Mid") return "😐";
  return "💀";
}

function SaveButton({
  id,
  saved,
  onToggle,
  compact = false,
}: {
  id: string;
  saved: boolean;
  onToggle: (id: string) => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={saved ? "Remove saved place" : "Save place"}
      aria-pressed={saved}
      data-testid={`button-save-${id}`}
      onClick={() => onToggle(id)}
      className={`save-button ${
        compact ? "save-button-compact" : ""
      } ${saved ? "is-saved" : ""}`}
    >
      {saved ? (
        <Bookmark size={compact ? 16 : 18} fill="currentColor" />
      ) : (
        <Bookmark size={compact ? 16 : 18} />
      )}
    </button>
  );
}

function MetaRow({
  item,
  light = false,
}: {
  item: DiscoverItem;
  light?: boolean;
}) {
  return (
    <div className={`meta-row ${light ? "meta-row-light" : ""}`}>
      <span>
        <Clock3 size={13} /> {item.time}
      </span>

      <span>
        <MapPin size={13} /> {item.distance}
      </span>

      <span className="price-meta">{item.price}</span>

      {item.rating && (
        <span>
          <Heart size={12} fill="currentColor" /> {item.rating}
        </span>
      )}
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: NonNullable<DiscoverItem["status"]>;
}) {
  return (
    <span
      className={`status-badge ${status === "TRENDING" ? "trending" : "open"}`}
    >
      {status === "TRENDING" ? <Flame size={12} /> : <Check size={12} />}

      {status}
    </span>
  );
}

function SectionHeading({
  eyebrow,
  title,
  action,
  onAction,
}: {
  eyebrow?: string;
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="section-heading">
      <div>
        {eyebrow && <p className="section-eyebrow">{eyebrow}</p>}

        <h2>{title}</h2>
      </div>

      {action && (
        <button
          type="button"
          onClick={() => onAction?.()}
          className="text-action"
        >
          {action}
          <ChevronRight size={15} />
        </button>
      )}
    </div>
  );
}

function FeatureCard({
  saved,
  onToggle,
}: {
  saved: boolean;
  onToggle: (id: string) => void;
}) {
  const item = items[0];

  return (
    <article className="feature-card">
      <img
        src={item.image}
        alt="Warm lights and food stalls at Night Market After Dark"
      />

      <div className="feature-scrim" />

      <div className="feature-top">
        <StatusBadge status="TRENDING" />

        <SaveButton id={item.id} saved={saved} onToggle={onToggle} />
      </div>

      <div className="feature-copy">
        <p className="feature-kicker">Tonight nearby</p>

        <h1>{item.title}</h1>

        <MetaRow item={item} light />

        <p className="feature-social">
          <UsersRound size={14} />
          {item.social}
        </p>

        <button
          type="button"
          className="feature-cta"
          onClick={() =>
            document.getElementById("happening-tonight")?.scrollIntoView({
              behavior: "smooth",
            })
          }
        >
          See what's happening
          <ChevronRight size={16} />
        </button>
      </div>
    </article>
  );
}

function EventCard({
  item,
  saved,
  onToggle,
  compact = false,
}: {
  item: DiscoverItem;
  saved: boolean;
  onToggle: (id: string) => void;
  compact?: boolean;
}) {
  return (
    <article className={`event-card ${compact ? "event-card-compact" : ""}`}>
      <div className="event-image-wrap">
        <img src={item.image} alt="" className="event-image" />

        {item.status && (
          <div className="event-status">
            <StatusBadge status={item.status} />
          </div>
        )}
      </div>

      <div className="event-content">
        <div className="event-title-row">
          <div>
            <p className="card-category">{item.category}</p>
            <h3>{item.title}</h3>
          </div>

          <SaveButton id={item.id} saved={saved} onToggle={onToggle} compact />
        </div>

        <MetaRow item={item} />

        {item.social && (
          <p className="event-social">
            <UsersRound size={13} />
            {item.social}
          </p>
        )}
      </div>
    </article>
  );
}

function LocationPicker({
  open,
  location,
  status,
  onUseCurrent,
  onSaveCity,
  onClose,
}: {
  open: boolean;
  location: DiscoveryLocation;
  status: LocationStatus;
  onUseCurrent: () => void;
  onSaveCity: (city: string) => void;
  onClose: () => void;
}) {
  const [city, setCity] = useState(location.city || "");

  useEffect(() => {
    setCity(location.city || "");
  }, [location.city]);

  if (!open) {
    return null;
  }

  return (
    <section className="location-picker page-enter">
      <div className="location-picker-heading">
        <div>
          <p className="section-eyebrow">SEARCH AREA</p>
          <h2>{locationLabel(location)}</h2>
        </div>

        <button
          type="button"
          className="clear-search"
          onClick={onClose}
          aria-label="Close location picker"
        >
          <X size={17} />
        </button>
      </div>

      <button
        type="button"
        className="location-option"
        onClick={onUseCurrent}
        disabled={status === "locating"}
      >
        {status === "locating" ? (
          <LoaderCircle size={16} className="spin" />
        ) : (
          <LocateFixed size={16} />
        )}

        <span>
          {status === "locating"
            ? "Finding your location..."
            : "Use my current location"}
        </span>
      </button>

      <form
        className="manual-location-form"
        onSubmit={(event) => {
          event.preventDefault();
          onSaveCity(city);
          onClose();
        }}
      >
        <MapPin size={16} />

        <input
          value={city}
          onChange={(event) => setCity(event.target.value)}
          placeholder="Search another city"
          aria-label="Search another city"
        />

        <button
          type="submit"
          className="manual-location-submit"
          disabled={!city.trim()}
        >
          Save
        </button>
      </form>

      {(status === "denied" || status === "error") && (
        <p className="location-message">
          <CircleAlert size={14} />
          Location access was unavailable. Search by city instead.
        </p>
      )}
    </section>
  );
}

function DiscoveryEventCard({
  event,
  saved,
  onToggleSave,
}: {
  event: DiscoveryEvent;
  saved: boolean;
  onToggleSave: (id: string) => void;
}) {
  const [, setLocation] = useLocation();

  const eventId = encodeURIComponent(`${event.provider}:${event.providerId}`);

  return (
    <article className="discovery-result-card">
      <div className="discovery-result-image-wrap">
        {event.imageUrl ? (
          <img src={event.imageUrl} alt="" className="discovery-result-image" />
        ) : (
          <div className="discovery-result-image-fallback">
            <Compass size={22} />
          </div>
        )}
      </div>

      <div className="discovery-result-content">
        <div className="discovery-result-heading">
          <div>
            <p className="card-category">{event.category}</p>
            <h3>{event.name}</h3>
          </div>

          <SaveButton
            id={eventSaveId(event)}
            saved={saved}
            onToggle={onToggleSave}
            compact
          />
        </div>

        <div className="discovery-result-meta">
          <span>
            <CalendarDays size={12} />
            {eventDateLabel(event)}
          </span>

          {event.distanceKm !== undefined && (
            <span>
              <MapPin size={12} />
              {event.distanceKm.toFixed(1)} km
            </span>
          )}

          <span>{eventPriceLabel(event)}</span>
        </div>

        {event.venueName && (
          <p className="discovery-result-venue">
            {event.venueName}
            {event.city ? ` · ${event.city}` : ""}
          </p>
        )}

        <div className="discovery-result-actions">
          <button
            type="button"
            className="result-details-button"
            onClick={() => setLocation(`/event/${eventId}`)}
          >
            Details
            <ChevronRight size={14} />
          </button>

          {event.ticketUrl && (
            <a
              href={event.ticketUrl}
              target="_blank"
              rel="noreferrer"
              className="result-source-link"
            >
              Tickets
              <ExternalLink size={12} />
            </a>
          )}
        </div>

        <p className="result-source">Source: {event.provider}</p>
      </div>
    </article>
  );
}

function DiscoveryAssistant({
  location,
  saved,
  onToggleSave,
}: {
  location: DiscoveryLocation;
  saved: string[];
  onToggleSave: (id: string) => void;
}) {
  const [prompt, setPrompt] = useState("");
  const [results, setResults] = useState<DiscoveryEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState("");

  const search = async (event: FormEvent) => {
    event.preventDefault();

    const cleaned = prompt.trim();

    if (!cleaned) {
      setError("Tell WEIN what you want to do first.");
      return;
    }

    setLoading(true);
    setHasSearched(true);
    setError("");

    try {
      const response = await fetch("/api/discovery/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: cleaned,
          ...location,
          limit: 8,
        }),
      });

      const payload = (await response.json()) as
        | DiscoverySearchResponse
        | { message?: string };

      if (!response.ok) {
        throw new Error(
          "message" in payload
            ? payload.message
            : "WEIN could not search right now.",
        );
      }

      setResults((payload as DiscoverySearchResponse).events);
    } catch (searchError) {
      setResults([]);

      setError(
        searchError instanceof Error
          ? searchError.message
          : "WEIN could not search right now.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="discovery-assistant">
      <div className="assistant-heading">
        <div>
          <p className="section-eyebrow">TELL WEIN</p>
          <h2>What are you in the mood for?</h2>
        </div>

        <Sparkles size={19} />
      </div>

      <form className="assistant-form" onSubmit={search}>
        <input
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="Something fun tonight under $25..."
          aria-label="Tell WEIN what you want to do"
        />

        <button
          type="submit"
          aria-label="Search real events"
          disabled={loading}
        >
          {loading ? (
            <LoaderCircle size={17} className="spin" />
          ) : (
            <ChevronRight size={18} />
          )}
        </button>
      </form>

      {!hasSearched && (
        <p className="assistant-hint">
          Try “live music within 10 km” or “something free this weekend.”
        </p>
      )}

      {loading && (
        <p className="assistant-status">
          <LoaderCircle size={14} className="spin" />
          Finding your move...
        </p>
      )}

      {error && (
        <p className="assistant-error">
          <CircleAlert size={14} />
          {error}
        </p>
      )}

      {!loading && hasSearched && !error && results.length === 0 && (
        <p className="assistant-empty">
          Nothing good matched that yet. Try widening your distance or changing
          the time.
        </p>
      )}

      {results.length > 0 && (
        <div className="discovery-results">
          <div className="results-heading">
            <p className="section-eyebrow">REAL EVENTS</p>
            <span>Source-backed results</span>
          </div>

          {results.map((event) => (
            <DiscoveryEventCard
              key={event.id}
              event={event}
              saved={saved.includes(eventSaveId(event))}
              onToggleSave={onToggleSave}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function BrandLockup({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`brand-lockup ${compact ? "brand-lockup-compact" : ""}`}
      aria-label="WEIN, where to next?"
    >
      <div className="brand-lockup-logo-wrap">
        <img src="/wein-logo.png" alt="" className="brand-lockup-logo" />
      </div>

      <div className="brand-lockup-copy">
        <span className="brand-lockup-word">WEIN</span>

        <span className="brand-lockup-arabic" lang="ar" dir="rtl">
          ويــــــن؟
        </span>

        <span className="brand-lockup-tagline">Where to next?</span>
      </div>
    </div>
  );
}

function Welcome({
  onContinue,
}: {
  onContinue: (provider: AuthProvider) => void;
}) {
  return (
    <main className="welcome-screen page-enter">
      <div className="welcome-top">
        <button
          type="button"
          className="onboarding-skip"
          onClick={() => onContinue("Phone")}
        >
          Skip
        </button>
      </div>

      <div className="welcome-brand">
        <BrandLockup compact />
      </div>

      <div className="welcome-message">
        <p className="section-eyebrow">FIND YOUR NEXT MOVE</p>

        <h1>
          See what&apos;s happening.
          <br />
          Go where it&apos;s good.
        </h1>

        <p className="welcome-copy">
          Discover real places, see what they look like right now, and make
          plans with your people.
        </p>
      </div>

      <div className="auth-options" aria-label="Demo sign-in options">
        {authOptions.map(({ provider, icon: Icon }) => (
          <button
            key={provider}
            type="button"
            className={`auth-option ${
              provider === "Phone" ? "auth-option-primary" : ""
            }`}
            onClick={() => onContinue(provider)}
          >
            <Icon size={18} />
            <span>Continue with {provider}</span>
          </button>
        ))}
      </div>

      <p className="onboarding-disclaimer">
        Demo preview · authentication will be connected later.
      </p>
    </main>
  );
}

function Onboarding() {
  const [, setLocation] = useLocation();

  const [stage, setStage] = useState<"splash" | "welcome">("splash");

  const continueToDiscover = () => {
    setLocation("/discover");
  };

  if (stage === "splash") {
    return (
      <main className="splash-screen" data-testid="screen-splash">
        <div className="splash-brand">
          <BrandLockup />
        </div>

        <div className="splash-bottom">
          <p className="splash-footer">
            Real people.
            <br />
            Real places.
            <br />
            More to do.
          </p>

          <button
            type="button"
            className="splash-cta"
            onClick={() => setStage("welcome")}
          >
            Get Started
            <ChevronRight size={17} />
          </button>
        </div>
      </main>
    );
  }

  return <Welcome onContinue={continueToDiscover} />;
}

function Header({
  query,
  onQueryChange,
  category,
  onCategoryChange,
  location,
  onLocationClick,
}: {
  query: string;
  onQueryChange: (query: string) => void;
  category: Category;
  onCategoryChange: (category: Category) => void;
  location: DiscoveryLocation;
  onLocationClick: () => void;
}) {
  return (
    <header className="discover-header">
      <div className="brand-row">
        <div className="wordmark" aria-label="WEIN, where to next?">
          <span className="wordmark-logo-wrap" aria-hidden="true">
            <img src="/wein-logo.png" alt="" className="wordmark-logo" />
          </span>

          <span className="wordmark-ein">EIN</span>

          <span className="arabic-mark" lang="ar" dir="rtl">
            ويــــــن؟
          </span>
        </div>

        <button
          type="button"
          className="location-lockup"
          onClick={onLocationClick}
        >
          <MapPin size={14} />
          <span>{locationLabel(location)}</span>
        </button>

        <button
          type="button"
          className="icon-button notification-button"
          aria-label="Notifications"
        >
          <Bell size={19} />
          <span className="notification-dot" />
        </button>
      </div>

      <p className="tagline">Where to next?</p>

      <label className="search-box">
        <Search size={18} />

        <span className="sr-only">Search places and events</span>

        <input
          type="search"
          placeholder="Search events, places, people..."
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
        />

        {query && (
          <button
            type="button"
            className="clear-search"
            onClick={() => onQueryChange("")}
            aria-label="Clear search"
          >
            <X size={15} />
          </button>
        )}
      </label>

      <div className="category-scroller hide-scrollbar">
        {categories.map(({ name, icon: Icon }) => (
          <button
            type="button"
            key={name}
            className={`category-chip ${category === name ? "selected" : ""}`}
            onClick={() => onCategoryChange(name)}
            aria-pressed={category === name}
          >
            <Icon size={14} />
            {name}
          </button>
        ))}
      </div>
    </header>
  );
}

function BoredModule() {
  const [, setLocation] = useLocation();

  return (
    <section className="bored-module">
      <div className="bored-stamp">
        <Sparkles size={18} />
        <span>NO PLANS?</span>
      </div>

      <div className="bored-copy">
        <h2>Don&apos;t know where?</h2>

        <p className="bored-pick">Let WEIN pick.</p>

        <p className="bored-supporting-copy">
          Tell us your mood. WEIN will pick the move.
        </p>
      </div>

      <button
        type="button"
        className="bored-button"
        onClick={() => setLocation("/bored")}
      >
        I&apos;M BORED
        <ChevronRight size={18} />
      </button>
    </section>
  );
}

function LivePostCard({ post }: { post: LivePost }) {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likes);

  return (
    <article className="live-post-card">
      <div className="live-post-user-row">
        <div className="live-user-avatar">{post.initials}</div>

        <div className="live-user-copy">
          <strong>{post.user}</strong>

          <span>
            {post.minutesAgo} min ago · {post.city}
          </span>
        </div>

        <button type="button" className="live-more-button" aria-label="More">
          <MoreHorizontal size={20} />
        </button>
      </div>

      <div className="live-post-media">
        <img src={post.image} alt={`Live at ${post.place}`} />

        <div className="live-badge">
          <span className="live-dot" />
          LIVE NOW
        </div>

        <div className="live-vibe-badge">
          {vibeEmoji(post.vibe)} {post.vibe}
        </div>
      </div>

      <div className="live-post-body">
        <button type="button" className="live-place-button">
          <MapPin size={14} />

          <span>
            <strong>{post.place}</strong>
            <small>{post.city}</small>
          </span>

          <ChevronRight size={16} />
        </button>

        <p className="live-caption">{post.caption}</p>

        <div className="live-actions">
          <button
            type="button"
            className={liked ? "is-liked" : ""}
            onClick={() => {
              setLiked((value) => !value);

              setLikeCount((value) => (liked ? value - 1 : value + 1));
            }}
          >
            <Heart size={20} fill={liked ? "currentColor" : "none"} />
            <span>{likeCount}</span>
          </button>

          <button type="button">
            <MessageCircle size={20} />
            <span>{post.comments}</span>
          </button>

          <button type="button">
            <Send size={20} />
          </button>

          <button type="button" className="live-save-action">
            <Bookmark size={20} />
          </button>
        </div>
      </div>
    </article>
  );
}

function LiveFeed({ onCreateInstant }: { onCreateInstant: () => void }) {
  const [feedFilter, setFeedFilter] = useState<
    "For You" | "Nearby" | "Following"
  >("Nearby");

  return (
    <main className="live-page page-enter">
      <div className="live-page-header">
        <div>
          <p className="section-eyebrow">HAPPENING NOW</p>

          <h1>Live</h1>
        </div>

        <button
          type="button"
          className="live-camera-button"
          onClick={onCreateInstant}
        >
          <Camera size={20} />
        </button>
      </div>

      <div className="live-filter-tabs">
        {["For You", "Nearby", "Following"].map((filter) => (
          <button
            type="button"
            key={filter}
            className={feedFilter === filter ? "selected" : ""}
            onClick={() =>
              setFeedFilter(filter as "For You" | "Nearby" | "Following")
            }
          >
            {filter}
          </button>
        ))}
      </div>

      <section className="live-stories-section">
        <div className="live-stories hide-scrollbar">
          <button
            type="button"
            className="live-story live-story-add"
            onClick={onCreateInstant}
          >
            <span className="live-story-circle live-story-add-circle">
              <Plus size={22} />
            </span>

            <span>Add</span>
          </button>

          {liveStories.map((story) => (
            <button type="button" className="live-story" key={story.id}>
              <span className="live-story-ring">
                <img src={story.image} alt="" />
              </span>

              <span>{story.title}</span>

              <small>{story.count}</small>
            </button>
          ))}
        </div>
      </section>

      <div className="live-intro-card">
        <div className="live-intro-icon">
          <Flame size={20} />
        </div>

        <div>
          <strong>See what it&apos;s actually like.</strong>

          <p>
            Instants show photos and short videos from people who are there
            right now.
          </p>
        </div>
      </div>

      <section className="live-feed-list">
        {initialLivePosts.map((post) => (
          <LivePostCard key={post.id} post={post} />
        ))}
      </section>
    </main>
  );
}

function CreateInstant({
  onClose,
  onPosted,
}: {
  onClose: () => void;
  onPosted: () => void;
}) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const [vibe, setVibe] = useState<LiveVibe>("Poppin'");

  const [place, setPlace] = useState("Night Market After Dark");

  const [caption, setCaption] = useState("");

  const handleMedia = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setImageUrl(URL.createObjectURL(file));
  };

  return (
    <main className="instant-page page-enter">
      <div className="instant-topbar">
        <button type="button" onClick={onClose} className="instant-close">
          <X size={22} />
        </button>

        <strong>Create an Instant</strong>

        <span />
      </div>

      <section className="instant-media">
        {imageUrl ? (
          <img src={imageUrl} alt="Instant preview" />
        ) : (
          <label className="instant-upload">
            <div className="instant-camera-icon">
              <Camera size={30} />
            </div>

            <strong>Share what it looks like right now</strong>

            <span>Take a photo or choose one from your phone.</span>

            <div className="instant-upload-actions">
              <span>
                <ImagePlus size={17} />
                Photo
              </span>

              <span>
                <Video size={17} />
                Video
              </span>
            </div>

            <input
              type="file"
              accept="image/*,video/*"
              capture="environment"
              onChange={handleMedia}
            />
          </label>
        )}

        {imageUrl && (
          <label className="instant-change-media">
            <Camera size={16} />
            Change
            <input
              type="file"
              accept="image/*,video/*"
              capture="environment"
              onChange={handleMedia}
            />
          </label>
        )}
      </section>

      <section className="instant-form">
        <div className="instant-section">
          <label className="instant-field-label">Where are you?</label>

          <div className="instant-place-field">
            <MapPin size={17} />

            <input
              value={place}
              onChange={(event) => setPlace(event.target.value)}
              placeholder="Search place or event"
            />
          </div>
        </div>

        <div className="instant-section">
          <label className="instant-field-label">How&apos;s the vibe?</label>

          <div className="instant-vibes">
            {(["Poppin'", "Good", "Mid", "Dead"] as LiveVibe[]).map(
              (option) => (
                <button
                  key={option}
                  type="button"
                  className={vibe === option ? "selected" : ""}
                  onClick={() => setVibe(option)}
                >
                  <span>{vibeEmoji(option)}</span>

                  <small>{option}</small>
                </button>
              ),
            )}
          </div>
        </div>

        <div className="instant-section">
          <label className="instant-field-label">Say something</label>

          <textarea
            value={caption}
            onChange={(event) => setCaption(event.target.value)}
            placeholder="What should people know?"
            maxLength={180}
          />

          <span className="instant-character-count">{caption.length}/180</span>
        </div>

        <div className="instant-privacy-note">
          <Clock3 size={15} />

          <span>
            Instants disappear after 24 hours so people see what&apos;s current.
          </span>
        </div>

        <button
          type="button"
          className="instant-post-button"
          disabled={!imageUrl || !place.trim()}
          onClick={onPosted}
        >
          <Camera size={18} />
          Post Instant
        </button>
      </section>
    </main>
  );
}

function CreateMenu({ onInstant }: { onInstant: () => void }) {
  const createOptions = [
    {
      title: "Instant",
      description: "Share what a place looks like right now.",
      icon: Camera,
      action: onInstant,
    },
    {
      title: "Activity",
      description: "Create something people nearby can join.",
      icon: Flame,
    },
    {
      title: "Event",
      description: "Post an organized event.",
      icon: Ticket,
    },
    {
      title: "Plan",
      description: "Make a plan and invite your friends.",
      icon: UsersRound,
    },
  ];

  return (
    <main className="create-page page-enter">
      <div className="create-page-heading">
        <p className="section-eyebrow">CREATE</p>

        <h1>What&apos;s the move?</h1>

        <p>Post what&apos;s happening now or make something happen.</p>
      </div>

      <div className="create-options-grid">
        {createOptions.map(({ title, description, icon: Icon, action }) => (
          <button
            type="button"
            className={`create-option-card ${
              title === "Instant" ? "create-option-primary" : ""
            }`}
            key={title}
            onClick={action}
          >
            <span className="create-option-icon">
              <Icon size={22} />
            </span>

            <span className="create-option-copy">
              <strong>{title}</strong>
              <small>{description}</small>
            </span>

            <ChevronRight size={18} />
          </button>
        ))}
      </div>

      <div className="create-tip">
        <Sparkles size={18} />

        <p>
          <strong>WEIN Instant</strong> is for the moment. Show people what a
          place actually looks like before they decide to go.
        </p>
      </div>
    </main>
  );
}

function PlansPage() {
  return (
    <main className="tab-placeholder page-enter">
      <div className="placeholder-mark">
        <UsersRound size={25} />
      </div>

      <p className="section-eyebrow">PLANS / COMING NEXT</p>

      <h1>Your plans, in one place</h1>

      <p>
        Group chats, shared places, polls and voting are the next social layer
        we&apos;ll build.
      </p>

      <div className="plans-preview-card">
        <div className="plans-preview-users">
          <span>MK</span>
          <span>AR</span>
          <span>JM</span>
        </div>

        <strong>Friday night?</strong>

        <div className="plans-preview-option">
          <span>Night Market</span>
          <strong>5 votes</strong>
        </div>

        <div className="plans-preview-option">
          <span>Bowling</span>
          <strong>2 votes</strong>
        </div>
      </div>
    </main>
  );
}

function YouPage() {
  const profileImages = [
    "/images/night-market.jpg",
    "/images/coffee.jpg",
    "/images/park.jpg",
    "/images/arcade.jpg",
    "/images/night-market.jpg",
    "/images/park.jpg",
  ];

  return (
    <main className="you-page page-enter">
      <div className="profile-header">
        <div className="profile-avatar">MK</div>

        <div>
          <h1>muna.k</h1>
          <p>Good places. Better people.</p>
        </div>

        <button type="button">
          <UserPlus size={18} />
        </button>
      </div>

      <div className="profile-stats">
        <span>
          <strong>48</strong>
          Instants
        </span>

        <span>
          <strong>1.2K</strong>
          Followers
        </span>

        <span>
          <strong>326</strong>
          Following
        </span>
      </div>

      <div className="profile-tabs">
        <button type="button" className="selected">
          Instants
        </button>

        <button type="button">Saved</button>

        <button type="button">Collections</button>
      </div>

      <div className="profile-grid">
        {profileImages.map((image, index) => (
          <img key={`${image}-${index}`} src={image} alt="" />
        ))}
      </div>
    </main>
  );
}

function BottomNav({
  activeTab,
  onTabChange,
}: {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}) {
  const navItems: {
    name: Tab;
    icon: typeof Compass;
  }[] = [
    {
      name: "Discover",
      icon: Compass,
    },
    {
      name: "Live",
      icon: Flame,
    },
    {
      name: "Create",
      icon: Plus,
    },
    {
      name: "Plans",
      icon: Ticket,
    },
    {
      name: "You",
      icon: UserRound,
    },
  ];

  return (
    <nav className="bottom-nav">
      <div className="bottom-nav-inner">
        {navItems.map(({ name, icon: Icon }) => (
          <button
            type="button"
            key={name}
            className={`bottom-tab ${activeTab === name ? "active" : ""} ${
              name === "Create" ? "create-tab" : ""
            }`}
            onClick={() => onTabChange(name)}
          >
            <span className="nav-icon">
              <Icon
                size={name === "Create" ? 20 : 18}
                strokeWidth={name === "Create" ? 2.4 : 1.8}
              />
            </span>

            <span>{name}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}

function EmptyResults({ query }: { query: string }) {
  return (
    <div className="empty-results">
      <Search size={22} />

      <p>
        {query
          ? `No finds for “${query}” yet.`
          : "Nothing in this lane just yet."}
      </p>

      <span>Try another category or search nearby.</span>
    </div>
  );
}

function Discover() {
  const [query, setQuery] = useState("");

  const [category, setCategory] = useState<Category>("All");

  const [saved, setSaved] = useState<string[]>([]);

  const [activeTab, setActiveTab] = useState<Tab>("Discover");

  const [saveMessage, setSaveMessage] = useState("");

  const [locationOpen, setLocationOpen] = useState(false);

  const [instantOpen, setInstantOpen] = useState(false);

  const [instantMessage, setInstantMessage] = useState("");

  const {
    location,
    status: locationStatus,
    useCurrentLocation,
    saveCity,
  } = useDiscoveryLocation();

  const toggleSaved = (id: string) => {
    const isSaved = saved.includes(id);

    setSaved((current) =>
      isSaved ? current.filter((item) => item !== id) : [...current, id],
    );

    setSaveMessage(isSaved ? "Removed from your plans" : "Saved to your plans");

    window.setTimeout(() => setSaveMessage(""), 1800);
  };

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return items.filter((item) => {
      const matchesCategory = (() => {
        switch (category) {
          case "Trending":
            return item.status === "TRENDING";

          case "Tonight":
            return item.time !== "10:00 PM";

          case "Music":
            return item.category === "Music";

          case "Food":
            return item.category === "Food & Drink";

          case "Sports":
            return item.title.toLowerCase().includes("volleyball");

          case "Social":
            return (
              item.title.toLowerCase().includes("meet people") ||
              Boolean(item.social)
            );

          case "Free":
            return item.price === "Free";

          case "Learn":
            return item.category === "Learn";

          default:
            return true;
        }
      })();

      const matchesQuery =
        !normalizedQuery ||
        `${item.title} ${item.category} ${item.price}`
          .toLowerCase()
          .includes(normalizedQuery);

      return matchesCategory && matchesQuery;
    });
  }, [category, query]);

  const happening = filteredItems.filter(
    (item) => item.id === "heritage-coffee" || item.id === "pixel-night",
  );

  const forYou = filteredItems.filter(
    (item) => item.id === "river-sunset" || item.id === "heritage-coffee",
  );

  const openNow = filteredItems.filter((item) => item.status === "OPEN NOW");

  const freeThisWeek = filteredItems.filter((item) => item.price === "Free");

  if (instantOpen) {
    return (
      <div className="wein-shell grain">
        <CreateInstant
          onClose={() => setInstantOpen(false)}
          onPosted={() => {
            setInstantOpen(false);
            setActiveTab("Live");

            setInstantMessage("Instant posted");

            window.setTimeout(() => setInstantMessage(""), 1800);
          }}
        />

        {instantMessage && (
          <div className="save-toast">
            <Check size={15} />
            {instantMessage}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="wein-shell grain">
      <div className="app-content">
        {activeTab === "Discover" && (
          <>
            <Header
              query={query}
              onQueryChange={setQuery}
              category={category}
              onCategoryChange={setCategory}
              location={location}
              onLocationClick={() => setLocationOpen((open) => !open)}
            />

            <LocationPicker
              open={locationOpen}
              location={location}
              status={locationStatus}
              onUseCurrent={useCurrentLocation}
              onSaveCity={saveCity}
              onClose={() => setLocationOpen(false)}
            />
          </>
        )}

        {activeTab === "Discover" && (
          <main className="discover-main page-enter">
            <DiscoveryAssistant
              location={location}
              saved={saved}
              onToggleSave={toggleSaved}
            />

            <FeatureCard
              saved={saved.includes("night-market")}
              onToggle={toggleSaved}
            />

            <section className="content-section" id="happening-tonight">
              <SectionHeading
                eyebrow="RIGHT NOW"
                title="Happening tonight"
                action="See all"
                onAction={() => {
                  setQuery("");
                  setCategory("All");
                }}
              />

              {happening.length > 0 ? (
                <div className="event-list">
                  {happening.map((item) => (
                    <EventCard
                      key={item.id}
                      item={item}
                      saved={saved.includes(item.id)}
                      onToggle={toggleSaved}
                    />
                  ))}
                </div>
              ) : (
                <EmptyResults query={query} />
              )}
            </section>

            <section className="content-section friends-section">
              <SectionHeading
                eyebrow="YOUR PEOPLE"
                title="Friends are going"
                action="See all"
              />

              <div className="friends-scroller hide-scrollbar">
                {friends.map((friend) => (
                  <article className="friend-card" key={friend.initials}>
                    <div className="friend-image-wrap">
                      <img src={friend.image} alt="" />

                      <span className="friend-avatar">{friend.initials}</span>
                    </div>

                    <p className="friend-name">{friend.name}</p>

                    <p className="friend-plan">{friend.title}</p>
                  </article>
                ))}
              </div>
            </section>

            <BoredModule />

            <section className="content-section">
              <SectionHeading
                eyebrow="PICKED FOR YOU"
                title="For you"
                action="Refresh"
                onAction={() => {
                  setQuery("");
                  setCategory("All");
                }}
              />

              {forYou.length > 0 ? (
                <div className="event-list">
                  {forYou.map((item) => (
                    <EventCard
                      key={`for-${item.id}`}
                      item={item}
                      saved={saved.includes(item.id)}
                      onToggle={toggleSaved}
                    />
                  ))}
                </div>
              ) : (
                <EmptyResults query={query} />
              )}
            </section>

            <section className="content-section split-section">
              <div>
                <SectionHeading eyebrow="OPEN" title="Open right now" />

                {openNow.length > 0 ? (
                  openNow.map((item) => (
                    <EventCard
                      key={`open-${item.id}`}
                      item={item}
                      compact
                      saved={saved.includes(item.id)}
                      onToggle={toggleSaved}
                    />
                  ))
                ) : (
                  <p className="muted-note">
                    Nothing open matches that filter.
                  </p>
                )}
              </div>

              <div>
                <SectionHeading
                  eyebrow="NO TICKET NEEDED"
                  title="Free this week"
                />

                {freeThisWeek.length > 0 ? (
                  freeThisWeek.map((item) => (
                    <EventCard
                      key={`free-${item.id}`}
                      item={item}
                      compact
                      saved={saved.includes(item.id)}
                      onToggle={toggleSaved}
                    />
                  ))
                ) : (
                  <p className="muted-note">Try All for more free finds.</p>
                )}
              </div>
            </section>

            <p className="demo-note">
              Demo places · details are for exploring WEIN
            </p>
          </main>
        )}

        {activeTab === "Live" && (
          <LiveFeed onCreateInstant={() => setInstantOpen(true)} />
        )}

        {activeTab === "Create" && (
          <CreateMenu onInstant={() => setInstantOpen(true)} />
        )}

        {activeTab === "Plans" && <PlansPage />}

        {activeTab === "You" && <YouPage />}

        <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />

        {saveMessage && (
          <div className="save-toast" role="status">
            <Check size={15} />
            {saveMessage}
          </div>
        )}

        {instantMessage && (
          <div className="save-toast" role="status">
            <Check size={15} />
            {instantMessage}
          </div>
        )}
      </div>
    </div>
  );
}

function Bored() {
  const [, setLocation] = useLocation();

  const [mood, setMood] = useState("Surprise me");

  const [when, setWhen] = useState("Tonight");

  const [budget, setBudget] = useState("Any");

  const [distance, setDistance] = useState("10 km");

  const [results, setResults] = useState<DiscoveryEvent[]>([]);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  const [locationOpen, setLocationOpen] = useState(false);

  const {
    location,
    status: locationStatus,
    useCurrentLocation,
    saveCity,
  } = useDiscoveryLocation();

  const [saved, setSaved] = useState<string[]>([]);

  const toggleSaved = (id: string) => {
    setSaved((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  };

  const choose = async () => {
    const now = new Date();

    const endOfToday = new Date(now);

    endOfToday.setHours(23, 59, 59, 999);

    let startDate = now.toISOString();

    let endDate = endOfToday.toISOString();

    if (when === "This weekend") {
      const daysUntilSaturday = (6 - now.getDay() + 7) % 7 || 7;

      const start = new Date(now);

      start.setDate(now.getDate() + daysUntilSaturday);

      start.setHours(0, 0, 0, 0);

      const end = new Date(start);

      end.setDate(start.getDate() + 1);

      end.setHours(23, 59, 59, 999);

      startDate = start.toISOString();

      endDate = end.toISOString();
    }

    const maxPrice =
      budget === "Free"
        ? 0
        : budget === "Under $25"
          ? 25
          : budget === "Under $50"
            ? 50
            : undefined;

    const radiusKm =
      distance === "Any" ? undefined : Number.parseInt(distance, 10);

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/discovery/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: mood === "Surprise me" ? undefined : mood,

          category: ["Music", "Food", "Sports", "Outdoors"].includes(mood)
            ? mood
            : undefined,

          startDate,
          endDate,
          maxPrice,
          freeOnly: budget === "Free",
          radiusKm,
          limit: 5,
          ...location,
        }),
      });

      const payload = (await response.json()) as
        | DiscoverySearchResponse
        | { message?: string };

      if (!response.ok) {
        throw new Error(
          "message" in payload
            ? payload.message
            : "WEIN could not find a move right now.",
        );
      }

      setResults((payload as DiscoverySearchResponse).events);
    } catch (searchError) {
      setResults([]);

      setError(
        searchError instanceof Error
          ? searchError.message
          : "WEIN could not find a move right now.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="wein-shell grain">
      <main className="bored-page page-enter">
        <button
          type="button"
          className="back-link"
          onClick={() => setLocation("/discover")}
        >
          <ArrowLeft size={17} />
          Back
        </button>

        <button
          type="button"
          className="bored-location-button"
          onClick={() => setLocationOpen((open) => !open)}
        >
          <MapPin size={14} />
          {locationLabel(location)}
        </button>

        <LocationPicker
          open={locationOpen}
          location={location}
          status={locationStatus}
          onUseCurrent={useCurrentLocation}
          onSaveCity={saveCity}
          onClose={() => setLocationOpen(false)}
        />

        <div className="bored-hero">
          <p className="section-eyebrow">WEIN / DECIDE FOR YOU</p>

          <h1 className="bored-page-title">
            Don&apos;t know
            <br />
            where?
          </h1>

          <p className="bored-page-pick">Let WEIN pick.</p>

          <p className="bored-page-copy">
            Tell us what you&apos;re in the mood for and we&apos;ll find
            something for you.
          </p>
        </div>

        <div className="activity-stack">
          <figure className="activity-card activity-card-back">
            <img src="/images/park.jpg" alt="A peaceful outdoor walk" />
            <figcaption>OUTSIDE</figcaption>
          </figure>

          <figure className="activity-card activity-card-middle">
            <img src="/images/coffee.jpg" alt="A warm coffee shop table" />
            <figcaption>COFFEE</figcaption>
          </figure>

          <figure className="activity-card activity-card-front">
            <img src="/images/arcade.jpg" alt="A lively arcade at night" />
            <figcaption>PLAY</figcaption>
          </figure>
        </div>

        <div className="bored-filters">
          <div className="bored-filter-group">
            <span>Mood</span>

            <div className="bored-filter-options">
              {[
                "Food",
                "Music",
                "Chill",
                "Active",
                "Meet people",
                "Outdoors",
                "Surprise me",
              ].map((option) => (
                <button
                  type="button"
                  key={option}
                  className={mood === option ? "selected" : ""}
                  onClick={() => setMood(option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div className="bored-filter-group">
            <span>When</span>

            <div className="bored-filter-options">
              {["Now", "Tonight", "This weekend"].map((option) => (
                <button
                  type="button"
                  key={option}
                  className={when === option ? "selected" : ""}
                  onClick={() => setWhen(option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div className="bored-filter-group">
            <span>Budget</span>

            <div className="bored-filter-options">
              {["Free", "Under $25", "Under $50", "Any"].map((option) => (
                <button
                  type="button"
                  key={option}
                  className={budget === option ? "selected" : ""}
                  onClick={() => setBudget(option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div className="bored-filter-group">
            <span>Distance</span>

            <div className="bored-filter-options">
              {["5 km", "10 km", "25 km", "Any"].map((option) => (
                <button
                  type="button"
                  key={option}
                  className={distance === option ? "selected" : ""}
                  onClick={() => setDistance(option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button
          type="button"
          className="bored-main-cta"
          onClick={choose}
          disabled={loading}
        >
          {loading ? (
            <LoaderCircle size={17} className="spin" />
          ) : (
            <Sparkles size={17} />
          )}

          {loading ? "FINDING YOUR MOVE" : "I’M BORED"}
        </button>

        {error && (
          <p className="assistant-error bored-error">
            <CircleAlert size={14} />
            {error}
          </p>
        )}

        {results.length > 0 && (
          <section className="bored-results">
            <div className="results-heading">
              <p className="section-eyebrow">YOUR NEXT MOVES</p>

              <span>{results.length} source-backed finds</span>
            </div>

            {results.map((event) => (
              <DiscoveryEventCard
                key={event.id}
                event={event}
                saved={saved.includes(eventSaveId(event))}
                onToggleSave={toggleSaved}
              />
            ))}
          </section>
        )}
      </main>
    </div>
  );
}

function EventDetail() {
  const [location, setLocation] = useLocation();

  const eventId = decodeURIComponent(location.split("/").pop() || "").replace(
    /^Ticketmaster:/i,
    "",
  );

  const [event, setEvent] = useState<DiscoveryEvent | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [saved, setSaved] = useState(false);

  const [notice, setNotice] = useState("");

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError("");

    fetch(`/api/discovery/event/${encodeURIComponent(eventId)}`)
      .then(async (response) => {
        const payload = (await response.json()) as
          | DiscoveryEvent
          | {
              message?: string;
            };

        if (!response.ok) {
          throw new Error(
            "message" in payload
              ? payload.message
              : "WEIN could not load that event.",
          );
        }

        return payload as DiscoveryEvent;
      })
      .then((payload) => {
        if (!cancelled) {
          setEvent(payload);
        }
      })
      .catch((detailError) => {
        if (!cancelled) {
          setError(
            detailError instanceof Error
              ? detailError.message
              : "WEIN could not load that event.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [eventId]);

  const share = async () => {
    const shareData = {
      title: event?.name || "WEIN event",
      url: window.location.href,
    };

    if (navigator.share) {
      await navigator.share(shareData).catch(() => undefined);
    } else {
      await navigator.clipboard?.writeText(window.location.href);

      setNotice("Link copied");

      window.setTimeout(() => setNotice(""), 1800);
    }
  };

  if (loading) {
    return (
      <main className="event-detail-state">
        <LoaderCircle size={25} className="spin" />
        <p>Loading the details...</p>
      </main>
    );
  }

  if (error || !event) {
    return (
      <main className="event-detail-state">
        <CircleAlert size={25} />

        <p>{error || "That event is no longer available."}</p>

        <button
          type="button"
          className="outline-button"
          onClick={() => setLocation("/discover")}
        >
          <ArrowLeft size={16} />
          Back to Discover
        </button>
      </main>
    );
  }

  return (
    <main className="event-detail-page page-enter">
      <button
        type="button"
        className="back-link"
        onClick={() => setLocation("/discover")}
      >
        <ArrowLeft size={17} />
        Discover
      </button>

      {event.imageUrl ? (
        <img src={event.imageUrl} alt="" className="event-detail-hero" />
      ) : (
        <div className="event-detail-hero event-detail-hero-fallback">
          <Compass size={32} />
        </div>
      )}

      <div className="event-detail-content">
        <p className="section-eyebrow">{event.category}</p>

        <div className="event-detail-title-row">
          <h1>{event.name}</h1>

          <button
            type="button"
            className={`detail-save-button ${saved ? "is-saved" : ""}`}
            onClick={() => setSaved((value) => !value)}
          >
            <Bookmark size={18} fill={saved ? "currentColor" : "none"} />
          </button>
        </div>

        <div className="event-detail-facts">
          <span>
            <CalendarDays size={15} />
            {eventDateLabel(event)}
          </span>

          {event.timezone && (
            <span>
              <Clock3 size={15} />
              {event.timezone}
            </span>
          )}

          {event.venueName && (
            <span>
              <MapPin size={15} />
              {event.venueName}
            </span>
          )}

          <span>{eventPriceLabel(event)}</span>
        </div>

        {event.address && (
          <p className="event-detail-address">
            {event.address}
            {event.city ? `, ${event.city}` : ""}
          </p>
        )}

        {event.description && (
          <p className="event-detail-description">{event.description}</p>
        )}

        <div className="event-detail-actions">
          {event.ticketUrl && (
            <a
              href={event.ticketUrl}
              target="_blank"
              rel="noreferrer"
              className="primary-button"
            >
              Get Tickets
              <ExternalLink size={15} />
            </a>
          )}

          <button type="button" className="outline-button" onClick={share}>
            <Share2 size={15} />
            Share
          </button>

          <button
            type="button"
            className="outline-button"
            onClick={() => setNotice("Planning tools are coming next.")}
          >
            Plan with friends
          </button>
        </div>

        <div className="event-trust">
          <span>Source: {event.provider}</span>

          <span>
            Last checked {new Date(event.lastVerifiedAt).toLocaleDateString()}
          </span>
        </div>
      </div>

      {notice && <div className="save-toast">{notice}</div>}
    </main>
  );
}

function Router() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={Onboarding} />

        <Route path="/discover" component={Discover} />

        <Route path="/bored" component={Bored} />

        <Route path="/event/:id" component={EventDetail} />

        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();

  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  const routerBase =
    import.meta.env.BASE_URL === "/"
      ? ""
      : import.meta.env.BASE_URL.replace(/\/$/, "");

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={routerBase}>
          <Router />
        </WouterRouter>

        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
