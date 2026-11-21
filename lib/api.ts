/** Prefer same-origin `/api/v1` (Next rewrite → backend) so mobile LAN works. */
function resolveApiBase(): string {
  const raw = (process.env.NEXT_PUBLIC_API_URL || "/api/v1").replace(/\/$/, "") || "/api/v1"
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw
  // Server-side fetch needs an absolute URL
  if (typeof window === "undefined") {
    const port = process.env.PORT || "3000"
    return `http://127.0.0.1:${port}${raw.startsWith("/") ? raw : `/${raw}`}`
  }
  return raw.startsWith("/") ? raw : `/${raw}`
}
const BASE_URL = resolveApiBase();

const LEGACY_ACCESS_KEY = "scosha:accessToken";
const LEGACY_REFRESH_KEY = "scosha:refreshToken";
const GUEST_SESSION_KEY = "scosha:guestSessionId";
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

export type ApiSuccess<T> = {
  success: boolean;
  message: string;
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
    [key: string]: unknown;
  };
};

/** Drop tokens left by the pre-cookie session. Auth now lives only in HttpOnly cookies. */
export function clearTokens() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(LEGACY_ACCESS_KEY);
    window.localStorage.removeItem(LEGACY_REFRESH_KEY);
  } catch {
    /* storage unavailable */
  }
}

/** Stable per-browser guest id for private anonymous carts (cookie + header). */
export function getOrCreateGuestSessionId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    let id = window.localStorage.getItem(GUEST_SESSION_KEY);
    if (!id || !UUID_RE.test(id)) {
      id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}-aaaa-bbbb-cccccccccccc`.replace(
              /[^0-9a-f-]/gi,
              "a",
            );
      // Ensure UUID shape if crypto.randomUUID unavailable
      if (!UUID_RE.test(id)) {
        id = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
          const r = (Math.random() * 16) | 0;
          const v = c === "x" ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        });
      }
      window.localStorage.setItem(GUEST_SESSION_KEY, id);
    }
    return id;
  } catch {
    return null;
  }
}

/** Rotate guest id after login merge so a new anonymous cart cannot reuse the old one. */
export function rotateGuestSessionId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    window.localStorage.removeItem(GUEST_SESSION_KEY);
  } catch {
    /* ignore */
  }
  return getOrCreateGuestSessionId();
}

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  skipAuth?: boolean;
  _retried?: boolean;
};

async function parseJson(res: Response) {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

let refreshPromise: Promise<boolean> | null = null;

function isSessionExchange(path: string) {
  const pathOnly = path.split("?")[0];
  return pathOnly.endsWith("/auth/refresh") || pathOnly.endsWith("/auth/login") || pathOnly.endsWith("/auth/logout");
}

async function tryRefresh(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const res = await fetch(`${BASE_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: "{}",
      });
      if (!res.ok) {
        clearTokens();
        return false;
      }
      return true;
    } catch {
      clearTokens();
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestOptions = {},
): Promise<ApiSuccess<T>> {
  const { body, skipAuth, _retried, headers: initHeaders, ...rest } = options;
  const headers = new Headers(initHeaders);
  headers.set("Accept", "application/json");

  if (body !== undefined && !(body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  // Always send guest id when present so login merge can find the anonymous cart.
  // Authenticated cart routes ignore it and key only by userId.
  const guestId = getOrCreateGuestSessionId();
  if (guestId) headers.set("X-Guest-Session-Id", guestId);

  const url = path.startsWith("http")
    ? path
    : `${BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`;

  const init: RequestInit = {
    ...rest,
    credentials: "include",
    headers,
  };
  if (body !== undefined) {
    init.body = body instanceof FormData ? body : JSON.stringify(body);
  }

  const res = await fetch(url, init);

  if (res.status === 401 && !_retried && !skipAuth && !isSessionExchange(path)) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      return apiFetch<T>(path, { ...options, _retried: true });
    }
  }

  const json = await parseJson(res);

  if (!res.ok) {
    const message =
      (json && typeof json === "object" && "message" in json
        ? String((json as { message: string }).message)
        : null) ||
      res.statusText ||
      "Request failed";
    throw new ApiError(message, res.status, json);
  }

  return (json ?? { success: true, message: "OK", data: null }) as ApiSuccess<T>;
}

export const api = {
  get: <T = unknown>(path: string, options?: RequestOptions) =>
    apiFetch<T>(path, { ...options, method: "GET" }),
  post: <T = unknown>(path: string, body?: unknown, options?: RequestOptions) =>
    apiFetch<T>(path, { ...options, method: "POST", body }),
  put: <T = unknown>(path: string, body?: unknown, options?: RequestOptions) =>
    apiFetch<T>(path, { ...options, method: "PUT", body }),
  patch: <T = unknown>(path: string, body?: unknown, options?: RequestOptions) =>
    apiFetch<T>(path, { ...options, method: "PATCH", body }),
  del: <T = unknown>(path: string, options?: RequestOptions) =>
    apiFetch<T>(path, { ...options, method: "DELETE" }),
};

export function toQuery(params?: Record<string, unknown>): string {
  if (!params) return "";
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) {
      value.forEach((v) => sp.append(key, String(v)));
    } else {
      sp.set(key, String(value));
    }
  }
  const q = sp.toString();
  return q ? `?${q}` : "";
}

export { BASE_URL as API_BASE_URL };
