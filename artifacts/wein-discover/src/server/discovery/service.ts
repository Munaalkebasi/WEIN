import type {
  DiscoveryEvent,
  DiscoverySearchParams,
  DiscoverySearchResponse,
} from '@/features/discovery/types';
import { parseDiscoveryIntent } from './intent';
import { ticketmasterProvider } from './providers/ticketmaster';

export class DiscoveryServiceError extends Error {
  constructor(
    public code: 'provider_not_configured' | 'provider_error' | 'not_found',
    message: string,
  ) {
    super(message);
  }
}

function distanceKm(a: DiscoveryEvent, params: DiscoverySearchParams) {
  if (
    a.latitude === undefined
    || a.longitude === undefined
    || params.latitude === undefined
    || params.longitude === undefined
  ) return undefined;

  const earthRadius = 6371;
  const latitudeDelta = (a.latitude - params.latitude) * Math.PI / 180;
  const longitudeDelta = (a.longitude - params.longitude) * Math.PI / 180;
  const latitude1 = params.latitude * Math.PI / 180;
  const latitude2 = a.latitude * Math.PI / 180;
  const haversine = Math.sin(latitudeDelta / 2) ** 2
    + Math.sin(longitudeDelta / 2) ** 2 * Math.cos(latitude1) * Math.cos(latitude2);
  return earthRadius * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function applyEligibility(events: DiscoveryEvent[], params: DiscoverySearchParams) {
  return events
    .map((event) => ({ event, distance: distanceKm(event, params) }))
    .filter(({ event, distance }) => {
      if (event.status === 'CANCELLED' || event.status === 'COMPLETED') return false;
      if (params.radiusKm && distance !== undefined && distance > params.radiusKm) return false;
      if (params.startDate && event.startTime && new Date(event.startTime) < new Date(params.startDate)) return false;
      if (params.endDate && event.startTime && new Date(event.startTime) > new Date(params.endDate)) return false;
      if (params.maxPrice !== undefined && (event.priceMin === undefined || event.priceMin > params.maxPrice)) return false;
      if (params.minPrice !== undefined && event.priceMax !== undefined && event.priceMax < params.minPrice) return false;
      if (params.freeOnly && event.priceMin !== 0) return false;
      return true;
    })
    .map(({ event, distance }) => ({ ...event, distanceKm: distance }));
}

function rankEvents(events: DiscoveryEvent[], params: DiscoverySearchParams) {
  return [...events].sort((a, b) => {
    const score = (event: DiscoveryEvent) => {
      let total = 0;
      if (params.category && event.category.toLowerCase().includes(params.category.toLowerCase())) total += 30;
      if (params.radiusKm && event.distanceKm !== undefined) total += Math.max(0, 20 - (event.distanceKm / params.radiusKm) * 20);
      if (params.startDate && event.startTime) total += 15;
      if (params.maxPrice !== undefined && event.priceMin !== undefined && event.priceMin <= params.maxPrice) total += 15;
      if (event.status === 'SCHEDULED') total += 10;
      if (event.imageUrl) total += 10;
      return total;
    };
    return score(b) - score(a);
  });
}

function providerFor(name?: string) {
  if (!name || name.toLowerCase() === 'ticketmaster') return ticketmasterProvider;
  return ticketmasterProvider;
}

export async function searchDiscoveryEvents(input: DiscoverySearchParams): Promise<DiscoverySearchResponse> {
  const intent = input.prompt ? parseDiscoveryIntent(input.prompt, input) : input;
  const provider = providerFor();

  let events: DiscoveryEvent[];
  try {
    events = await provider.searchEvents(intent);
  } catch (error) {
    if (error instanceof Error && error.message.includes('not configured')) {
      throw new DiscoveryServiceError(
        'provider_not_configured',
        'Live event search is not configured yet. Add a Ticketmaster API key to enable real results.',
      );
    }
    throw new DiscoveryServiceError(
      'provider_error',
      'Ticketmaster could not return events right now. Try again in a moment.',
    );
  }

  const eligible = applyEligibility(events, intent);
  const ranked = rankEvents(eligible, intent).slice(0, Math.min(intent.limit || 10, 20));
  return {
    events: ranked,
    provider: provider.name,
    intent: {
      query: intent.query,
      category: intent.category,
      startDate: intent.startDate,
      endDate: intent.endDate,
      maxPrice: intent.maxPrice,
      radiusKm: intent.radiusKm,
      freeOnly: intent.freeOnly,
    },
    demo: false,
  };
}

export async function getDiscoveryEvent(providerId: string) {
  try {
    const event = await ticketmasterProvider.getEvent(providerId);
    if (!event) throw new DiscoveryServiceError('not_found', 'That event is no longer available.');
    return event;
  } catch (error) {
    if (error instanceof DiscoveryServiceError) throw error;
    if (error instanceof Error && error.message.includes('not configured')) {
      throw new DiscoveryServiceError(
        'provider_not_configured',
        'Live event details are not configured yet. Add a Ticketmaster API key to enable them.',
      );
    }
    throw new DiscoveryServiceError('provider_error', 'We could not load that event right now.');
  }
}