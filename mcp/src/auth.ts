import {
  CognitoUser,
  CognitoUserPool,
  CognitoUserSession,
  AuthenticationDetails,
} from "amazon-cognito-identity-js";

export interface AuthConfig {
  userPoolId: string;
  clientId: string;
  username: string;
  password: string;
}

/**
 * Mantém uma sessão autenticada no Cognito para o usuário de serviço do
 * MCP, renovando o token automaticamente quando expira (idToken do Cognito
 * dura 1h, ver infra/lib/cognito-stack.ts).
 */
export class AuthClient {
  private readonly userPool: CognitoUserPool;
  private readonly username: string;
  private readonly password: string;
  private cachedSession: CognitoUserSession | null = null;

  constructor(config: AuthConfig) {
    this.userPool = new CognitoUserPool({
      UserPoolId: config.userPoolId,
      ClientId: config.clientId,
    });
    this.username = config.username;
    this.password = config.password;
  }

  private signIn(): Promise<CognitoUserSession> {
    const user = new CognitoUser({ Username: this.username, Pool: this.userPool });
    const authDetails = new AuthenticationDetails({
      Username: this.username,
      Password: this.password,
    });

    return new Promise((resolve, reject) => {
      user.authenticateUser(authDetails, {
        onSuccess: (session) => resolve(session),
        onFailure: (err) => reject(err),
      });
    });
  }

  /** Retorna um idToken válido, autenticando ou renovando a sessão se necessário. */
  async getIdToken(): Promise<string> {
    if (this.cachedSession && this.cachedSession.isValid()) {
      return this.cachedSession.getIdToken().getJwtToken();
    }
    this.cachedSession = await this.signIn();
    return this.cachedSession.getIdToken().getJwtToken();
  }
}
