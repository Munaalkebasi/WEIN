import type { DiscoverySearchParams } from "../../features/discovery/types.js";
import { discoverySearchSchema } from "../discovery/validation.js";
import { DiscoveryServiceError, searchDiscoveryEvents } from "../discovery/service.js";

// A deliberately small grammar: never silently interpret unsupported chat requests.
export async function basicSearch(prompt: string, previous: DiscoverySearchParams = {}) {
  const search = { ...previous, limit: 8 };
  delete search.prompt;
  let remaining = prompt.toLowerCase().trim();
  let recognized = false;
  remaining = remaining.replace(/\b(?:within|under)\s*(\d+(?:\.\d+)?)\s*km\b/g, (_, value) => {
    search.radiusKm = Number(value);
    recognized = true;
    return " ";
  });
  remaining = remaining.replace(/(?:under|below|less than|max(?:imum)?(?: price)?)\s*\$?\s*(\d+(?:\.\d+)?)\s*(?:dollars?|cad)?|\$\s*(\d+(?:\.\d+)?)|\b(\d+(?:\.\d+)?)\s*dollars?\b/g, (_, a, b, c) => {
    search.maxPrice = Number(a ?? b ?? c);
    search.freeOnly = search.maxPrice === 0;
    recognized = true;
    return " ";
  });
  remaining = remaining.replace(/\bfree\b/g, () => {
    search.freeOnly = true;
    search.maxPrice = 0;
    recognized = true;
    return " ";
  });
  remaining = remaining.replace(/\b(?:live music|music|concerts?|sports|comedy|family)\b/g, (category) => {
    search.category = /music|concert/.test(category) ? "Music" : category[0].toUpperCase() + category.slice(1);
    recognized = true;
    return " ";
  });
  remaining = remaining.replace(/\b(?:find|show|me|events?|please|for|or|less|and|nearby)\b/g, " ").trim();
  const reply = (message: string) => ({ status: 200, body: { mode: "basic", reply: `AI chat is unavailable. Basic event search: ${message}`, events: [], searched: false, search: previous } });
  if (!recognized || remaining || !discoverySearchSchema.safeParse(search).success)
    return reply('try a budget, distance or category, such as "20 dollars within 10 km". For dates, names or other requests, use the event search filters.');
  if (!search.city && search.latitude === undefined)
    return reply("choose your location above, then resend your request.");
  if (search.radiusKm && search.latitude === undefined)
    return reply("choose a location on the map above so I can measure the requested distance, then resend your request.");
  try {
    const result = await searchDiscoveryEvents(search);
    // Radius guarantees require known event coordinates, not merely a provider's filter.
    const events = result.events.filter(event => !search.radiusKm || (event.distanceKm !== undefined && event.distanceKm <= search.radiusKm));
    return { status: 200, body: { mode: "basic", reply: `AI chat is unavailable. Basic event search: ${events.length ? "these real Ticketmaster events match your filters. Listed prices are starting prices; check tickets for fees and availability." : "no verified events match your filters. Try a wider distance or a higher budget."}`, events, searched: true, search } };
  } catch (error) {
    return { status: 503, body: { code: error instanceof DiscoveryServiceError ? error.code : "provider_error", message: "AI chat is unavailable and live event search could not load. Please retry shortly." } };
  }
}

