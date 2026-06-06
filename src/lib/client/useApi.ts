import z from 'zod';
import { TApiRoute } from './api-routes';

/**
 * Execute an API call using a typed route definition with zod validation.
 *
 * Usage:
 *   await useApi(apiRoutes.tasks.detail, { params: [taskId], body: { status: 'completed' } });
 *
 * @returns Validated response body
 */
interface UseApiOptions {
  params?: string[];
  query?: Record<string, string>;
  body?: unknown;
  init?: RequestInit;
}

type RouteResponse<R extends TApiRoute> = z.infer<
  ReturnType<R>['responseSchema']
>;

export async function useApi<R extends TApiRoute>(
  route: R,
  { params = [], query, body, init }: UseApiOptions,
): Promise<RouteResponse<R> | undefined> {
  // 1. Build route config by invoking route function with params
  const { url, method = 'GET', bodySchema, responseSchema } = route(...params);

  // 2. Build query string
  const qs = query ? new URLSearchParams(query).toString() : '';
  const fullUrl = qs ? `${url}?${qs}` : url;

  // 3. Build request options
  const headers: Record<string, string> = {};
  let bodyToSend: BodyInit | undefined;

  if (body !== undefined) {
    if (body instanceof FormData) {
      bodyToSend = body;
    } else {
      headers['Content-Type'] = 'application/json';
      // Validate body against route's bodySchema if present
      if (bodySchema) {
        bodySchema.parse(body); // throws on invalid
      }
      bodyToSend = JSON.stringify(body);
    }
  }

  const options: RequestInit = {
    method,
    headers,
    body: bodyToSend,
    ...init,
  };

  // 4. Execute request
  const res = await fetch(fullUrl, options);

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    const message =
      typeof errorBody?.error === 'string' ? errorBody.error : res.statusText;
    throw new Error(`API ${res.status}: ${message}`);
  }

  // 5. Handle 204 No Content
  if (res.status === 204) {
    return undefined;
  }

  // 6. Parse and validate response
  const json = await res.json();
  const validated = responseSchema.parse(json);
  return validated as RouteResponse<R>;
}
