import * as fs from 'node:fs'
import * as path from 'node:path'

import { RemovalPolicy, Stack, type StackProps } from 'aws-cdk-lib'
import * as acm from 'aws-cdk-lib/aws-certificatemanager'
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront'
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins'
import * as route53 from 'aws-cdk-lib/aws-route53'
import * as targets from 'aws-cdk-lib/aws-route53-targets'
import * as s3 from 'aws-cdk-lib/aws-s3'
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment'
import { Construct } from 'constructs'

export interface WebStackProps extends StackProps {
  appName: string
  /** Domínio completo do site, ex: "wica2026.dev.clouddog.com.br". */
  domainName: string
  /** Nome da zona hospedada no Route53, ex: "dev.clouddog.com.br". */
  hostedZoneName: string
  hostedZoneId: string
  /** ARN do certificado ACM (us-east-1, exigido pelo CloudFront) que cobre o domínio. */
  certificateArn: string
}

/**
 * Stack de frontend: S3 (bucket privado, origem do CloudFront) + CloudFront
 * (CDN + HTTPS + domínio próprio) + registro Route53 apontando para a
 * distribuição.
 *
 * O bucket começa vazio no primeiro deploy; o build do frontend (com as
 * variáveis de ambiente do Cognito já preenchidas) é publicado nele numa
 * segunda passada, após o CognitoStack existir (ver README/fluxo two-pass).
 */
export class WebStack extends Stack {
  public readonly bucket: s3.Bucket
  public readonly distribution: cloudfront.Distribution

  constructor(scope: Construct, id: string, props: WebStackProps) {
    super(scope, id, props)

    this.bucket = new s3.Bucket(this, 'SiteBucket', {
      bucketName: `${props.appName}-site-${this.account}`,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    })

    const certificate = acm.Certificate.fromCertificateArn(
      this,
      'Certificate',
      props.certificateArn,
    )

    this.distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(this.bucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      },
      defaultRootObject: 'index.html',
      domainNames: [props.domainName],
      certificate,
      errorResponses: [
        // SPA: qualquer rota não encontrada no S3 cai no index.html (React Router).
        { httpStatus: 403, responseHttpStatus: 200, responsePagePath: '/index.html' },
        { httpStatus: 404, responseHttpStatus: 200, responsePagePath: '/index.html' },
      ],
    })

    const hostedZone = route53.HostedZone.fromHostedZoneAttributes(this, 'HostedZone', {
      hostedZoneId: props.hostedZoneId,
      zoneName: props.hostedZoneName,
    })

    new route53.ARecord(this, 'AliasRecord', {
      zone: hostedZone,
      recordName: props.domainName,
      target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(this.distribution)),
    })

    // Publica o build real do frontend (frontend/dist) quando ele existir —
    // ou seja, após `npm run build` no frontend com as envs do Cognito/API/WS
    // já preenchidas (ver README/fluxo two-pass). No primeiro deploy, antes
    // de o build existir, publica um placeholder para o bucket não ficar
    // vazio (evita página de erro do S3 enquanto a stack ainda não tem
    // Cognito/API Gateway para preencher o .env do frontend).
    const frontendDist = path.join(__dirname, '..', '..', 'frontend', 'dist')
    const hasFrontendBuild = fs.existsSync(path.join(frontendDist, 'index.html'))

    new s3deploy.BucketDeployment(this, 'SiteDeployment', {
      sources: [
        hasFrontendBuild
          ? s3deploy.Source.asset(frontendDist)
          : s3deploy.Source.data(
              'index.html',
              '<!doctype html><html><body>Deploy em andamento...</body></html>',
            ),
      ],
      destinationBucket: this.bucket,
      distribution: this.distribution,
      distributionPaths: ['/*'],
    })
  }
}
