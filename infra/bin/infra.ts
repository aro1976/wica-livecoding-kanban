#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib'

import { ApiStack } from '../lib/api-stack'
import { CognitoStack } from '../lib/cognito-stack'
import { DataStack } from '../lib/data-stack'
import { WebStack } from '../lib/web-stack'

const app = new cdk.App()

const appName = 'wica2026-kanban'
const env = {
  account: '764118143408',
  region: 'us-east-1',
}

const domainName = 'wica2026.dev.clouddog.com.br'
const hostedZoneName = 'dev.clouddog.com.br'
const hostedZoneId = 'Z2H58W0IFJL3RW'
// Certificado ACM wildcard existente (*.dev.clouddog.com.br), cobre o domínio acima.
const certificateArn =
  'arn:aws:acm:us-east-1:764118143408:certificate/9b352b7a-5229-4746-9e2f-ae625a3e5b91'

const dataStack = new DataStack(app, 'WicaKanbanDataStack', { appName, env })

const cognitoStack = new CognitoStack(app, 'WicaKanbanCognitoStack', { appName, env })

const apiStack = new ApiStack(app, 'WicaKanbanApiStack', {
  appName,
  env,
  userPool: cognitoStack.userPool,
  userPoolClient: cognitoStack.userPoolClient,
  appTable: dataStack.appTable,
  connectionsTable: dataStack.connectionsTable,
})

new WebStack(app, 'WicaKanbanWebStack', {
  appName,
  env,
  domainName,
  hostedZoneName,
  hostedZoneId,
  certificateArn,
})

// Mantém referência para evitar erro de "declared but never read" em alguns linters.
void apiStack
