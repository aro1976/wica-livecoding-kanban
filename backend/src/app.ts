import express from "express";
import cors from "cors";
import { cardsRouter } from "./routes/cards";

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get("/health", (_req, res) => res.json({ status: "ok" }));
  app.use("/cards", cardsRouter);

  return app;
}
