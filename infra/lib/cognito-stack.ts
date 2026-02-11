import * as cdk from 'aws-cdk-lib';
import * as cm from 'aws-cdk-lib/aws-certificatemanager';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import { Construct } from 'constructs';

export interface CognitoStackProps extends cdk.StackProps {
    authDomainName: string;
    domainName: string;
    authCertificate: cm.Certificate;
}

export class CognitoStack extends cdk.Stack {
    readonly userPool: cognito.UserPool;
    readonly userPoolClient: cognito.UserPoolClient;

    constructor(scope: Construct, id: string, props: CognitoStackProps) {
        super(scope, id, props);

        this.userPool = new cognito.UserPool(this, 'UnsubUserPool', {
            userPoolName: 'UnsubUserPool',
            signInAliases: {
                username: true,
                email: true,
            },
            selfSignUpEnabled: false,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });

        const callbackUrls: string[] = [
            `https://${props.domainName}/loggedin`,
            'http://localhost:3000/loggedin'
        ];
        const logoutUrls: string[] = [
            `https://${props.domainName}/logout`,
            'http://localhost:3000/logout'
        ];

        this.userPoolClient = new cognito.UserPoolClient(this, 'UnsubUserPoolClient', {
            userPoolClientName: 'UnsubUserPoolClient',
            userPool: this.userPool,
            authFlows: {
                userPassword: true,
                userSrp: true,
            },
            generateSecret: false,
            oAuth: {
                callbackUrls: callbackUrls,
                logoutUrls: logoutUrls,
                flows: {
                    authorizationCodeGrant: true,
                },
                scopes: [
                    cognito.OAuthScope.OPENID,
                    cognito.OAuthScope.EMAIL,
                    cognito.OAuthScope.PROFILE,
                ],
            },
        });

        const userPoolDomain = new cognito.UserPoolDomain(this, 'UnsubUserPoolCustomDomain', {
            customDomain: {
                domainName: props.authDomainName,
                certificate: props.authCertificate,
            },
            userPool: this.userPool,
            managedLoginVersion: cognito.ManagedLoginVersion.NEWER_MANAGED_LOGIN,
        });

        // Create a default user
        new cognito.CfnUserPoolUser(this, 'UnsubNakomisUser', {
            userPoolId: this.userPool.userPoolId,
            username: 'nakomis',
            userAttributes: [
                { name: 'email', value: 'unsubscribe@nakomis.com' },
                { name: 'email_verified', value: 'true' },
            ],
        });

        // Add managed login branding
        new cognito.CfnManagedLoginBranding(this, 'UnsubManagedLoginBranding', {
            userPoolId: this.userPool.userPoolId,
            clientId: this.userPoolClient.userPoolClientId,
            useCognitoProvidedValues: true,
        });

        // Look up the hosted zone for sandbox.nakomis.com
        const hostedZone = route53.HostedZone.fromLookup(this, 'HostedZoneLookup', {
            domainName: 'sandbox.nakomis.com',
        });

        new route53.ARecord(this, 'UnsubUserPoolARecord', {
            recordName: props.authDomainName,
            zone: hostedZone,
            target: route53.RecordTarget.fromAlias(new targets.UserPoolDomainTarget(userPoolDomain))
        });

        new route53.AaaaRecord(this, 'UnsubUserPoolAaaaRecord', {
            recordName: props.authDomainName,
            zone: hostedZone,
            target: route53.RecordTarget.fromAlias(new targets.UserPoolDomainTarget(userPoolDomain))
        });

        new cdk.CfnOutput(this, 'UserPoolId', {
            value: this.userPool.userPoolId,
            description: 'Cognito User Pool ID',
            exportName: 'UnsubUserPoolId'
        });

        new cdk.CfnOutput(this, 'UserPoolClientId', {
            value: this.userPoolClient.userPoolClientId,
            description: 'Cognito User Pool Client ID',
            exportName: 'UnsubUserPoolClientId'
        });

        new cdk.CfnOutput(this, 'CognitoDomain', {
            value: props.authDomainName,
            description: 'Cognito custom domain',
            exportName: 'UnsubCognitoDomain'
        });

        cdk.Tags.of(this).add('MH-Project', 'email-unsubscribe');
    }
}
