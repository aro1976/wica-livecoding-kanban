import { FormEvent, useState } from "react";

interface Props {
  onCreate: (text: string) => void;
}

export function NewCardForm({ onCreate }: Props) {
  const [text, setText] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    onCreate(trimmed);
    setText("");
  }

  return (
    <form className="new-card-form" onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Nova tarefa..."
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <button type="submit">Adicionar</button>
    </form>
  );
}
