import * as cdk from 'aws-cdk-lib';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as cm from 'aws-cdk-lib/aws-certificatemanager';
import { Construct } from 'constructs';

export interface CertificateStackProps extends cdk.StackProps {
    domainName: string;
    authDomain: string;
}

export class CertificateStack extends cdk.Stack {
    // Only CloudFront and Cognito certs here (us-east-1)
    // API Gateway cert needs to be in eu-west-2, created in ApiStack
    readonly certificate: cm.Certificate;
    readonly authCertificate: cm.Certificate;

    constructor(scope: Construct, id: string, props: CertificateStackProps) {
        super(scope, id, props);

        // Look up the hosted zone for sandbox.nakomis.com
        const hostedZone = route53.HostedZone.fromLookup(this, 'HostedZoneLookup', {
            domainName: 'sandbox.nakomis.com',
        });

        // Certificate for the main domain (unsubscribe.sandbox.nakomis.com) - CloudFront
        this.certificate = new cm.Certificate(this, 'UnsubCert', {
            domainName: props.domainName,
            validation: cm.CertificateValidation.fromDns(hostedZone)
        });

        // Certificate for the auth domain (auth.unsubscribe.sandbox.nakomis.com) - Cognito
        this.authCertificate = new cm.Certificate(this, 'UnsubAuthCert', {
            domainName: props.authDomain,
            validation: cm.CertificateValidation.fromDns(hostedZone)
        });

        cdk.Tags.of(this).add('MH-Project', 'email-unsubscribe');
    }
}
