import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand,
  GoneException,
} from "@aws-sdk/client-apigatewaymanagementapi";
import { cardRepository } from "../repositories";

/**
 * Envia o estado atual do board (agrupado por coluna) para todas as
 * conexões WebSocket ativas, via API Gateway Management API.
 *
 * Em dev local (sem AWS, sem CONNECTIONS_TABLE_NAME/WEBSOCKET_API_ENDPOINT
 * configuradas) esta função é um no-op — não há WebSocket local nesta fase.
 */
export async function broadcastBoardUpdate(): Promise<void> {
  const tableName = process.env.CONNECTIONS_TABLE_NAME;
  const endpoint = process.env.WEBSOCKET_API_ENDPOINT;
  if (!tableName || !endpoint) {
    return;
  }

  const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
  const managementClient = new ApiGatewayManagementApiClient({ endpoint });

  const [all, connections] = await Promise.all([
    cardRepository.list(),
    docClient.send(new ScanCommand({ TableName: tableName })),
  ]);

  const board = {
    TODO: all.filter((c) => c.column === "TODO"),
    DOING: all.filter((c) => c.column === "DOING"),
    DONE: all.filter((c) => c.column === "DONE"),
  };

  const message = JSON.stringify({ type: "board_update", board });
  const connectionIds = (connections.Items ?? []).map(
    (item) => item.connectionId as string
  );

  await Promise.all(
    connectionIds.map(async (connectionId) => {
      try {
        await managementClient.send(
          new PostToConnectionCommand({
            ConnectionId: connectionId,
            Data: Buffer.from(message),
          })
        );
      } catch (err) {
        if (err instanceof GoneException) {
          // Conexão não existe mais (cliente desconectou sem $disconnect
          // disparar, ex: fechou a aba abruptamente) — remove da tabela.
          await docClient.send(
            new DeleteCommand({ TableName: tableName, Key: { connectionId } })
          );
        } else {
          console.error(`Falha ao enviar para conexão ${connectionId}:`, err);
        }
      }
    })
  );
}
