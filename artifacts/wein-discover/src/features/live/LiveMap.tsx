import { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  CircleAlert,
  LoaderCircle,
  LocateFixed,
  MapPin,
  Plus,
  RefreshCw,
} from "lucide-react";
import { useLocation } from "wouter";
import type {
  DiscoveryEvent,
  DiscoveryLocation,
  DiscoverySearchResponse,
} from "@/features/discovery/types";
import {
  buildLiveMapSearch,
  getLiveMapBounds,
  hasDiscoveryLocation,
  LIVE_MAP_CATEGORIES,
  liveMapPlanPrefill,
  type LiveMapCategory,
} from "./map";
import { GeographicMap, type MapArea } from "./GeographicMap";
import "./live-map.css";

type Props = {
  location: DiscoveryLocation;
  locationStatus: "idle" | "locating" | "ready" | "denied" | "error";
  onUseCurrentLocation: () => void;
  onChooseLocation: () => void;
};

function eventPlace(event: DiscoveryEvent) {
  return (
    event.venueName ||
    [event.city, event.region].filter(Boolean).join(", ") ||
    "Location to be confirmed"
  );
}

function eventTime(event: DiscoveryEvent) {
  if (!event.startTime) return "Date to be confirmed";
  const date = new Date(event.startTime);
  return Number.isNaN(date.getTime())
    ? "Date to be confirmed"
    : date.toLocaleString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
}

function priceLabel(event: DiscoveryEvent) {
  if (event.priceMin === 0 && event.priceMax === 0) return "Free";
  if (event.priceMin === undefined) return "Price unavailable";
  const currency = event.currency || "CAD";
  if (event.priceMax !== undefined && event.priceMax !== event.priceMin) {
    return `${currency} ${event.priceMin.toFixed(0)}–${event.priceMax.toFixed(0)}`;
  }
  return `From ${currency} ${event.priceMin.toFixed(0)}`;
}

