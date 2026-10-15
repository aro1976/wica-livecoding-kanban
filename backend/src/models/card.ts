export type Column = "TODO" | "DOING" | "DONE";

export interface Card {
  id: string;
  text: string;
  column: Column;
  createdBy: string;
  assignee: string | null;
  /** Posição de exibição dentro da coluna (menor = mais acima). Ajustável via reorder. */
  sortKey: number;
  createdAt: string;
  updatedAt: string;
}

// Ordem permitida de avanço: um card só pode ir para a próxima coluna da sequência.
export const COLUMN_ORDER: Column[] = ["TODO", "DOING", "DONE"];

export function nextColumn(current: Column): Column | null {
  const idx = COLUMN_ORDER.indexOf(current);
  if (idx === -1 || idx === COLUMN_ORDER.length - 1) return null;
  return COLUMN_ORDER[idx + 1];
}
