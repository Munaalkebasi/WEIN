import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { GeographicMap } from "./GeographicMap";
import type { DiscoveryEvent } from "../discovery/types";
const events: DiscoveryEvent[] = [
  {
    id: "van",
    provider: "Ticketmaster",
    providerId: "van",
    name: "Vancouver event",
    category: "Music",
    latitude: 49.28,
    longitude: -123.12,
    status: "SCHEDULED",
    lastVerifiedAt: "",
  },
  {
    id: "surrey",
    provider: "Ticketmaster",
    providerId: "surrey",
    name: "Surrey event",
    category: "Music",
    latitude: 49.1,
    longitude: -122.8,
    status: "SCHEDULED",
    lastVerifiedAt: "",
  },
];
const bounds = {
  minLatitude: 49,
  maxLatitude: 49.4,
  minLongitude: -123.3,
  maxLongitude: -122.6,
};
beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(600);
  vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(600);
});
afterEach(() => vi.restoreAllMocks());
function pinPosition() {
  const pin = screen.getByRole("button", { name: "Select Vancouver event" }).parentElement!;
  const pane = pin.closest(".leaflet-map-pane") as HTMLElement;
  return [pin.style.left, pin.style.top, pin.style.transform, pane.style.left, pane.style.top, pane.style.transform].join("|");
}
test("real geographic markers move with map zoom and pan instead of remaining screen overlays", async () => {
  const moved = vi.fn();
  render(
    <GeographicMap
      events={events}
      bounds={bounds}
      selectedId="van"
      onSelect={() => {}}
      onAreaChange={moved}
    />,
  );
  const before = pinPosition();
  fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
  await waitFor(() => expect(pinPosition()).not.toBe(before));
  expect(moved).toHaveBeenCalled();
  const zoomed = pinPosition();
  fireEvent.focus(screen.getByLabelText("Interactive event map"));
  fireEvent.keyDown(document, {
    key: "ArrowRight",
    keyCode: 39,
    which: 39,
  });
  await waitFor(() => expect(pinPosition()).not.toBe(zoomed));
  const area = moved.mock.calls.at(-1)![0];
  expect(area.latitude).toBeGreaterThan(49);
  expect(area.radiusKm).toBeGreaterThan(0);
});
test("selection updates preserve the user viewport and expose accessible event buttons", async () => {
  const select = vi.fn(),
    moved = vi.fn();
  const view = render(
    <GeographicMap
      events={events}
      bounds={bounds}
      selectedId="van"
      onSelect={select}
      onAreaChange={moved}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
  await waitFor(() => expect(moved).toHaveBeenCalled());
  const position = pinPosition();
  fireEvent.click(screen.getByRole("button", { name: "Select Surrey event" }));
  expect(select).toHaveBeenCalledWith("surrey");
  view.rerender(
    <GeographicMap
      events={events}
      bounds={bounds}
      selectedId="surrey"
      onSelect={select}
      onAreaChange={moved}
    />,
  );
  expect(pinPosition()).toBe(position);
  expect(
    screen
      .getByRole("button", { name: "Select Surrey event" })
      .getAttribute("aria-pressed"),
  ).toBe("true");
});