export function LiveMap({
  location,
  locationStatus,
  onUseCurrentLocation,
  onChooseLocation,
}: Props) {
  const [, navigate] = useLocation();
  const [category, setCategory] = useState<LiveMapCategory>("All");
  const [events, setEvents] = useState<DiscoveryEvent[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [searchArea, setSearchArea] = useState<MapArea | null>(null);
  const [pendingArea, setPendingArea] = useState<MapArea | null>(null);
  const request = useRef<AbortController | null>(null);
  const locationKey = JSON.stringify(location);
  const searchLocation = searchArea
    ? {
        ...location,
        city: undefined,
        latitude: searchArea.latitude,
        longitude: searchArea.longitude,
      }
    : location;
  const located = hasDiscoveryLocation(location);
  useEffect(() => {
    setSearchArea(null);
    setPendingArea(null);
  }, [locationKey]);

  const loadEvents = async () => {
    if (!located) return;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/discovery/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          ...buildLiveMapSearch(searchLocation, category),
          ...(searchArea ? { radiusKm: searchArea.radiusKm } : {}),
        }),
      });
      const payload = (await response.json()) as
        DiscoverySearchResponse | { message?: string };

      if (!response.ok) {
        throw new Error(
          "message" in payload
            ? payload.message
            : "WEIN could not load nearby events.",
        );
      }

      if (controller.signal.aborted) return;
      const nextEvents = (payload as DiscoverySearchResponse).events.filter(
        (event) =>
          event.latitude !== undefined && event.longitude !== undefined,
      );
      setEvents(nextEvents);
      setSelectedId((current) =>
        current && nextEvents.some((event) => event.id === current)
          ? current
          : nextEvents[0]?.id || null,
      );
    } catch (mapError) {
      if (controller.signal.aborted) return;
      setEvents([]);
      setSelectedId(null);
      setError(
        mapError instanceof Error
          ? mapError.message
          : "WEIN could not load nearby events.",
      );
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  };

  useEffect(() => {
    void loadEvents();
    return () => request.current?.abort();
    // buildLiveMapSearch only depends on these primitive location fields.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    category,
    searchArea,
    location.city,
    location.region,
    location.country,
    location.latitude,
    location.longitude,
    location.timezone,
    located,
  ]);

  const bounds = useMemo(
    () => getLiveMapBounds(events, searchLocation),
    [events, location, searchArea],
  );
  const selected =
    events.find((event) => event.id === selectedId) || events[0] || null;

  const planEvent = (event: DiscoveryEvent) => {
    const prefill = liveMapPlanPrefill(event);
    const query = new URLSearchParams({
      name: prefill.name,
      description: prefill.description,
    });
    navigate(`/plans/new?${query.toString()}`);
  };

  if (!located) {
    return (
      <section className="live-map-state live-map-location-state">
        <MapPin size={32} />
        <h2>Choose where to explore</h2>
        <p>
          Live Map needs a city or your current location before it can show
          nearby events.
        </p>
        <div className="live-map-state-actions">
          <button type="button" onClick={onUseCurrentLocation}>
            {locationStatus === "locating" ? (
              <LoaderCircle className="spin" size={17} />
            ) : (
              <LocateFixed size={17} />
            )}
            Use current location
          </button>
          <button
            type="button"
            className="secondary"
            onClick={onChooseLocation}
          >
            Choose city
          </button>
        </div>
        {locationStatus === "denied" && (
          <p className="live-map-location-note" role="alert">
            Location permission was denied. Choose a city instead.
          </p>
        )}
        {locationStatus === "error" && (
          <p className="live-map-location-note" role="alert">
            Your location could not be detected. Choose a city instead.
          </p>
        )}
      </section>
    );
  }

  return (
    <section className="live-map-shell" aria-label="Live event map">
      <div className="live-map-toolbar">
        <div>
          <p className="section-eyebrow">NEARBY THIS WEEK</p>
          <h2>Live Map</h2>
        </div>
        <button
          type="button"
          className="live-map-refresh"
          onClick={() => void loadEvents()}
          disabled={loading}
          aria-label="Refresh Live Map"
        >
          <RefreshCw className={loading ? "spin" : ""} size={18} />
        </button>
      </div>

      <div
        className="live-map-categories hide-scrollbar"
        aria-label="Map filters"
      >
        {LIVE_MAP_CATEGORIES.map((value) => (
          <button
            key={value}
            type="button"
            className={category === value ? "selected" : ""}
            aria-pressed={category === value}
            onClick={() => setCategory(value)}
          >
            {value}
          </button>
        ))}
      </div>

      {loading && events.length === 0 ? (
        <div className="live-map-state" role="status">
          <LoaderCircle className="spin" size={27} />
          <p>Finding nearby events…</p>
        </div>
      ) : error ? (
        <div className="live-map-state">
          <CircleAlert size={29} />
          <h3>Map unavailable</h3>
          <p role="alert">{error}</p>
          <button type="button" onClick={() => void loadEvents()}>
            Try again
          </button>
        </div>
      ) : !bounds ? (
        <div className="live-map-state">
          <MapPin size={29} />
          <h3>Nothing mapped here yet</h3>
          <p>Try another category or widen your search from Discover.</p>
        </div>
      ) : (
        <>
          <GeographicMap
            key={locationKey}
            events={events}
            bounds={bounds}
            selectedId={selected?.id || null}
            onSelect={setSelectedId}
            onAreaChange={setPendingArea}
          />
          {pendingArea && (
            <button
              className="live-map-search-area"
              disabled={loading}
              onClick={() => {
                setSearchArea(pendingArea);
                setPendingArea(null);
              }}
            >
              Search this area
            </button>
          )}
          {events.length === 0 && (
            <p className="live-map-empty" role="status">
              No events matched this area and category this week. Move the map
              or try another category.
            </p>
          )}

          {selected && (
            <article className="live-map-card">
              {selected.imageUrl && (
                <img
                  src={selected.imageUrl}
                  alt=""
                  className="live-map-card-image"
                />
              )}
              <div className="live-map-card-copy">
                <div className="live-map-card-title">
                  <div>
                    <p>{selected.category}</p>
                    <h3>{selected.name}</h3>
                  </div>
                  {selected.distanceKm !== undefined && (
                    <span>{selected.distanceKm.toFixed(1)} km</span>
                  )}
                </div>

                <div className="live-map-card-meta">
                  <span>
                    <MapPin size={14} />
                    {eventPlace(selected)}
                  </span>
                  <span>
                    <CalendarDays size={14} />
                    {eventTime(selected)}
                  </span>
                  <span>{priceLabel(selected)}</span>
                </div>

                <div className="live-map-card-actions">
                  <button type="button" onClick={() => planEvent(selected)}>
                    <Plus size={16} />
                    Add to Plan
                  </button>
                  <button
                    type="button"
                    className="secondary"
                    onClick={() =>
                      navigate(
                        `/event/${encodeURIComponent(selected.providerId)}`,
                      )
                    }
                  >
                    Details
                  </button>
                </div>
              </div>
            </article>
          )}
        </>
      )}
    </section>
  );
}
