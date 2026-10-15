import { createApp } from "./app";

const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;

const app = createApp();

app.listen(PORT, () => {
  console.log(`Kanban backend (local, in-memory) rodando em http://localhost:${PORT}`);
});
