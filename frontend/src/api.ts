import { BoardState, Card } from "./types";

// Em dev local, usa o proxy /api do Vite (ver vite.config.ts) para o backend
// Express em localhost:3001. Em produção, aponta direto para o API Gateway
// REST (ver infra/lib/api-stack.ts), sem barra final.
const BASE_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, "") ?? "/api";

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Erro na requisição (status ${res.status})`);
  }
  if (res.status === 204) return undefined as unknown as T;
  return res.json();
}

export const api = {
  async getBoard(idToken: string): Promise<BoardState> {
    const res = await fetch(`${BASE_URL}/cards`, {
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
    });
    return handleResponse<BoardState>(res);
  },

  async createCard(text: string, idToken: string): Promise<Card> {
    const res = await fetch(`${BASE_URL}/cards`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ text }),
    });
    return handleResponse<Card>(res);
  },

  async moveCard(id: string, idToken: string): Promise<Card> {
    const res = await fetch(`${BASE_URL}/cards/${id}/move`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
    });
    return handleResponse<Card>(res);
  },

  async reorderCard(id: string, sortKey: number, idToken: string): Promise<Card> {
    const res = await fetch(`${BASE_URL}/cards/${id}/reorder`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ sortKey }),
    });
    return handleResponse<Card>(res);
  },

  async deleteCard(id: string, idToken: string): Promise<void> {
    const res = await fetch(`${BASE_URL}/cards/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
    });
    return handleResponse<void>(res);
  },
};
