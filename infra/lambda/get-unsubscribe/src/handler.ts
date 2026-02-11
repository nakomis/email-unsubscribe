import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import * as jwt from 'jsonwebtoken';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const JWT_SECRET = process.env.JWT_SECRET || 'unsub-poc-secret-change-me-1';
const TABLE_NAME = process.env.TABLE_NAME || 'email-unsubscribes';

interface TokenPayload {
    sub: string;
    iss: string;
    iat: number;
}

function maskEmail(email: string): string {
    const [localPart, domain] = email.split('@');
    if (localPart.length <= 3) {
        return `${localPart[0]}***@${domain}`;
    }
    return `${localPart.slice(0, 2)}***${localPart.slice(-1)}@${domain}`;
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

        // Check if already unsubscribed
        const result = await docClient.send(new GetCommand({
            TableName: TABLE_NAME,
            Key: { email },
        }));

        const isUnsubscribed = !!result.Item;

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                success: true,
                email: maskEmail(email),
                fullEmail: email, // Include for debugging in POC
                isUnsubscribed,
                unsubscribedAt: result.Item?.unsubscribedAt,
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
