import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import * as jwt from 'jsonwebtoken';

const ses = new SESv2Client({});

const EMAIL_DOMAINS = ['nakomis.com', 'nakom.is', 'nakomis.lgbt', 'nakomis.co.uk'];
const JWT_SECRET = process.env.JWT_SECRET || 'unsub-poc-secret-change-me-3';
const SENDER_EMAIL = process.env.SENDER_EMAIL || 'noreply@sandbox.nakomis.com';
const API_DOMAIN = process.env.API_DOMAIN || 'api.unsubscribe.sandbox.nakomis.com';
const WEB_DOMAIN = process.env.WEB_DOMAIN || 'unsubscribe.sandbox.nakomis.com';
const WOLF_IMAGE_URL = `https://${WEB_DOMAIN}/wolf.png`;
const PROJECT_URL = 'http://nakom.is/email';

function generateRandomString(length: number): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

function generateToken(email: string): string {
    return jwt.sign(
        { sub: email, iss: 'unsubscribe-poc' },
        JWT_SECRET,
        { algorithm: 'HS256' }
    );
}

function generateEmailAddress(): string {
    const randomPart = generateRandomString(8);
    const domain = EMAIL_DOMAINS[Math.floor(Math.random() * EMAIL_DOMAINS.length)];
    return `uns${randomPart}@${domain}`;
}

interface SendEmailsRequest {
    count: number;
    subject?: string;
    additionalEmails?: string[];
}

interface SendEmailsResponse {
    success: boolean;
    sentCount: number;
    emails: string[];
    errors: string[];
}

async function sendEmail(toEmail: string, subject: string): Promise<{ success: boolean; error?: string }> {
    const token = generateToken(toEmail);
    const unsubscribeUrl = `https://${API_DOMAIN}/unsubscribe?token=${token}`;
    const webUnsubscribeUrl = `https://${WEB_DOMAIN}/unsubscribe?token=${token}`;
    const mailtoUnsubscribe = `mailto:unsubscribe@sandbox.nakomis.com?subject=unsubscribe&body=token:${token}`;

    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="text-align: center; margin-bottom: 24px;">
        <a href="${PROJECT_URL}">
            <img src="${WOLF_IMAGE_URL}" alt="Nakomis" style="width: 64px; height: 64px;" />
        </a>
    </div>

    <h2 style="color: #1f2937; text-align: center;">Email Unsubscribe POC</h2>

    <p>This is a test email for the unsubscribe POC.</p>

    <p>Sent to: <strong>${toEmail}</strong></p>

    <p style="margin: 16px 0;">
        Learn more about this project at <a href="${PROJECT_URL}" style="color: #2563eb;">${PROJECT_URL}</a>
    </p>

    <div style="background: #fee2e2; padding: 16px; border: 1px solid #dc2626; border-radius: 8px; margin: 20px 0;">
        <strong style="color: #dc2626;">Important:</strong> This email should only be received by Martin Harris.
        If you are not Martin Harris, please email
        <a href="mailto:martin@nakomis.com" style="color: #dc2626;">martin@nakomis.com</a>
        and it will be rectified immediately.
    </div>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">

    <p style="font-size: 0.875rem; color: #6b7280;">
        You're receiving this because you opted into the Unsubscribe POC test.<br>
        <a href="${webUnsubscribeUrl}" style="color: #2563eb;">Unsubscribe</a>
    </p>

    <p style="font-size: 0.75rem; color: #9ca3af; margin-top: 24px;">
        Nakomis Labs, 1 Royal Mile, Edinburgh, UK
    </p>
</body>
</html>`;

    const textBody = `
Email Unsubscribe POC

This is a test email for the unsubscribe POC.

Sent to: ${toEmail}

Learn more about this project at ${PROJECT_URL}

IMPORTANT: This email should only be received by Martin Harris.
If you are not Martin Harris, please email martin@nakomis.com and it will be rectified immediately.

---
You're receiving this because you opted into the Unsubscribe POC test.
Unsubscribe: ${webUnsubscribeUrl}

Nakomis Labs, 1 Royal Mile, Edinburgh, UK
`;

    try {
        await ses.send(new SendEmailCommand({
            FromEmailAddress: SENDER_EMAIL,
            Destination: {
                ToAddresses: [toEmail],
            },
            Content: {
                Simple: {
                    Subject: { Data: subject, Charset: 'UTF-8' },
                    Body: {
                        Html: { Data: htmlBody, Charset: 'UTF-8' },
                        Text: { Data: textBody, Charset: 'UTF-8' },
                    },
                    Headers: [
                        {
                            Name: 'List-Unsubscribe',
                            Value: `<${unsubscribeUrl}>, <${mailtoUnsubscribe}>`,
                        },
                        {
                            Name: 'List-Unsubscribe-Post',
                            Value: 'List-Unsubscribe=One-Click',
                        },
                    ],
                },
            },
            EmailTags: [
                { Name: 'Project', Value: 'email-unsubscribe' },
            ],
        }));

        console.log(`Sent email to ${toEmail}`);
        return { success: true };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Failed to send to ${toEmail}:`, error);
        return { success: false, error: errorMessage };
    }
}

export async function handler(event: any): Promise<any> {
    console.log('Event:', JSON.stringify(event, null, 2));

    try {
        const body: SendEmailsRequest = typeof event.body === 'string'
            ? JSON.parse(event.body)
            : event.body || {};

        const count = Math.min(Math.max(body.count || 0, 0), 50); // Limit 0-50
        const subject = body.subject || 'Test Email - Unsubscribe POC';
        const additionalEmails = body.additionalEmails || [];

        const sentEmails: string[] = [];
        const errors: string[] = [];

        // Send to auto-generated emails
        for (let i = 0; i < count; i++) {
            const toEmail = generateEmailAddress();
            const result = await sendEmail(toEmail, subject);
            if (result.success) {
                sentEmails.push(toEmail);
            } else {
                errors.push(`Failed to send to ${toEmail}: ${result.error}`);
            }
        }

        // Send to additional emails
        for (const toEmail of additionalEmails) {
            const trimmedEmail = toEmail.trim();
            if (trimmedEmail && trimmedEmail.includes('@')) {
                const result = await sendEmail(trimmedEmail, subject);
                if (result.success) {
                    sentEmails.push(trimmedEmail);
                } else {
                    errors.push(`Failed to send to ${trimmedEmail}: ${result.error}`);
                }
            }
        }

        const response: SendEmailsResponse = {
            success: errors.length === 0,
            sentCount: sentEmails.length,
            emails: sentEmails,
            errors: errors,
        };

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify(response),
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
