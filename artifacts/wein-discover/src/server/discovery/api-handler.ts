import type { DiscoveryErrorResponse, DiscoverySearchParams } from '@/features/discovery/types';
import { DiscoveryServiceError, getDiscoveryEvent, searchDiscoveryEvents } from './service.js';

type ApiInput = {
  method?: string;
  pathname: string;
  searchParams?: URLSearchParams;
  body?: unknown;
};

type ApiResult = {
  status: number;
  body: unknown;
};

function errorResult(error: unknown): ApiResult {
  if (error instanceof DiscoveryServiceError) {
    const body: DiscoveryErrorResponse = {
      code: error.code,
      message: error.message,
      provider: 'Ticketmaster',
    };
    return { status: error.code === 'not_found' ? 404 : error.code === 'provider_not_configured' ? 503 : 502, body };
  }
  return {
    status: 500,
    body: {
      code: 'provider_error',
      message: 'WEIN could not complete that search right now.',
      provider: 'Ticketmaster',
    } satisfies DiscoveryErrorResponse,
  };
}

export async function handleDiscoveryRequest(input: ApiInput): Promise<ApiResult> {
  try {
    if (input.pathname === '/api/discovery/search' && input.method === 'POST') {
      if (!input.body || typeof input.body !== 'object') {
        return { status: 400, body: { code: 'invalid_search', message: 'Tell WEIN what you want to do first.' } };
      }
      const result = await searchDiscoveryEvents(input.body as DiscoverySearchParams);
      return { status: 200, body: result };
    }

    if (input.pathname.startsWith('/api/discovery/event/') && input.method === 'GET') {
      const providerId = decodeURIComponent(input.pathname.split('/').pop() || '');
      const event = await getDiscoveryEvent(providerId);
      return { status: 200, body: event };
    }

    return { status: 404, body: { code: 'not_found', message: 'Discovery endpoint not found.' } };
  } catch (error) {
    return errorResult(error);
  }
}
