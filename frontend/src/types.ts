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
