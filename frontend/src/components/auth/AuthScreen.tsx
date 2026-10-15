import { useState } from "react";
import { LoginForm } from "./LoginForm";
import { SignUpForm } from "./SignUpForm";
import { ConfirmSignUpForm } from "./ConfirmSignUpForm";

type Mode = "login" | "signup" | "confirm";

export function AuthScreen() {
  const [mode, setMode] = useState<Mode>("login");
  const [pendingEmail, setPendingEmail] = useState("");

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <h1 className="auth-title">Kanban Board</h1>
        {mode === "login" && (
          <LoginForm onSwitchToSignUp={() => setMode("signup")} />
        )}
        {mode === "signup" && (
          <SignUpForm
            onSwitchToLogin={() => setMode("login")}
            onSignedUp={(email) => {
              setPendingEmail(email);
              setMode("confirm");
            }}
          />
        )}
        {mode === "confirm" && (
          <ConfirmSignUpForm
            email={pendingEmail}
            onConfirmed={() => setMode("login")}
            onBackToLogin={() => setMode("login")}
          />
        )}
      </div>
    </div>
  );
}
