import * as path from 'node:path'

import { Duration, Stack, type StackProps } from 'aws-cdk-lib'
import * as apigateway from 'aws-cdk-lib/aws-apigateway'
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2'
import * as apigatewayv2Integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations'
import * as cognito from 'aws-cdk-lib/aws-cognito'
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb'
import * as iam from 'aws-cdk-lib/aws-iam'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs'
import { Construct } from 'constructs'

export interface ApiStackProps extends StackProps {
  appName: string
  userPool: cognito.UserPool
  userPoolClient: cognito.UserPoolClient
  appTable: dynamodb.Table
  connectionsTable: dynamodb.Table
}

/**
 * Stack de API: Lambda REST (API Gateway REST + Cognito User Pool authorizer)
 * e API Gateway WebSocket ($connect/$disconnect + broadcast via Management API).
 *
 * As duas Lambdas (REST e WebSocket $connect/$disconnect) compartilham o
 * mesmo código backend (backend/src/lambda-entry.ts e
 * backend/src/websocket-entry.ts), empacotado via NodejsFunction (esbuild).
 */
export class ApiStack extends Stack {
  public readonly restApiUrl: string
  public readonly webSocketApiUrl: string

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props)

    const backendRoot = path.join(__dirname, '..', '..', 'backend')
    const backendLockFile = path.join(backendRoot, 'package-lock.json')

    const commonBundling: lambdaNodejs.BundlingOptions = {
      format: lambdaNodejs.OutputFormat.ESM,
      target: 'node22',
      // esbuild precisa resolver os módulos ESM com extensão .js nos imports
      // relativos do backend (ex: "./handlers/cards-handler.js"), que já é a
      // convenção usada no projeto (tsconfig NodeNext).
      banner: "import { createRequire as topLevelCreateRequire } from 'module'; const require = topLevelCreateRequire(import.meta.url);",
    }

    // ---------------------------------------------------------------------
    // API Gateway WebSocket ($connect / $disconnect)
    // ---------------------------------------------------------------------

    const webSocketApi = new apigatewayv2.WebSocketApi(this, 'WebSocketApi', {
      apiName: `${props.appName}-ws`,
    })

    const webSocketStage = new apigatewayv2.WebSocketStage(this, 'WebSocketStage', {
      webSocketApi,
      stageName: 'prod',
      autoDeploy: true,
    })

    this.webSocketApiUrl = webSocketStage.url

    const webSocketEndpoint = `https://${webSocketApi.apiId}.execute-api.${this.region}.amazonaws.com/${webSocketStage.stageName}`

    const connectDisconnectFn = new lambdaNodejs.NodejsFunction(this, 'WebSocketConnectFn', {
      functionName: `${props.appName}-ws-connect`,
      entry: path.join(backendRoot, 'src', 'websocket-entry.ts'),
      handler: 'connectHandler',
      runtime: lambda.Runtime.NODEJS_22_X,
      memorySize: 256,
      timeout: Duration.seconds(10),
      projectRoot: backendRoot,
      depsLockFilePath: backendLockFile,
      bundling: commonBundling,
      environment: {
        CONNECTIONS_TABLE_NAME: props.connectionsTable.tableName,
        WEBSOCKET_API_ENDPOINT: webSocketEndpoint,
      },
    })

    const disconnectFn = new lambdaNodejs.NodejsFunction(this, 'WebSocketDisconnectFn', {
      functionName: `${props.appName}-ws-disconnect`,
      entry: path.join(backendRoot, 'src', 'websocket-entry.ts'),
      handler: 'disconnectHandler',
      runtime: lambda.Runtime.NODEJS_22_X,
      memorySize: 256,
      timeout: Duration.seconds(10),
      projectRoot: backendRoot,
      depsLockFilePath: backendLockFile,
      bundling: commonBundling,
      environment: {
        CONNECTIONS_TABLE_NAME: props.connectionsTable.tableName,
        WEBSOCKET_API_ENDPOINT: webSocketEndpoint,
      },
    })

    props.connectionsTable.grantReadWriteData(connectDisconnectFn)
    props.connectionsTable.grantReadWriteData(disconnectFn)

    webSocketApi.addRoute('$connect', {
      integration: new apigatewayv2Integrations.WebSocketLambdaIntegration(
        'ConnectIntegration',
        connectDisconnectFn,
      ),
    })
    webSocketApi.addRoute('$disconnect', {
      integration: new apigatewayv2Integrations.WebSocketLambdaIntegration(
        'DisconnectIntegration',
        disconnectFn,
      ),
    })

    // ---------------------------------------------------------------------
    // Lambda REST (API Gateway REST + Cognito authorizer)
    // ---------------------------------------------------------------------

    const restFn = new lambdaNodejs.NodejsFunction(this, 'RestApiFn', {
      functionName: `${props.appName}-rest-api`,
      entry: path.join(backendRoot, 'src', 'lambda-entry.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_22_X,
      memorySize: 512,
      timeout: Duration.seconds(15),
      projectRoot: backendRoot,
      depsLockFilePath: backendLockFile,
      bundling: commonBundling,
      environment: {
        APP_TABLE_NAME: props.appTable.tableName,
        CONNECTIONS_TABLE_NAME: props.connectionsTable.tableName,
        WEBSOCKET_API_ENDPOINT: webSocketEndpoint,
      },
    })

    props.appTable.grantReadWriteData(restFn)
    props.connectionsTable.grantReadWriteData(restFn)

    // Permissão para publicar mensagens nas conexões WebSocket via Management API.
    restFn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['execute-api:ManageConnections'],
        resources: [
          `arn:aws:execute-api:${this.region}:${this.account}:${webSocketApi.apiId}/${webSocketStage.stageName}/POST/@connections/*`,
        ],
      }),
    )

    const restApi = new apigateway.RestApi(this, 'RestApi', {
      restApiName: `${props.appName}-api`,
      deployOptions: { stageName: 'prod' },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization', 'x-user-id', 'x-admin'],
      },
    })

    const authorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'CognitoAuthorizer', {
      cognitoUserPools: [props.userPool],
    })

    const integration = new apigateway.LambdaIntegration(restFn)

    const methodOptions: apigateway.MethodOptions = {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    }

    const cards = restApi.root.addResource('cards')
    cards.addMethod('GET', integration, methodOptions)
    cards.addMethod('POST', integration, methodOptions)

    const cardById = cards.addResource('{id}')
    const cardMove = cardById.addResource('move')
    cardMove.addMethod('PATCH', integration, methodOptions)
    const cardReorder = cardById.addResource('reorder')
    cardReorder.addMethod('PATCH', integration, methodOptions)
    cardById.addMethod('DELETE', integration, methodOptions)

    const vote = restApi.root.addResource('vote')
    vote.addMethod('GET', integration, methodOptions)
    const voteHistory = vote.addResource('history')
    voteHistory.addMethod('GET', integration, methodOptions)
    const voteStart = vote.addResource('start')
    voteStart.addMethod('POST', integration, methodOptions)

    const voteBySession = vote.addResource('{sessionId}')
    const voteCast = voteBySession.addResource('cast')
    voteCast.addMethod('POST', integration, methodOptions)
    const voteReveal = voteBySession.addResource('reveal')
    voteReveal.addMethod('POST', integration, methodOptions)
    const voteReset = voteBySession.addResource('reset')
    voteReset.addMethod('POST', integration, methodOptions)

    this.restApiUrl = restApi.url
  }
}
