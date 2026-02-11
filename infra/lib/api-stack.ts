import * as cdk from 'aws-cdk-lib';
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as apigatewayv2Integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as apigatewayv2Authorizers from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as cm from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import { Construct } from 'constructs';
import * as path from 'path';

export interface ApiStackProps extends cdk.StackProps {
    apiDomainName: string;
    webDomainName: string;
    userPool: cognito.UserPool;
    userPoolClient: cognito.UserPoolClient;
    unsubscribesTable: dynamodb.Table;
}

export class ApiStack extends cdk.Stack {
    readonly httpApi: apigatewayv2.HttpApi;

    constructor(scope: Construct, id: string, props: ApiStackProps) {
        super(scope, id, props);

        const jwtSecret = 'unsub-poc-secret-change-me'; // In production, use Secrets Manager

        // Look up the hosted zone for sandbox.nakomis.com
        const hostedZone = route53.HostedZone.fromLookup(this, 'HostedZoneLookup', {
            domainName: 'sandbox.nakomis.com',
        });

        // Create API certificate in eu-west-2 (same region as API Gateway)
        const apiCertificate = new cm.Certificate(this, 'ApiCertificate', {
            domainName: props.apiDomainName,
            validation: cm.CertificateValidation.fromDns(hostedZone),
        });

        // Send Emails Lambda
        const sendEmailsLambda = new lambdaNodejs.NodejsFunction(this, 'SendEmailsFunction', {
            functionName: 'unsubscribe-send-emails',
            entry: path.join(__dirname, '../lambda/send-emails/src/handler.ts'),
            handler: 'handler',
            runtime: lambda.Runtime.NODEJS_20_X,
            timeout: cdk.Duration.seconds(60),
            memorySize: 256,
            environment: {
                JWT_SECRET: jwtSecret,
                SENDER_EMAIL: 'noreply@sandbox.nakomis.com',
                API_DOMAIN: props.apiDomainName,
                WEB_DOMAIN: props.webDomainName,
            },
            bundling: {
                externalModules: [],
                minify: true,
                sourceMap: true,
            },
        });

        // Grant SES permissions
        sendEmailsLambda.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ['ses:SendEmail', 'ses:SendRawEmail'],
            resources: ['*'],
        }));

        // Get Unsubscribe Lambda
        const getUnsubscribeLambda = new lambdaNodejs.NodejsFunction(this, 'GetUnsubscribeFunction', {
            functionName: 'unsubscribe-get',
            entry: path.join(__dirname, '../lambda/get-unsubscribe/src/handler.ts'),
            handler: 'handler',
            runtime: lambda.Runtime.NODEJS_20_X,
            timeout: cdk.Duration.seconds(10),
            memorySize: 128,
            environment: {
                JWT_SECRET: jwtSecret,
                TABLE_NAME: props.unsubscribesTable.tableName,
            },
            bundling: {
                externalModules: [],
                minify: true,
                sourceMap: true,
            },
        });

        props.unsubscribesTable.grantReadData(getUnsubscribeLambda);

        // Post Unsubscribe Lambda
        const postUnsubscribeLambda = new lambdaNodejs.NodejsFunction(this, 'PostUnsubscribeFunction', {
            functionName: 'unsubscribe-post',
            entry: path.join(__dirname, '../lambda/post-unsubscribe/src/handler.ts'),
            handler: 'handler',
            runtime: lambda.Runtime.NODEJS_20_X,
            timeout: cdk.Duration.seconds(10),
            memorySize: 128,
            environment: {
                JWT_SECRET: jwtSecret,
                TABLE_NAME: props.unsubscribesTable.tableName,
            },
            bundling: {
                externalModules: [],
                minify: true,
                sourceMap: true,
            },
        });

        props.unsubscribesTable.grantWriteData(postUnsubscribeLambda);

        // Custom domain for API
        const domainName = new apigatewayv2.DomainName(this, 'ApiDomainName', {
            domainName: props.apiDomainName,
            certificate: apiCertificate,
        });

        // Cognito JWT Authorizer
        const authorizer = new apigatewayv2Authorizers.HttpJwtAuthorizer('CognitoAuthorizer',
            `https://cognito-idp.${this.region}.amazonaws.com/${props.userPool.userPoolId}`,
            {
                jwtAudience: [props.userPoolClient.userPoolClientId],
            }
        );

        // HTTP API
        this.httpApi = new apigatewayv2.HttpApi(this, 'UnsubHttpApi', {
            apiName: 'unsubscribe-api',
            corsPreflight: {
                allowHeaders: ['Content-Type', 'Authorization'],
                allowMethods: [
                    apigatewayv2.CorsHttpMethod.GET,
                    apigatewayv2.CorsHttpMethod.POST,
                    apigatewayv2.CorsHttpMethod.OPTIONS,
                ],
                allowOrigins: ['*'],
                maxAge: cdk.Duration.hours(1),
            },
            defaultDomainMapping: {
                domainName: domainName,
            },
        });

        // Routes
        // POST /send-emails - requires auth
        this.httpApi.addRoutes({
            path: '/send-emails',
            methods: [apigatewayv2.HttpMethod.POST],
            integration: new apigatewayv2Integrations.HttpLambdaIntegration(
                'SendEmailsIntegration',
                sendEmailsLambda
            ),
            authorizer: authorizer,
        });

        // GET /unsubscribe - no auth
        this.httpApi.addRoutes({
            path: '/unsubscribe',
            methods: [apigatewayv2.HttpMethod.GET],
            integration: new apigatewayv2Integrations.HttpLambdaIntegration(
                'GetUnsubscribeIntegration',
                getUnsubscribeLambda
            ),
        });

        // POST /unsubscribe - no auth (for one-click and manual)
        this.httpApi.addRoutes({
            path: '/unsubscribe',
            methods: [apigatewayv2.HttpMethod.POST],
            integration: new apigatewayv2Integrations.HttpLambdaIntegration(
                'PostUnsubscribeIntegration',
                postUnsubscribeLambda
            ),
        });

        new route53.ARecord(this, 'ApiARecord', {
            recordName: props.apiDomainName,
            zone: hostedZone,
            target: route53.RecordTarget.fromAlias(
                new targets.ApiGatewayv2DomainProperties(
                    domainName.regionalDomainName,
                    domainName.regionalHostedZoneId
                )
            ),
        });

        new route53.AaaaRecord(this, 'ApiAaaaRecord', {
            recordName: props.apiDomainName,
            zone: hostedZone,
            target: route53.RecordTarget.fromAlias(
                new targets.ApiGatewayv2DomainProperties(
                    domainName.regionalDomainName,
                    domainName.regionalHostedZoneId
                )
            ),
        });

        new cdk.CfnOutput(this, 'ApiUrl', {
            value: `https://${props.apiDomainName}`,
            description: 'API Gateway URL',
            exportName: 'UnsubApiUrl'
        });

        cdk.Tags.of(this).add('MH-Project', 'email-unsubscribe');
    }
}
