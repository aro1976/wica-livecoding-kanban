import type {
  APIGatewayProxyWebsocketHandlerV2,
  APIGatewayProxyResultV2,
} from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";

/**
 * Handlers Lambda para as rotas $connect/$disconnect do API Gateway
 * WebSocket (ver infra/lib/api-stack.ts). Mantêm a lista de conexões
 * ativas na ConnectionsTable, usada por src/websocket/broadcast.ts para
 * enviar atualizações do board a todos os clientes conectados.
 */

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const tableName = process.env.CONNECTIONS_TABLE_NAME!;

// TTL de 2 horas: limpa conexões obsoletas que não dispararam $disconnect
// (ex: cliente perdeu rede abruptamente), ver connectionsTable na data-stack.
const CONNECTION_TTL_SECONDS = 2 * 60 * 60;

export const connectHandler: APIGatewayProxyWebsocketHandlerV2 = async (
  event
): Promise<APIGatewayProxyResultV2> => {
  const connectionId = event.requestContext.connectionId;

  await client.send(
    new PutCommand({
      TableName: tableName,
      Item: {
        connectionId,
        connectedAt: new Date().toISOString(),
        ttl: Math.floor(Date.now() / 1000) + CONNECTION_TTL_SECONDS,
      },
    })
  );

  return { statusCode: 200, body: "Connected." };
};

export const disconnectHandler: APIGatewayProxyWebsocketHandlerV2 = async (
  event
): Promise<APIGatewayProxyResultV2> => {
  const connectionId = event.requestContext.connectionId;

  await client.send(
    new DeleteCommand({
      TableName: tableName,
      Key: { connectionId },
    })
  );

  return { statusCode: 200, body: "Disconnected." };
};
