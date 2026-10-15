import { CardRepository } from "./types";
import { cardRepository as inMemoryCardRepository } from "./inMemoryCardRepository";
import { DynamoCardRepository } from "./dynamoCardRepository";

/**
 * Seleciona a implementação de persistência conforme o ambiente:
 * - APP_TABLE_NAME definida (Lambda, ver infra/lib/api-stack.ts) -> DynamoDB.
 * - Caso contrário (dev local, `npm run dev`) -> in-memory.
 */
function createCardRepository(): CardRepository {
  const tableName = process.env.APP_TABLE_NAME;
  if (tableName) {
    return new DynamoCardRepository(tableName);
  }
  return inMemoryCardRepository;
}

export const cardRepository: CardRepository = createCardRepository();
