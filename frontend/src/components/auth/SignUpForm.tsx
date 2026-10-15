import { FormEvent, useState } from "react";
import { useAuth } from "../../AuthContext";

interface Props {
  onSwitchToLogin: () => void;
  onSignedUp: (email: string) => void;
}

export function SignUpForm({ onSwitchToLogin, onSignedUp }: Props) {
  const { signUp } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    setSubmitting(true);
    try {
      await signUp(email.trim(), password);
      onSignedUp(email.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao cadastrar.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <h2>Criar conta</h2>
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
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      <label>
        Confirmar senha
        <input
          type="password"
          required
          minLength={8}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
      </label>
      <p className="auth-hint">
        Mínimo 8 caracteres, com letra maiúscula, minúscula e número.
      </p>
      <button type="submit" disabled={submitting}>
        {submitting ? "Cadastrando..." : "Cadastrar"}
      </button>
      <p className="auth-switch">
        Já tem conta?{" "}
        <button type="button" className="link-button" onClick={onSwitchToLogin}>
          Entrar
        </button>
      </p>
    </form>
  );
}
