import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { DiscoveryEvent } from "../discovery/types";
import { hasMapCoordinates, type LiveMapBounds } from "./map";

export type MapArea = { latitude: number; longitude: number; radiusKm: number };
export function GeographicMap({
  events,
  bounds,
  selectedId,
  onSelect,
  onAreaChange,
}: {
  events: DiscoveryEvent[];
  bounds: LiveMapBounds;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAreaChange: (area: MapArea) => void;
}) {
  const element = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | undefined>(undefined);
  const initialBounds = useRef(bounds);
  const callbacks = useRef({ onSelect, onAreaChange });
  callbacks.current = { onSelect, onAreaChange };
  useEffect(() => {
    if (!element.current) return;
    const instance = L.map(element.current, {
      scrollWheelZoom: true,
      zoomControl: false,
    });
    map.current = instance;
    L.control.zoom({ position: "topright" }).addTo(instance);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(instance);
    const box = initialBounds.current;
    instance.fitBounds(
      [
        [box.minLatitude, box.minLongitude],
        [box.maxLatitude, box.maxLongitude],
      ],
      { padding: [30, 30], maxZoom: 13, animate: false },
    );
    const moved = () => {
      const center = instance.getCenter();
      const radius =
        center.distanceTo(instance.getBounds().getNorthEast()) / 1000;
      callbacks.current.onAreaChange({
        latitude: center.lat,
        longitude: center.lng,
        radiusKm: Math.min(1000, Math.max(0.5, radius)),
      });
    };
    instance.on("moveend", moved);
    const observer =
      typeof ResizeObserver === "undefined"
        ? undefined
        : new ResizeObserver(() => instance.invalidateSize({ pan: false }));
    observer?.observe(element.current);
    return () => {
      observer?.disconnect();
      instance.off("moveend", moved);
      instance.remove();
      map.current = undefined;
    };
  }, []);
  useEffect(() => {
    const instance = map.current;
    if (!instance) return;
    const markers = L.layerGroup().addTo(instance);
    events.forEach((event, index) => {
      if (!hasMapCoordinates(event)) return;
      const button = document.createElement("button");
      button.type = "button";
      button.className =
        event.id === selectedId ? "live-map-pin selected" : "live-map-pin";
      button.textContent = String(index + 1);
      button.setAttribute("aria-label", `Select ${event.name}`);
      button.setAttribute("aria-pressed", String(event.id === selectedId));
      button.addEventListener("click", () =>
        callbacks.current.onSelect(event.id),
      );
      const tooltip = document.createElement("span");
      tooltip.textContent = event.name;
      L.marker([event.latitude!, event.longitude!], {
        icon: L.divIcon({
          html: button,
          className: "wein-geographic-marker",
          iconSize: [38, 38],
          iconAnchor: [19, 38],
        }),
        keyboard: false,
        zIndexOffset: event.id === selectedId ? 1000 : 0,
      })
        .bindTooltip(tooltip)
        .addTo(markers);
    });
    return () => {
      markers.remove();
    };
  }, [events, selectedId]);
  return (
    <div
      className="live-map-canvas"
      ref={element}
      aria-label="Interactive event map"
    />
  );
}
