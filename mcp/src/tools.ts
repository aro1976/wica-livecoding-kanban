import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ApiClient, BoardState } from "./apiClient.js";

function formatBoard(board: BoardState): string {
  const columns: Array<keyof BoardState> = ["TODO", "DOING", "DONE"];
  return columns
    .map((column) => {
      const cards = board[column];
      if (cards.length === 0) {
        return `${column} (0):\n  (vazio)`;
      }
      const lines = cards
        .map(
          (card) =>
            `  - [${card.id}] "${card.text}" (criado por ${card.createdBy}${
              card.assignee ? `, responsável: ${card.assignee}` : ""
            })`
        )
        .join("\n");
      return `${column} (${cards.length}):\n${lines}`;
    })
    .join("\n\n");
}

export function registerTools(server: McpServer, api: ApiClient): void {
  server.tool(
    "list_cards",
    "Lista todos os cards do kanban, agrupados por coluna (TODO, DOING, DONE), incluindo quem criou e quem está responsável por cada um.",
    async () => {
      const board = await api.getBoard();
      return {
        content: [{ type: "text", text: formatBoard(board) }],
      };
    }
  );

  server.tool(
    "create_card",
    "Cria um novo card na coluna TODO do kanban.",
    { text: z.string().min(1).describe("Texto/descrição da tarefa do card") },
    async ({ text }) => {
      const card = await api.createCard(text);
      return {
        content: [
          { type: "text", text: `Card criado: [${card.id}] "${card.text}" em TODO.` },
        ],
      };
    }
  );

  server.tool(
    "move_card",
    "Move um card para a próxima coluna da sequência (TODO -> DOING -> DONE). Não é possível pular etapas ou voltar. Ao entrar em DOING, o usuário de serviço do MCP é registrado como responsável, se ainda não houver um.",
    { cardId: z.string().min(1).describe("ID do card a mover") },
    async ({ cardId }) => {
      const card = await api.moveCard(cardId);
      return {
        content: [
          {
            type: "text",
            text: `Card [${card.id}] "${card.text}" movido para ${card.column}.`,
          },
        ],
      };
    }
  );

  server.tool(
    "reorder_card",
    "Define a posição de exibição de um card dentro da sua coluna atual (menor sortKey = mais acima).",
    {
      cardId: z.string().min(1).describe("ID do card a reordenar"),
      sortKey: z.number().describe("Nova posição de ordenação do card"),
    },
    async ({ cardId, sortKey }) => {
      const card = await api.reorderCard(cardId, sortKey);
      return {
        content: [
          {
            type: "text",
            text: `Card [${card.id}] "${card.text}" reordenado (sortKey=${card.sortKey}) em ${card.column}.`,
          },
        ],
      };
    }
  );

  server.tool(
    "delete_card",
    "Remove permanentemente um card do kanban.",
    { cardId: z.string().min(1).describe("ID do card a excluir") },
    async ({ cardId }) => {
      await api.deleteCard(cardId);
      return {
        content: [{ type: "text", text: `Card [${cardId}] excluído.` }],
      };
    }
  );
}
