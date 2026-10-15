import { FormEvent, useState } from "react";
import { useAuth } from "../../AuthContext";

interface Props {
  onSwitchToSignUp: () => void;
}

export function LoginForm({ onSwitchToSignUp }: Props) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao entrar.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <h2>Entrar</h2>
      {error && <div className="error-banner">{error}</div>}
      <label>
        E-mail
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      <label>
        Senha
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      <button type="submit" disabled={submitting}>
        {submitting ? "Entrando..." : "Entrar"}
      </button>
      <p className="auth-switch">
        Não tem conta?{" "}
        <button type="button" className="link-button" onClick={onSwitchToSignUp}>
          Cadastre-se
        </button>
      </p>
    </form>
  );
}
