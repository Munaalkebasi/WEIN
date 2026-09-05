import type {
  DiscoveryEvent,
  DiscoverySearchParams,
  EventProvider,
  EventStatus,
} from '@/features/discovery/types';

const TICKETMASTER_ENDPOINT = 'https://app.ticketmaster.com/discovery/v2';

function providerStatus(code?: string): EventStatus {
  switch (code?.toLowerCase()) {
    case 'cancelled':
      return 'CANCELLED';
    case 'postponed':
    case 'rescheduled':
      return 'POSTPONED';
    case 'offsale':
    case 'onsale':
      return 'SCHEDULED';
    default:
      return 'UNKNOWN';
  }
}

function categoryName(event: any) {
  return event.classifications?.[0]?.segment?.name
    || event.classifications?.[0]?.genre?.name
    || 'Event';
}

function imageUrl(event: any) {
  const images = Array.isArray(event.images) ? event.images : [];
  return images.find((image: any) => image.ratio === '16_9' && image.width >= 640)?.url
    || images.sort((a: any, b: any) => (b.width || 0) - (a.width || 0))[0]?.url;
}

function normalizeEvent(event: any): DiscoveryEvent {
  const venue = event._embedded?.venues?.[0];
  const price = event.priceRanges?.[0];
  const location = venue?.location;
  const startTime = event.dates?.start?.dateTime
    || (event.dates?.start?.localDate ? `${event.dates.start.localDate}T${event.dates.start.localTime || '00:00:00'}` : undefined);

  return {
    id: `ticketmaster:${event.id}`,
    provider: 'Ticketmaster',
    providerId: event.id,
    name: event.name,
    description: event.info || event.pleaseNote || event.description,
    category: categoryName(event),
    imageUrl: imageUrl(event),
    venueName: venue?.name,
    address: [venue?.address?.line1, venue?.address?.line2].filter(Boolean).join(', ') || undefined,
    city: venue?.city?.name,
    region: venue?.state?.stateCode || venue?.state?.name,
    country: venue?.country?.countryCode,
    latitude: location?.latitude ? Number(location.latitude) : undefined,
    longitude: location?.longitude ? Number(location.longitude) : undefined,
    timezone: event.dates?.timezone || venue?.timezone,
    startTime,
    endTime: event.dates?.end?.dateTime,
    priceMin: price?.min,
    priceMax: price?.max,
    currency: price?.currency,
    ticketUrl: event.url,
    sourceUrl: event.url,
    ageRestriction: event.ageRestrictions?.legalAgeEnforced ? 'Age restricted' : undefined,
    status: providerStatus(event.dates?.status?.code),
    lastVerifiedAt: new Date().toISOString(),
  };
}

function buildSearchUrl(params: DiscoverySearchParams, apiKey: string) {
  const url = new URL(`${TICKETMASTER_ENDPOINT}/events.json`);
  url.searchParams.set('apikey', apiKey);
  url.searchParams.set('size', String(Math.min(Math.max(params.limit || 20, 1), 50)));
  url.searchParams.set('sort', params.sort === 'distance' ? 'distance,asc' : 'date,asc');
  url.searchParams.set('unit', 'km');
  url.searchParams.set('includeTBA', 'no');
  url.searchParams.set('includeTBD', 'no');

  if (params.query) url.searchParams.set('keyword', params.query);
  if (params.category) url.searchParams.set('classificationName', params.category);
  if (params.city) url.searchParams.set('city', params.city);
  if (params.latitude !== undefined && params.longitude !== undefined) {
    url.searchParams.set('latlong', `${params.latitude},${params.longitude}`);
  }
  if (params.radiusKm) url.searchParams.set('radius', String(params.radiusKm));
  if (params.startDate) url.searchParams.set('startDateTime', params.startDate);
  if (params.endDate) url.searchParams.set('endDateTime', params.endDate);
  if (params.currency) url.searchParams.set('currency', params.currency);
  return url;
}

async function ticketmasterFetch(path: string, params: URLSearchParams, apiKey: string) {
  const response = await fetch(`${TICKETMASTER_ENDPOINT}${path}?${params.toString()}`);
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Ticketmaster responded with ${response.status}: ${body.slice(0, 180)}`);
  }
  return response.json();
}

export const ticketmasterProvider: EventProvider = {
  name: 'Ticketmaster',

  async searchEvents(params) {
    const apiKey = process.env.TICKETMASTER_API_KEY;
    if (!apiKey) {
      throw new Error('TICKETMASTER_API_KEY is not configured');
    }

    const url = buildSearchUrl(params, apiKey);
    const payload = await ticketmasterFetch('/events.json', new URLSearchParams(url.search), apiKey);
    return (payload._embedded?.events || []).map(normalizeEvent);
  },

  async getEvent(providerId) {
    const apiKey = process.env.TICKETMASTER_API_KEY;
    if (!apiKey) {
      throw new Error('TICKETMASTER_API_KEY is not configured');
    }

    const payload = await ticketmasterFetch(`/events/${encodeURIComponent(providerId)}.json`, new URLSearchParams({ apikey: apiKey }), apiKey);
    return normalizeEvent(payload);
  },
};