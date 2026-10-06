import type {
  DiscoveryEvent,
  DiscoveryLocation,
  DiscoverySearchParams,
} from "@/features/discovery/types";

export const LIVE_MAP_CATEGORIES = ["All", "Music", "Sports", "Food", "Free"] as const;
export type LiveMapCategory = (typeof LIVE_MAP_CATEGORIES)[number];

export type LiveMapBounds = {
  minLatitude: number;
  maxLatitude: number;
  minLongitude: number;
  maxLongitude: number;
};

export function hasDiscoveryLocation(location: DiscoveryLocation) {
  return Boolean(
    location.city ||
      (location.latitude !== undefined && location.longitude !== undefined),
  );
}

export function buildLiveMapSearch(
  location: DiscoveryLocation,
  category: LiveMapCategory,
  now = new Date(),
): DiscoverySearchParams {
  const end = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const hasCoordinates =
    location.latitude !== undefined && location.longitude !== undefined;

  return {
    ...location,
    startDate: now.toISOString(),
    endDate: end.toISOString(),
    radiusKm: hasCoordinates ? 25 : undefined,
    sort: hasCoordinates ? "distance" : "date",
    limit: 20,
    ...(category === "Free"
      ? { freeOnly: true, maxPrice: 0 }
      : category === "All"
        ? {}
        : { category }),
  };
}

export function getLiveMapBounds(
  events: DiscoveryEvent[],
  location: DiscoveryLocation,
): LiveMapBounds | null {
  const coordinates = events
    .filter(
      (event) =>
        event.latitude !== undefined && event.longitude !== undefined,
    )
    .map((event) => ({
      latitude: event.latitude as number,
      longitude: event.longitude as number,
    }));

  if (
    coordinates.length === 0 &&
    location.latitude !== undefined &&
    location.longitude !== undefined
  ) {
    coordinates.push({
      latitude: location.latitude,
      longitude: location.longitude,
    });
  }

  if (coordinates.length === 0) return null;

  const latitudes = coordinates.map((point) => point.latitude);
  const longitudes = coordinates.map((point) => point.longitude);
  const minimumLatitude = Math.min(...latitudes);
  const maximumLatitude = Math.max(...latitudes);
  const minimumLongitude = Math.min(...longitudes);
  const maximumLongitude = Math.max(...longitudes);
  const latitudeSpan = Math.max(maximumLatitude - minimumLatitude, 0.04);
  const longitudeSpan = Math.max(maximumLongitude - minimumLongitude, 0.04);
  const latitudePadding = latitudeSpan * 0.18;
  const longitudePadding = longitudeSpan * 0.18;

  return {
    minLatitude: minimumLatitude - latitudePadding,
    maxLatitude: maximumLatitude + latitudePadding,
    minLongitude: minimumLongitude - longitudePadding,
    maxLongitude: maximumLongitude + longitudePadding,
  };
}

export function getLiveMapPosition(
  event: DiscoveryEvent,
  bounds: LiveMapBounds,
) {
  if (event.latitude === undefined || event.longitude === undefined) return null;

  const longitudeSpan = bounds.maxLongitude - bounds.minLongitude || 1;
  const latitudeSpan = bounds.maxLatitude - bounds.minLatitude || 1;
  const left =
    ((event.longitude - bounds.minLongitude) / longitudeSpan) * 100;
  const top =
    ((bounds.maxLatitude - event.latitude) / latitudeSpan) * 100;

  return {
    left: Math.min(96, Math.max(4, left)),
    top: Math.min(96, Math.max(4, top)),
  };
}

export function liveMapEmbedUrl(bounds: LiveMapBounds) {
  const bbox = [
    bounds.minLongitude,
    bounds.minLatitude,
    bounds.maxLongitude,
    bounds.maxLatitude,
  ].join(",");

  return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(
    bbox,
  )}&layer=mapnik`;
}

export function liveMapPlanPrefill(event: DiscoveryEvent) {
  const place = [
    event.venueName,
    [event.city, event.region].filter(Boolean).join(", "),
  ]
    .filter(Boolean)
    .join(" · ");
  const when = event.startTime
    ? new Date(event.startTime).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "";
  const details = [place, when, event.ticketUrl].filter(Boolean).join("\n");

  return {
    name: event.name,
    description: [
      "Added from WEIN Live Map.",
      details,
    ]
      .filter(Boolean)
      .join("\n\n"),
  };
}
