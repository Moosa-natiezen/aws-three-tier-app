/**
 * Bearer-token REST client for the API Gateway endpoints (PRD §3 step 3:
 * authenticated HTTPS payload with token in the Authorization header).
 */
import { API_URL, getBearerToken } from "./auth";

export interface Item {
  id: string;
  title: string;
  description: string | null;
  completed: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ItemInput {
  title: string;
  description?: string | null;
  completed?: boolean;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly errors?: string[],
  ) {
    super(message);
  }
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const token = getBearerToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });

  if (res.status === 204) return undefined as T;

  const payload = (await res.json().catch(() => ({}))) as Record<string, any>;
  if (!res.ok) {
    throw new ApiError(
      res.status,
      (payload.message as string) ?? `Request failed (${res.status})`,
      payload.errors as string[] | undefined,
    );
  }
  return payload as T;
}

export const itemsApi = {
  list: () => apiFetch<{ items: Item[] }>("/items"),
  create: (body: ItemInput) =>
    apiFetch<{ item: Item }>("/items", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  update: (id: string, body: Partial<ItemInput>) =>
    apiFetch<{ item: Item }>(`/items/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  remove: (id: string) => apiFetch<void>(`/items/${id}`, { method: "DELETE" }),
};
