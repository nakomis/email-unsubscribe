#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { CertificateStack } from '../lib/certificate-stack';
import { CloudfrontStack } from '../lib/cloudfront-stack';
import { CognitoStack } from '../lib/cognito-stack';
import { DynamoDBStack } from '../lib/dynamodb-stack';
// SES identity for sandbox.nakomis.com already exists in the account
// import { SesStack } from '../lib/ses-stack';
import { ApiStack } from '../lib/api-stack';

// Account ID for nakom.is-sandbox profile
const accountId = process.env.CDK_DEFAULT_ACCOUNT || '975050268859';
const londonEnv = { env: { account: accountId, region: 'eu-west-2' } };
const nvirginiaEnv = { env: { account: accountId, region: 'us-east-1' } };

const domainName = 'unsubscribe.sandbox.nakomis.com';
const apiDomain = 'api.unsubscribe.sandbox.nakomis.com';
const authDomain = 'auth.unsubscribe.sandbox.nakomis.com';

const app = new cdk.App();

// Certificate Stack (us-east-1 for CloudFront and Cognito)
const certificateStack = new CertificateStack(app, 'UnsubCertificateStack', {
    ...nvirginiaEnv,
    domainName: domainName,
    authDomain: authDomain,
    crossRegionReferences: true,
});

// DynamoDB Stack
const dynamoDBStack = new DynamoDBStack(app, 'UnsubDynamoDBStack', londonEnv);

// SES Stack - skipped, sandbox.nakomis.com identity already exists
// const sesStack = new SesStack(app, 'UnsubSesStack', londonEnv);

// Cognito Stack
const cognitoStack = new CognitoStack(app, 'UnsubCognitoStack', {
    ...londonEnv,
    authDomainName: authDomain,
    domainName: domainName,
    authCertificate: certificateStack.authCertificate,
    crossRegionReferences: true,
});

// API Stack (creates its own certificate in eu-west-2)
const apiStack = new ApiStack(app, 'UnsubApiStack', {
    ...londonEnv,
    apiDomainName: apiDomain,
    webDomainName: domainName,
    userPool: cognitoStack.userPool,
    userPoolClient: cognitoStack.userPoolClient,
    unsubscribesTable: dynamoDBStack.unsubscribesTable,
});

// CloudFront Stack
const cloudfrontStack = new CloudfrontStack(app, 'UnsubCloudfrontStack', {
    ...londonEnv,
    certificate: certificateStack.certificate,
    domainName: domainName,
    crossRegionReferences: true,
});

// Add dependencies
cognitoStack.addDependency(certificateStack);
apiStack.addDependency(cognitoStack);
apiStack.addDependency(dynamoDBStack);
cloudfrontStack.addDependency(certificateStack);
