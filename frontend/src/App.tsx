import { useAuth } from "./AuthContext";
import { AuthScreen } from "./components/auth/AuthScreen";
import { KanbanBoard } from "./KanbanBoard";

export default function App() {
  const { session, loading } = useAuth();

  if (loading) {
    return <p className="auth-loading">Carregando...</p>;
  }

  if (!session) {
    return <AuthScreen />;
  }

  return <KanbanBoard />;
}
