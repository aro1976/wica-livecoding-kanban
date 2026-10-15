import { Duration, RemovalPolicy, Stack, type StackProps } from 'aws-cdk-lib'
import * as cognito from 'aws-cdk-lib/aws-cognito'
import { Construct } from 'constructs'

export interface CognitoStackProps extends StackProps {
  /** Nome base usado para derivar nomes dos recursos (ex: "wica2026-kanban"). */
  appName: string
}

/**
 * Stack de autenticação: User Pool NOVO (sem reuso de pools existentes),
 * com auto-cadastro, verificação de e-mail obrigatória, e um grupo "admin"
 * para controlar quem pode iniciar/revelar/resetar sessões de votação.
 */
export class CognitoStack extends Stack {
  public readonly userPool: cognito.UserPool
  public readonly userPoolClient: cognito.UserPoolClient
  public readonly adminGroup: cognito.CfnUserPoolGroup

  constructor(scope: Construct, id: string, props: CognitoStackProps) {
    super(scope, id, props)

    this.userPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: `${props.appName}-user-pool`,
      selfSignUpEnabled: true,
      signInAliases: { email: true, username: false },
      autoVerify: { email: true },
      standardAttributes: {
        email: { required: true, mutable: true },
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: false,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      userVerification: {
        emailSubject: 'Confirme seu cadastro no Kanban WICA2026',
        emailBody:
          'Olá! Seu código de verificação para o Kanban WICA2026 é: {####}',
        emailStyle: cognito.VerificationEmailStyle.CODE,
      },
      removalPolicy: RemovalPolicy.DESTROY,
    })

    this.userPoolClient = this.userPool.addClient('WebClient', {
      userPoolClientName: `${props.appName}-web-client`,
      authFlows: {
        userPassword: true,
        userSrp: true,
      },
      generateSecret: false,
      accessTokenValidity: Duration.hours(1),
      idTokenValidity: Duration.hours(1),
      refreshTokenValidity: Duration.days(30),
      preventUserExistenceErrors: true,
    })

    // Grupo "admin": membros podem iniciar/revelar/resetar sessões de votação
    // (verificado via claim cognito:groups no JWT, ver backend/src/types/http.ts isAdmin()).
    this.adminGroup = new cognito.CfnUserPoolGroup(this, 'AdminGroup', {
      userPoolId: this.userPool.userPoolId,
      groupName: 'admin',
      description: 'Usuários que podem iniciar, revelar e resetar sessões de votação.',
    })
  }
}
