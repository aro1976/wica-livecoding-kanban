import { Card, Column } from "../models/card";

/**
 * Contrato de persistência de cards, implementado tanto em memória (dev
 * local, sem AWS, ver inMemoryCardRepository.ts) quanto em DynamoDB
 * (produção, ver dynamoCardRepository.ts).
 */
export interface CardRepository {
  list(): Promise<Card[]>;
  getById(id: string): Promise<Card | undefined>;
  create(text: string, createdBy: string): Promise<Card>;
  /**
   * Move o card para a coluna informada. Quando o card entra em DOING,
   * implementações devem registrar quem passou a trabalhar nele (assignee),
   * se ainda não houver um.
   */
  updateColumn(id: string, column: Column, movedBy: string): Promise<Card | undefined>;
  /** Define a posição de exibição do card dentro da sua coluna atual. */
  reorder(id: string, sortKey: number): Promise<Card | undefined>;
  delete(id: string): Promise<boolean>;
}
