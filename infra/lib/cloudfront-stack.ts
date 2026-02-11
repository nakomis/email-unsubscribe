import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cf from 'aws-cdk-lib/aws-cloudfront';
import { S3BucketOrigin } from 'aws-cdk-lib/aws-cloudfront-origins';
import * as cm from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import { RemovalPolicy } from 'aws-cdk-lib';
import * as targets from 'aws-cdk-lib/aws-route53-targets';

export interface CloudfrontStackProps extends cdk.StackProps {
    certificate: cm.Certificate;
    domainName: string;
}

export class CloudfrontStack extends cdk.Stack {
    readonly distribution: cf.Distribution;
    readonly bucket: s3.Bucket;

    constructor(scope: Construct, id: string, props: CloudfrontStackProps) {
        super(scope, id, props);

        this.bucket = new s3.Bucket(this, 'UnsubBucket', {
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            encryption: s3.BucketEncryption.S3_MANAGED,
            enforceSSL: true,
            versioned: true,
            removalPolicy: RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
        });

        this.distribution = new cf.Distribution(this, 'UnsubDistribution', {
            comment: 'Email Unsubscribe POC Distribution',
            defaultBehavior: {
                origin: S3BucketOrigin.withOriginAccessControl(this.bucket),
                viewerProtocolPolicy: cf.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            },
            domainNames: [props.domainName],
            certificate: props.certificate,
            defaultRootObject: 'index.html',
            errorResponses: [
                {
                    httpStatus: 403,
                    responseHttpStatus: 200,
                    responsePagePath: '/index.html',
                },
                {
                    httpStatus: 404,
                    responseHttpStatus: 200,
                    responsePagePath: '/index.html',
                },
            ],
        });

        // Look up the hosted zone for sandbox.nakomis.com
        const hostedZone = route53.HostedZone.fromLookup(this, 'HostedZoneLookup', {
            domainName: 'sandbox.nakomis.com',
        });

        new route53.ARecord(this, 'UnsubARecord', {
            recordName: props.domainName,
            zone: hostedZone,
            target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(this.distribution))
        });

        new route53.AaaaRecord(this, 'UnsubAaaaRecord', {
            recordName: props.domainName,
            zone: hostedZone,
            target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(this.distribution))
        });

        new cdk.CfnOutput(this, 'UnsubSiteBucketName', {
            value: this.bucket.bucketName,
            description: 'Name of the Unsubscribe Site S3 bucket',
            exportName: 'UnsubSiteBucketName'
        });

        new cdk.CfnOutput(this, 'UnsubSiteDistributionId', {
            value: this.distribution.distributionId,
            description: 'ID of the Unsubscribe Site CloudFront Distribution',
            exportName: 'UnsubSiteDistributionId'
        });

        cdk.Tags.of(this).add('MH-Project', 'email-unsubscribe');
    }
}
