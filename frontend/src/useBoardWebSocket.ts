import { useEffect, useRef } from "react";
import { BoardState } from "./types";

interface BoardUpdateMessage {
  type: "board_update";
  board: BoardState;
}

function isBoardUpdateMessage(data: unknown): data is BoardUpdateMessage {
  return (
    typeof data === "object" &&
    data !== null &&
    (data as { type?: unknown }).type === "board_update"
  );
}

/**
 * Conecta ao API Gateway WebSocket (ver infra/lib/api-stack.ts) e invoca
 * onBoardUpdate sempre que o backend envia uma atualização do board (após
 * qualquer criação/movimentação/exclusão de card por qualquer usuário).
 *
 * Reconecta automaticamente com backoff simples caso a conexão caia.
 * É um no-op se VITE_WS_URL não estiver configurada (dev local sem AWS).
 */
export function useBoardWebSocket(onBoardUpdate: (board: BoardState) => void) {
  const onBoardUpdateRef = useRef(onBoardUpdate);
  onBoardUpdateRef.current = onBoardUpdate;

  useEffect(() => {
    const wsUrl: string | undefined = import.meta.env.VITE_WS_URL;
    if (!wsUrl) return;
    const url: string = wsUrl;

    let socket: WebSocket | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    let closedByCleanup = false;

    function connect() {
      socket = new WebSocket(url);

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (isBoardUpdateMessage(data)) {
            onBoardUpdateRef.current(data.board);
          }
        } catch {
          // Ignora mensagens que não sejam JSON válido.
        }
      };

      socket.onclose = () => {
        if (closedByCleanup) return;
        reconnectTimeout = setTimeout(connect, 3000);
      };

      socket.onerror = () => {
        socket?.close();
      };
    }

    connect();

    return () => {
      closedByCleanup = true;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      socket?.close();
    };
  }, []);
}
