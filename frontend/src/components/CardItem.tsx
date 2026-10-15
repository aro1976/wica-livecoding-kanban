import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Card } from "../types";

interface Props {
  card: Card;
  onRequestDelete: (card: Card) => void;
}

export function CardItem({ card, onRequestDelete }: Props) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: card.id, data: { card } });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="card">
      <button
        className="card-delete-icon"
        onClick={() => onRequestDelete(card)}
        aria-label="Excluir card"
        title="Excluir card"
      >
        🗑️
      </button>
      <div className="card-drag-handle" {...listeners} {...attributes}>
        <p className="card-text">{card.text}</p>
      </div>
      <div className="card-meta">
        <span className="card-meta-item" title="Criado por">
          👤 {card.createdBy}
        </span>
        {card.assignee && (
          <span className="card-meta-item" title="Responsável">
            🛠️ {card.assignee}
          </span>
        )}
      </div>
    </div>
  );
}
