import * as cdk from 'aws-cdk-lib';
import * as ses from 'aws-cdk-lib/aws-ses';
import * as route53 from 'aws-cdk-lib/aws-route53';
import { Construct } from 'constructs';

export class SesStack extends cdk.Stack {
    readonly emailIdentity: ses.EmailIdentity;

    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        // Look up the hosted zone for sandbox.nakomis.com
        const hostedZone = route53.HostedZone.fromLookup(this, 'HostedZoneLookup', {
            domainName: 'sandbox.nakomis.com',
        });

        // Create SES domain identity for sandbox.nakomis.com
        // This will send from addresses like noreply@sandbox.nakomis.com
        this.emailIdentity = new ses.EmailIdentity(this, 'SandboxEmailIdentity', {
            identity: ses.Identity.publicHostedZone(hostedZone),
            mailFromDomain: `mail.sandbox.nakomis.com`,
        });

        new cdk.CfnOutput(this, 'SesIdentityName', {
            value: 'sandbox.nakomis.com',
            description: 'SES domain identity for sending emails',
            exportName: 'UnsubSesIdentityName'
        });

        cdk.Tags.of(this).add('MH-Project', 'email-unsubscribe');
    }
}
