import {
  CognitoUser,
  CognitoUserPool,
  CognitoUserSession,
  AuthenticationDetails,
} from "amazon-cognito-identity-js";

const userPoolId = import.meta.env.VITE_USER_POOL_ID;
const clientId = import.meta.env.VITE_USER_POOL_CLIENT_ID;

if (!userPoolId || !clientId) {
  throw new Error(
    "Variáveis VITE_USER_POOL_ID e VITE_USER_POOL_CLIENT_ID são obrigatórias (veja frontend/.env.example)."
  );
}

const userPool = new CognitoUserPool({
  UserPoolId: userPoolId,
  ClientId: clientId,
});

export interface AuthenticatedSession {
  email: string;
  idToken: string;
  accessToken: string;
}

function sessionToAuthenticatedSession(
  session: CognitoUserSession
): AuthenticatedSession {
  // O "Username" interno do Cognito é um UUID (sub), não o e-mail — mesmo com
  // signInAliases por e-mail. O e-mail real vem do claim "email" do ID token.
  const email = session.getIdToken().payload.email as string;
  return {
    email,
    idToken: session.getIdToken().getJwtToken(),
    accessToken: session.getAccessToken().getJwtToken(),
  };
}

/** Cadastra um novo usuário. O Cognito envia um código de verificação por e-mail. */
export function signUp(email: string, password: string): Promise<void> {
  return new Promise((resolve, reject) => {
    userPool.signUp(email, password, [], [], (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

/** Confirma o cadastro com o código recebido por e-mail. */
export function confirmSignUp(email: string, code: string): Promise<void> {
  const user = new CognitoUser({ Username: email, Pool: userPool });
  return new Promise((resolve, reject) => {
    user.confirmRegistration(code, true, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

/** Reenvia o código de confirmação de cadastro. */
export function resendConfirmationCode(email: string): Promise<void> {
  const user = new CognitoUser({ Username: email, Pool: userPool });
  return new Promise((resolve, reject) => {
    user.resendConfirmationCode((err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

/** Autentica o usuário e retorna a sessão (tokens). */
export function signIn(
  email: string,
  password: string
): Promise<AuthenticatedSession> {
  const user = new CognitoUser({ Username: email, Pool: userPool });
  const authDetails = new AuthenticationDetails({
    Username: email,
    Password: password,
  });

  return new Promise((resolve, reject) => {
    user.authenticateUser(authDetails, {
      onSuccess: (session) => {
        resolve(sessionToAuthenticatedSession(session));
      },
      onFailure: (err) => reject(err),
    });
  });
}

/** Desconecta o usuário atual (limpa tokens armazenados localmente). */
export function signOut(): void {
  const user = userPool.getCurrentUser();
  user?.signOut();
}

/**
 * Troca a senha do usuário autenticado. Requer a senha atual.
 */
export function changePassword(
  oldPassword: string,
  newPassword: string
): Promise<void> {
  const user = userPool.getCurrentUser();
  if (!user) {
    return Promise.reject(new Error("Nenhum usuário autenticado."));
  }

  return new Promise((resolve, reject) => {
    user.getSession((sessionErr: Error | null) => {
      if (sessionErr) return reject(sessionErr);
      user.changePassword(oldPassword, newPassword, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  });
}

/**
 * Recupera a sessão atual (se houver um usuário logado com tokens válidos
 * ou renováveis via refresh token). Usado para restaurar a sessão ao
 * recarregar a página.
 */
export function getCurrentSession(): Promise<AuthenticatedSession | null> {
  const user = userPool.getCurrentUser();
  if (!user) return Promise.resolve(null);

  return new Promise((resolve, reject) => {
    user.getSession(
      (err: Error | null, session: CognitoUserSession | null) => {
        if (err || !session || !session.isValid()) {
          return resolve(null);
        }
        resolve(sessionToAuthenticatedSession(session));
      }
    );
  });
}
