import { Router, Request, Response } from "express";
import { cardRepository } from "../repositories";
import { nextColumn, Column } from "../models/card";
import { requireUser, AuthenticatedRequest } from "../middleware/requireUser";
import { broadcastBoardUpdate } from "../websocket/broadcast";

export const cardsRouter = Router();

// GET /cards - lista todos os cards, agrupados por coluna
cardsRouter.get("/", requireUser, async (_req: Request, res: Response) => {
  const all = await cardRepository.list();
  const grouped: Record<Column, typeof all> = {
    TODO: all.filter((c) => c.column === "TODO"),
    DOING: all.filter((c) => c.column === "DOING"),
    DONE: all.filter((c) => c.column === "DONE"),
  };
  res.json(grouped);
});

// POST /cards - cria um novo card na coluna TODO, atribuído ao usuário autenticado
cardsRouter.post("/", requireUser, async (req: Request, res: Response) => {
  const { text } = req.body ?? {};
  if (typeof text !== "string" || text.trim().length === 0) {
    return res.status(400).json({ error: "Campo 'text' é obrigatório." });
  }
  const { userEmail } = req as AuthenticatedRequest;
  const card = await cardRepository.create(text.trim(), userEmail);
  res.status(201).json(card);
  await broadcastBoardUpdate();
});

// PATCH /cards/:id/move - move o card para a próxima coluna (TODO -> DOING -> DONE),
// registrando o usuário autenticado como responsável (assignee) ao entrar em DOING.
cardsRouter.patch("/:id/move", requireUser, async (req: Request, res: Response) => {
  const card = await cardRepository.getById(req.params.id);
  if (!card) {
    return res.status(404).json({ error: "Card não encontrado." });
  }
  const next = nextColumn(card.column);
  if (!next) {
    return res.status(400).json({ error: "Card já está em DONE, não há próxima coluna." });
  }
  const { userEmail } = req as AuthenticatedRequest;
  const updated = await cardRepository.updateColumn(card.id, next, userEmail);
  res.json(updated);
  await broadcastBoardUpdate();
});

// PATCH /cards/:id/reorder - define a posição de exibição do card dentro da coluna
cardsRouter.patch("/:id/reorder", requireUser, async (req: Request, res: Response) => {
  const { sortKey } = req.body ?? {};
  if (typeof sortKey !== "number") {
    return res.status(400).json({ error: "Campo 'sortKey' (número) é obrigatório." });
  }
  const updated = await cardRepository.reorder(req.params.id, sortKey);
  if (!updated) {
    return res.status(404).json({ error: "Card não encontrado." });
  }
  res.json(updated);
  await broadcastBoardUpdate();
});

// DELETE /cards/:id - remove um card
cardsRouter.delete("/:id", requireUser, async (req: Request, res: Response) => {
  const existed = await cardRepository.delete(req.params.id);
  if (!existed) {
    return res.status(404).json({ error: "Card não encontrado." });
  }
  res.status(204).send();
  await broadcastBoardUpdate();
});
