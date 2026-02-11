import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

export class DynamoDBStack extends cdk.Stack {
    readonly unsubscribesTable: dynamodb.Table;

    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        this.unsubscribesTable = new dynamodb.Table(this, 'UnsubscribesTable', {
            tableName: 'email-unsubscribes',
            partitionKey: {
                name: 'email',
                type: dynamodb.AttributeType.STRING
            },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            removalPolicy: cdk.RemovalPolicy.DESTROY, // POC - can be destroyed
            pointInTimeRecovery: false,
        });

        new cdk.CfnOutput(this, 'UnsubscribesTableName', {
            value: this.unsubscribesTable.tableName,
            description: 'Name of the unsubscribes DynamoDB table',
            exportName: 'UnsubscribesTableName'
        });

        new cdk.CfnOutput(this, 'UnsubscribesTableArn', {
            value: this.unsubscribesTable.tableArn,
            description: 'ARN of the unsubscribes DynamoDB table',
            exportName: 'UnsubscribesTableArn'
        });

        cdk.Tags.of(this).add('MH-Project', 'email-unsubscribe');
    }
}
