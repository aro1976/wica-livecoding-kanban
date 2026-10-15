import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
  UpdateCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";
import { v4 as uuid } from "uuid";
import { Card, Column } from "../models/card";
import { CardRepository } from "./types";

/**
 * Repositório DynamoDB para cards, usando a tabela single-table já
 * provisionada em infra/lib/data-stack.ts (appTable, PK/SK string).
 *
 * Esquema de chaves:
 *   PK = "CARD"          (partição única: todos os cards, poucos itens — ok para este volume)
 *   SK = "CARD#<id>"
 *
 * Isso permite listar todos os cards com uma única Query por PK.
 */
export class DynamoCardRepository implements CardRepository {
  private readonly client: DynamoDBDocumentClient;
  private readonly tableName: string;

  constructor(tableName: string) {
    this.tableName = tableName;
    this.client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
  }

  private static readonly PK = "CARD";

  private toItem(card: Card) {
    return {
      PK: DynamoCardRepository.PK,
      SK: `CARD#${card.id}`,
      ...card,
    };
  }

  private fromItem(item: Record<string, unknown>): Card {
    return {
      id: item.id as string,
      text: item.text as string,
      column: item.column as Column,
      createdBy: item.createdBy as string,
      assignee: (item.assignee as string | null) ?? null,
      sortKey: item.sortKey as number,
      createdAt: item.createdAt as string,
      updatedAt: item.updatedAt as string,
    };
  }

  async list(): Promise<Card[]> {
    const result = await this.client.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: "PK = :pk",
        ExpressionAttributeValues: { ":pk": DynamoCardRepository.PK },
      })
    );
    const cards = (result.Items ?? []).map((item) => this.fromItem(item));
    return cards.sort((a, b) => a.sortKey - b.sortKey);
  }

  async getById(id: string): Promise<Card | undefined> {
    const result = await this.client.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { PK: DynamoCardRepository.PK, SK: `CARD#${id}` },
      })
    );
    return result.Item ? this.fromItem(result.Item) : undefined;
  }

  async create(text: string, createdBy: string): Promise<Card> {
    const now = new Date().toISOString();
    // sortKey baseado no timestamp garante ordem de criação por padrão,
    // mesmo sem precisar ler o maior sortKey existente antes de inserir.
    const card: Card = {
      id: uuid(),
      text,
      column: "TODO",
      createdBy,
      assignee: null,
      sortKey: Date.now(),
      createdAt: now,
      updatedAt: now,
    };

    await this.client.send(
      new PutCommand({
        TableName: this.tableName,
        Item: this.toItem(card),
      })
    );
    return card;
  }

  async updateColumn(
    id: string,
    column: Column,
    movedBy: string
  ): Promise<Card | undefined> {
    const existing = await this.getById(id);
    if (!existing) return undefined;

    const assignee =
      column === "DOING" && !existing.assignee ? movedBy : existing.assignee;

    const result = await this.client.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: { PK: DynamoCardRepository.PK, SK: `CARD#${id}` },
        UpdateExpression:
          "SET #column = :column, assignee = :assignee, updatedAt = :updatedAt",
        ExpressionAttributeNames: { "#column": "column" },
        ExpressionAttributeValues: {
          ":column": column,
          ":assignee": assignee,
          ":updatedAt": new Date().toISOString(),
        },
        ReturnValues: "ALL_NEW",
      })
    );
    return result.Attributes ? this.fromItem(result.Attributes) : undefined;
  }

  async reorder(id: string, sortKey: number): Promise<Card | undefined> {
    const existing = await this.getById(id);
    if (!existing) return undefined;

    const result = await this.client.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: { PK: DynamoCardRepository.PK, SK: `CARD#${id}` },
        UpdateExpression: "SET sortKey = :sortKey, updatedAt = :updatedAt",
        ExpressionAttributeValues: {
          ":sortKey": sortKey,
          ":updatedAt": new Date().toISOString(),
        },
        ReturnValues: "ALL_NEW",
      })
    );
    return result.Attributes ? this.fromItem(result.Attributes) : undefined;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.client.send(
      new DeleteCommand({
        TableName: this.tableName,
        Key: { PK: DynamoCardRepository.PK, SK: `CARD#${id}` },
        ReturnValues: "ALL_OLD",
      })
    );
    return result.Attributes !== undefined;
  }
}
