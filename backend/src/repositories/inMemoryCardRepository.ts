import { v4 as uuid } from "uuid";
import { Card, Column } from "../models/card";
import { CardRepository } from "./types";

// Repositório in-memory, usado em dev local (sem AWS). Em produção (infra/)
// isso é substituído por DynamoCardRepository.
export class InMemoryCardRepository implements CardRepository {
  private cards = new Map<string, Card>();
  private nextSortKey = 0;

  async list(): Promise<Card[]> {
    return Array.from(this.cards.values()).sort((a, b) => a.sortKey - b.sortKey);
  }

  async getById(id: string): Promise<Card | undefined> {
    return this.cards.get(id);
  }

  async create(text: string, createdBy: string): Promise<Card> {
    const now = new Date().toISOString();
    const card: Card = {
      id: uuid(),
      text,
      column: "TODO",
      createdBy,
      assignee: null,
      sortKey: this.nextSortKey++,
      createdAt: now,
      updatedAt: now,
    };
    this.cards.set(card.id, card);
    return card;
  }

  async updateColumn(
    id: string,
    column: Column,
    movedBy: string
  ): Promise<Card | undefined> {
    const card = this.cards.get(id);
    if (!card) return undefined;
    card.column = column;
    if (column === "DOING" && !card.assignee) {
      card.assignee = movedBy;
    }
    card.updatedAt = new Date().toISOString();
    this.cards.set(id, card);
    return card;
  }

  async reorder(id: string, sortKey: number): Promise<Card | undefined> {
    const card = this.cards.get(id);
    if (!card) return undefined;
    card.sortKey = sortKey;
    card.updatedAt = new Date().toISOString();
    this.cards.set(id, card);
    return card;
  }

  async delete(id: string): Promise<boolean> {
    return this.cards.delete(id);
  }

  clear(): void {
    this.cards.clear();
  }
}

export const cardRepository = new InMemoryCardRepository();
