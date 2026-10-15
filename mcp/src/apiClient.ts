import { AuthClient } from "./auth.js";

export type Column = "TODO" | "DOING" | "DONE";

export interface Card {
  id: string;
  text: string;
  column: Column;
  createdBy: string;
  assignee: string | null;
  sortKey: number;
  createdAt: string;
  updatedAt: string;
}

export type BoardState = Record<Column, Card[]>;

export class ApiClient {
  constructor(private readonly baseUrl: string, private readonly auth: AuthClient) {}

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const idToken = await this.auth.getIdToken();
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        ...init.headers,
        Authorization: `Bearer ${idToken}`,
      },
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(
        (body as { error?: string }).error ?? `Erro na requisição (status ${res.status})`
      );
    }
    if (res.status === 204) return undefined as unknown as T;
    return res.json() as Promise<T>;
  }

  getBoard(): Promise<BoardState> {
    return this.request<BoardState>("/cards");
  }

  createCard(text: string): Promise<Card> {
    return this.request<Card>("/cards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
  }

  moveCard(id: string): Promise<Card> {
    return this.request<Card>(`/cards/${id}/move`, { method: "PATCH" });
  }

  reorderCard(id: string, sortKey: number): Promise<Card> {
    return this.request<Card>(`/cards/${id}/reorder`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sortKey }),
    });
  }

  deleteCard(id: string): Promise<void> {
    return this.request<void>(`/cards/${id}`, { method: "DELETE" });
  }
}
