import { RemovalPolicy, Stack, type StackProps } from 'aws-cdk-lib'
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb'
import { Construct } from 'constructs'

export interface DataStackProps extends StackProps {
  appName: string
}

/**
 * Stack de dados: duas tabelas DynamoDB, pay-per-request (on-demand).
 *
 * - AppTable: single-table para cards, sessões de votação e votos
 *   (ver backend/docs/dynamodb-schema.md para o desenho completo de PK/SK).
 * - ConnectionsTable: conexões WebSocket, com TTL nativo para limpar
 *   conexões obsoletas que não dispararam $disconnect.
 */
export class DataStack extends Stack {
  public readonly appTable: dynamodb.Table
  public readonly connectionsTable: dynamodb.Table

  constructor(scope: Construct, id: string, props: DataStackProps) {
    super(scope, id, props)

    this.appTable = new dynamodb.Table(this, 'AppTable', {
      tableName: `${props.appName}-app`,
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
    })

    this.connectionsTable = new dynamodb.Table(this, 'ConnectionsTable', {
      tableName: `${props.appName}-connections`,
      partitionKey: { name: 'connectionId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: 'ttl',
      removalPolicy: RemovalPolicy.DESTROY,
    })
  }
}
