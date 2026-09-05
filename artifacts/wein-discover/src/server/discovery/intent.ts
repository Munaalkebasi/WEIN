import type { DiscoverySearchParams } from '@/features/discovery/types';

const categoryAliases: Array<[string, string]> = [
  ['live music', 'Music'],
  ['music', 'Music'],
  ['concert', 'Music'],
  ['comedy', 'Comedy'],
  ['food', 'Food'],
  ['restaurant', 'Food'],
  ['sports', 'Sports'],
  ['sport', 'Sports'],
  ['nightlife', 'Nightlife'],
  ['family', 'Family'],
  ['outdoors', 'Outdoors'],
];

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfToday() {
  const date = new Date();
  date.setHours(23, 59, 59, 999);
  return date;
}

function nextWeekend() {
  const date = new Date();
  const day = date.getDay();
  const daysUntilSaturday = (6 - day + 7) % 7 || 7;
  const start = new Date(date);
  start.setDate(date.getDate() + daysUntilSaturday);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 1);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export function parseDiscoveryIntent(prompt: string, base: DiscoverySearchParams = {}) {
  const normalized = prompt.toLowerCase().trim();
  const intent: DiscoverySearchParams = { ...base, prompt };

  if (/\btonight\b/.test(normalized)) {
    intent.startDate = startOfToday().toISOString();
    intent.endDate = endOfToday().toISOString();
  } else if (/\btoday\b|\bnow\b/.test(normalized)) {
    intent.startDate = new Date().toISOString();
    intent.endDate = endOfToday().toISOString();
  } else if (/\bthis weekend\b|\bweekend\b/.test(normalized)) {
    const weekend = nextWeekend();
    intent.startDate = weekend.start.toISOString();
    intent.endDate = weekend.end.toISOString();
  }

  const priceMatch = normalized.match(/(?:under|less than|below|max(?:imum)?(?: price)?\s*)(?:\$|cad\s*)?(\d+(?:\.\d+)?)/i);
  if (priceMatch) {
    intent.maxPrice = Number(priceMatch[1]);
  }

  const distanceMatch = normalized.match(/(?:within|under)\s*(\d+(?:\.\d+)?)\s*km/i);
  if (distanceMatch) {
    intent.radiusKm = Number(distanceMatch[1]);
  }

  if (/\bfree\b|\bno cost\b|\bno ticket\b/.test(normalized)) {
    intent.freeOnly = true;
    intent.maxPrice = 0;
  }

  for (const [alias, category] of categoryAliases) {
    if (normalized.includes(alias)) {
      intent.category = category;
      break;
    }
  }

  const query = normalized
    .replace(/\b(i'm|im|i am|find|show me|something|anything|what can i do|what's happening|whats happening|near me|tonight|today|now|this weekend|weekend|free|under|less than|within)\b/g, ' ')
    .replace(/\$?\d+(?:\.\d+)?\s*(?:km)?/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (query && !intent.query) {
    intent.query = query;
  }

  return intent;
}