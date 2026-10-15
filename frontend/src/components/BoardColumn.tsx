import { useDroppable } from "@dnd-kit/core";
import { Card, Column } from "../types";
import { CardItem } from "./CardItem";

interface Props {
  title: string;
  column: Column;
  cards: Card[];
  onRequestDelete: (card: Card) => void;
  isInvalidTarget: boolean;
}

export function BoardColumn({
  title,
  column,
  cards,
  onRequestDelete,
  isInvalidTarget,
}: Props) {
  // Desabilita o droppable quando o movimento é proibido, para que o drop não seja aceito.
  const { setNodeRef, isOver } = useDroppable({
    id: column,
    disabled: isInvalidTarget,
  });

  const showInvalid = isOver && isInvalidTarget;
  const showValid = isOver && !isInvalidTarget;

  const className = [
    "board-column",
    showInvalid ? "drag-over-invalid" : "",
    showValid ? "drag-over" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div ref={setNodeRef} className={className}>
      <h2>
        {title} <span className="count">({cards.length})</span>
      </h2>
      <div className="card-list">
        {cards.length === 0 && <p className="empty">Sem cards</p>}
        {cards.map((card) => (
          <CardItem key={card.id} card={card} onRequestDelete={onRequestDelete} />
        ))}
      </div>
    </div>
  );
}
