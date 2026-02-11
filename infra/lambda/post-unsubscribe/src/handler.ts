import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import * as jwt from 'jsonwebtoken';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const JWT_SECRET = process.env.JWT_SECRET || 'unsub-poc-secret-change-me';
const TABLE_NAME = process.env.TABLE_NAME || 'email-unsubscribes';

interface TokenPayload {
    sub: string;
    iss: string;
    iat: number;
}

export async function handler(event: any): Promise<any> {
    console.log('Event:', JSON.stringify(event, null, 2));

    try {
        const token = event.queryStringParameters?.token;

        if (!token) {
            return {
                statusCode: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({
                    success: false,
                    error: 'Missing token parameter',
                }),
            };
        }

        // Verify and decode the token
        let payload: TokenPayload;
        try {
            payload = jwt.verify(token, JWT_SECRET) as TokenPayload;
        } catch (jwtError) {
            console.error('JWT verification failed:', jwtError);
            return {
                statusCode: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({
                    success: false,
                    error: 'Invalid or expired token',
                }),
            };
        }

        const email = payload.sub;

        // Determine if this is a one-click unsubscribe or manual
        const body = event.body || '';
        const isOneClick = body.includes('List-Unsubscribe=One-Click');
        const source = isOneClick ? 'one-click' : 'manual';

        // Write to DynamoDB
        await docClient.send(new PutCommand({
            TableName: TABLE_NAME,
            Item: {
                email,
                unsubscribedAt: new Date().toISOString(),
                source,
                userAgent: event.headers?.['user-agent'] || 'unknown',
            },
        }));

        console.log(`Unsubscribed ${email} via ${source}`);

        // For one-click, just return 200 OK with no body
        // For manual, return JSON response
        if (isOneClick) {
            return {
                statusCode: 200,
                headers: {
                    'Content-Type': 'text/plain',
                },
                body: 'OK',
            };
        }

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                success: true,
                message: 'Successfully unsubscribed',
                email,
            }),
        };
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            }),
        };
    }
}
