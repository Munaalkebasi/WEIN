import { expect, test } from "vitest";
import type { DiscoveryEvent } from "@/features/discovery/types";
import {
  buildLiveMapSearch,
  getLiveMapBounds,
  hasDiscoveryLocation,
  liveMapPlanPrefill,
} from "./map";

const event: DiscoveryEvent = {
  id: "ticketmaster:abc",
  provider: "Ticketmaster",
  providerId: "abc",
  name: "Night Market",
  category: "Food",
  venueName: "Market Hall",
  city: "Vancouver",
  region: "BC",
  latitude: 49.28,
  longitude: -123.12,
  startTime: "2026-10-09T20:00:00-07:00",
  ticketUrl: "https://example.com/ticket",
  status: "SCHEDULED",
  lastVerifiedAt: "2026-10-06T17:00:00Z",
};

test("detects usable live map locations", () => {
  expect(hasDiscoveryLocation({ city: "Vancouver" })).toBe(true);
  expect(hasDiscoveryLocation({ latitude: 49.2, longitude: -123.1 })).toBe(
    true,
  );
  expect(hasDiscoveryLocation({ latitude: 49.2 })).toBe(false);
  expect(hasDiscoveryLocation({})).toBe(false);
});

test("builds a nearby event search and category filters", () => {
  const now = new Date("2026-10-06T17:00:00Z");
  const nearby = buildLiveMapSearch(
    { latitude: 49.28, longitude: -123.12 },
    "Music",
    now,
  );
  expect(nearby.category).toBe("Music");
  expect(nearby.radiusKm).toBe(25);
  expect(nearby.sort).toBe("distance");
  expect(nearby.limit).toBe(20);
  expect(nearby.startDate).toBe(now.toISOString());

  const free = buildLiveMapSearch({ city: "Surrey" }, "Free", now);
  expect(free.freeOnly).toBe(true);
  expect(free.maxPrice).toBe(0);
  expect(free.sort).toBe("date");
});

test("computes geographic bounds containing the event coordinates", () => {
  const bounds = getLiveMapBounds([event], {})!;
  expect(bounds.minLatitude).toBeLessThan(event.latitude!);
  expect(bounds.maxLatitude).toBeGreaterThan(event.latitude!);
  expect(bounds.minLongitude).toBeLessThan(event.longitude!);
  expect(bounds.maxLongitude).toBeGreaterThan(event.longitude!);
});

test("creates a useful plan prefill from an event", () => {
  const prefill = liveMapPlanPrefill(event);
  expect(prefill.name).toBe("Night Market");
  expect(prefill.description).toContain("Added from WEIN Live Map.");
  expect(prefill.description).toContain("Market Hall");
  expect(prefill.description).toContain("https://example.com/ticket");
});
