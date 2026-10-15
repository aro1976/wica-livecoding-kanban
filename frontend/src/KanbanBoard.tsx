import { useEffect, useState } from "react";
import { DndContext, DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import { api } from "./api";
import { BoardState, Card, Column } from "./types";
import { useAuth } from "./AuthContext";
import { useBoardWebSocket } from "./useBoardWebSocket";
import { BoardColumn } from "./components/BoardColumn";
import { NewCardForm } from "./components/NewCardForm";
import { ConfirmDialog } from "./components/ConfirmDialog";
import { ChangePasswordForm } from "./components/auth/ChangePasswordForm";
import { UserMenu } from "./components/UserMenu";

const EMPTY_BOARD: BoardState = { TODO: [], DOING: [], DONE: [] };
const COLUMN_ORDER: Column[] = ["TODO", "DOING", "DONE"];

// Um card só pode avançar exatamente uma coluna adiante (TODO -> DOING -> DONE), sem saltar nem voltar.
function isValidMove(from: Column, to: Column): boolean {
  const currentIndex = COLUMN_ORDER.indexOf(from);
  const targetIndex = COLUMN_ORDER.indexOf(to);
  return targetIndex === currentIndex + 1;
}

export function KanbanBoard() {
  const { session } = useAuth();
  const [board, setBoard] = useState<BoardState>(EMPTY_BOARD);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [cardToDelete, setCardToDelete] = useState<Card | null>(null);
  const [draggingCard, setDraggingCard] = useState<Card | null>(null);
  const [showChangePassword, setShowChangePassword] = useState(false);

  async function loadBoard() {
    if (!session) return;
    try {
      const data = await api.getBoard(session.idToken);
      setBoard(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBoard();
  }, [session]);

  // Sincronização em tempo real: qualquer usuário que criar/mover/excluir um
  // card dispara um broadcast que atualiza o board de todos os clientes
  // conectados, sem precisar recarregar a página.
  useBoardWebSocket(setBoard);

  async function handleCreate(text: string) {
    if (!session) return;
    try {
      await api.createCard(text, session.idToken);
      await loadBoard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar card");
    }
  }

  function handleDragStart(event: DragStartEvent) {
    const card: Card | undefined = event.active.data.current?.card;
    setDraggingCard(card ?? null);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setDraggingCard(null);
    if (!over || !session) return;

    const card: Card | undefined = active.data.current?.card;
    const targetColumn = over.id as Column;
    if (!card || card.column === targetColumn) return;

    if (!isValidMove(card.column, targetColumn)) {
      setError("Cards só podem avançar para a próxima coluna, em sequência.");
      return;
    }

    try {
      await api.moveCard(card.id, session.idToken);
      await loadBoard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao mover card");
    }
  }

  async function confirmDelete() {
    if (!cardToDelete || !session) return;
    try {
      await api.deleteCard(cardToDelete.id, session.idToken);
      await loadBoard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao excluir card");
    } finally {
      setCardToDelete(null);
    }
  }

  return (
    <div className="app">
      <header>
        <h1>Kanban Board (local)</h1>
        <div className="header-right">
          <NewCardForm onCreate={handleCreate} />
          <UserMenu onChangePassword={() => setShowChangePassword(true)} />
        </div>
      </header>

      {error && <div className="error-banner">{error}</div>}
      {loading ? (
        <p>Carregando...</p>
      ) : (
        <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <main className="board">
            {COLUMN_ORDER.map((column) => (
              <BoardColumn
                key={column}
                title={column}
                column={column}
                cards={board[column]}
                onRequestDelete={setCardToDelete}
                isInvalidTarget={
                  draggingCard !== null &&
                  draggingCard.column !== column &&
                  !isValidMove(draggingCard.column, column)
                }
              />
            ))}
          </main>
        </DndContext>
      )}

      {cardToDelete && (
        <ConfirmDialog
          message={`Tem certeza que deseja excluir o card "${cardToDelete.text}"?`}
          onConfirm={confirmDelete}
          onCancel={() => setCardToDelete(null)}
        />
      )}

      {showChangePassword && (
        <ChangePasswordForm onClose={() => setShowChangePassword(false)} />
      )}
    </div>
  );
}
