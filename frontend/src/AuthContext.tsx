import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import * as auth from "./auth";
import { AuthenticatedSession } from "./auth";

interface AuthContextValue {
  session: AuthenticatedSession | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  confirmSignUp: (email: string, code: string) => Promise<void>;
  resendConfirmationCode: (email: string) => Promise<void>;
  signOut: () => void;
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthenticatedSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    auth
      .getCurrentSession()
      .then(setSession)
      .finally(() => setLoading(false));
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const newSession = await auth.signIn(email, password);
    setSession(newSession);
  }, []);

  const signUp = useCallback(
    (email: string, password: string) => auth.signUp(email, password),
    []
  );

  const confirmSignUp = useCallback(
    (email: string, code: string) => auth.confirmSignUp(email, code),
    []
  );

  const resendConfirmationCode = useCallback(
    (email: string) => auth.resendConfirmationCode(email),
    []
  );

  const signOut = useCallback(() => {
    auth.signOut();
    setSession(null);
  }, []);

  const changePassword = useCallback(
    (oldPassword: string, newPassword: string) =>
      auth.changePassword(oldPassword, newPassword),
    []
  );

  return (
    <AuthContext.Provider
      value={{
        session,
        loading,
        signIn,
        signUp,
        confirmSignUp,
        resendConfirmationCode,
        signOut,
        changePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth deve ser usado dentro de um AuthProvider.");
  }
  return ctx;
}
