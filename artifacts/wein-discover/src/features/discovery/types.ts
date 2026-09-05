export type EventStatus =
  | 'SCHEDULED'
  | 'CANCELLED'
  | 'POSTPONED'
  | 'SOLD_OUT'
  | 'COMPLETED'
  | 'UNKNOWN';

export type DiscoveryLocation = {
  latitude?: number;
  longitude?: number;
  city?: string;
  region?: string;
  country?: string;
  timezone?: string;
};

export type DiscoveryEvent = {
  id: string;
  provider: string;
  providerId: string;
  name: string;
  description?: string;
  category: string;
  imageUrl?: string;
  venueName?: string;
  address?: string;
  city?: string;
  region?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  startTime?: string;
  endTime?: string;
  priceMin?: number;
  priceMax?: number;
  currency?: string;
  ticketUrl?: string;
  sourceUrl?: string;
  ageRestriction?: string;
  status: EventStatus;
  lastVerifiedAt: string;
  distanceKm?: number;
};

export type DiscoverySearchParams = DiscoveryLocation & {
  prompt?: string;
  query?: string;
  radiusKm?: number;
  startDate?: string;
  endDate?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  currency?: string;
  freeOnly?: boolean;
  age?: number;
  sort?: 'relevance' | 'date' | 'distance';
  limit?: number;
};

export type DiscoverySearchResponse = {
  events: DiscoveryEvent[];
  provider: string;
  intent?: {
    query?: string;
    category?: string;
    startDate?: string;
    endDate?: string;
    maxPrice?: number;
    radiusKm?: number;
    freeOnly?: boolean;
  };
  demo: false;
};

export type DiscoveryErrorResponse = {
  code:
    | 'provider_not_configured'
    | 'provider_error'
    | 'invalid_search'
    | 'not_found';
  message: string;
  provider?: string;
};

export interface EventProvider {
  readonly name: string;
  searchEvents(params: DiscoverySearchParams): Promise<DiscoveryEvent[]>;
  getEvent(providerId: string): Promise<DiscoveryEvent | null>;
}