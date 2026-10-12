import { apiRequest } from './client';
import type { AnalyticsResponse } from './types';

/** Метрики якості «моделі» та важливість ознак. */
export function fetchAnalytics(signal?: AbortSignal): Promise<AnalyticsResponse> {
  return apiRequest<AnalyticsResponse>('/analytics/model', { signal });
}
