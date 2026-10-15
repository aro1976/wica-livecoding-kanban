import { FormEvent, useState } from "react";
import { useAuth } from "../../AuthContext";

interface Props {
  email: string;
  onConfirmed: () => void;
  onBackToLogin: () => void;
}

export function ConfirmSignUpForm({ email, onConfirmed, onBackToLogin }: Props) {
  const { confirmSignUp, resendConfirmationCode } = useAuth();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await confirmSignUp(email, code.trim());
      onConfirmed();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Código inválido.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    setError(null);
    setInfo(null);
    setResending(true);
    try {
      await resendConfirmationCode(email);
      setInfo("Novo código enviado para seu e-mail.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao reenviar código.");
    } finally {
      setResending(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <h2>Confirme seu e-mail</h2>
      <p className="auth-hint">
        Enviamos um código de verificação para <strong>{email}</strong>.
      </p>
      {error && <div className="error-banner">{error}</div>}
      {info && <div className="info-banner">{info}</div>}
      <label>
        Código de verificação
        <input
          type="text"
          required
          inputMode="numeric"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
      </label>
      <button type="submit" disabled={submitting}>
        {submitting ? "Confirmando..." : "Confirmar"}
      </button>
      <p className="auth-switch">
        Não recebeu?{" "}
        <button
          type="button"
          className="link-button"
          onClick={handleResend}
          disabled={resending}
        >
          {resending ? "Enviando..." : "Reenviar código"}
        </button>
      </p>
      <p className="auth-switch">
        <button type="button" className="link-button" onClick={onBackToLogin}>
          Voltar para login
        </button>
      </p>
    </form>
  );
}
