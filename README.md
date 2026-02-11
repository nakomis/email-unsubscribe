# Email Unsubscribe POC

A proof-of-concept implementation demonstrating RFC 8058 compliant email unsubscribe functionality, including one-click unsubscribe support for Gmail and Yahoo.

## Features

- **RFC 8058 Compliant**: Implements `List-Unsubscribe` and `List-Unsubscribe-Post` headers
- **One-Click Unsubscribe**: Supports Gmail/Yahoo one-click unsubscribe
- **CAN-SPAM Compliant**: Includes required physical address and visible unsubscribe links
- **Token-Based**: No login required to unsubscribe (JWT tokens)
- **Web Interface**: React app for sending test emails and processing unsubscribes

## Architecture

```
                    unsubscribe.sandbox.nakomis.com
                                 |
                            CloudFront
                                 |
                 +---------------+---------------+
                 |                               |
            /api/* paths                    /* (default)
                 |                               |
           API Gateway                      S3 Bucket
                 |                          (React App)
     +-----------+-----------+
     |           |           |
/send-emails /unsubscribe /unsubscribe
   (POST)      (GET)        (POST)
     |           |            |
 [Lambda]    [Lambda]     [Lambda]
     |           |            |
    SES      DynamoDB     DynamoDB
```

## Tech Stack

- **Infrastructure**: AWS CDK (TypeScript)
- **Frontend**: React 19, TypeScript, Material-UI
- **Backend**: AWS Lambda (Node.js 20)
- **Database**: DynamoDB
- **Email**: Amazon SES
- **Auth**: Amazon Cognito
- **CDN**: CloudFront + S3

## Project Structure

```
email-unsubscribe/
├── infra/                 # AWS CDK infrastructure
│   ├── bin/              # CDK app entry point
│   ├── lib/              # Stack definitions
│   │   ├── api-stack.ts
│   │   ├── certificate-stack.ts
│   │   ├── cloudfront-stack.ts
│   │   ├── cognito-stack.ts
│   │   └── dynamodb-stack.ts
│   └── lambda/           # Lambda function code
│       ├── send-emails/
│       ├── get-unsubscribe/
│       └── post-unsubscribe/
│
└── web/                  # React web application
    ├── src/
    │   ├── components/
    │   │   ├── App.tsx          # Main app (send emails)
    │   │   ├── Unsubscribe.tsx  # Public unsubscribe page
    │   │   ├── LoggedIn.tsx
    │   │   └── Logout.tsx
    │   └── config/
    └── scripts/
        ├── set-config.sh
        └── deploy.sh
```

## Prerequisites

- Node.js 20+
- AWS CLI configured with `nakom.is-sandbox` profile
- AWS CDK CLI (`npm install -g aws-cdk`)

## Deployment

### Infrastructure

```bash
cd infra
npm install

# Bootstrap CDK (first time only)
AWS_PROFILE=nakom.is-sandbox npx cdk bootstrap aws://ACCOUNT_ID/eu-west-2
AWS_PROFILE=nakom.is-sandbox npx cdk bootstrap aws://ACCOUNT_ID/us-east-1

# Deploy all stacks
AWS_PROFILE=nakom.is-sandbox npx cdk deploy --all
```

### Web Application

```bash
cd web
npm install

# Deploy to production
npm run deploy
```

## Local Development

```bash
cd web
npm start
```

This will configure the app for localhost and start the development server.

## Email Headers

Emails sent by this POC include:

```
List-Unsubscribe: <https://api.unsubscribe.sandbox.nakomis.com/unsubscribe?token=...>,
                  <mailto:unsubscribe@sandbox.nakomis.com?subject=unsubscribe&body=token:...>
List-Unsubscribe-Post: List-Unsubscribe=One-Click
```

## API Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/send-emails` | POST | Cognito JWT | Send bulk test emails |
| `/unsubscribe` | GET | None (token) | Get unsubscribe status |
| `/unsubscribe` | POST | None (token) | Process unsubscribe |

## Compliance

- **Gmail/Yahoo**: `List-Unsubscribe-Post` header for one-click ✓
- **CAN-SPAM**: Physical address in footer ✓
- **CAN-SPAM**: Visible unsubscribe link ✓
- **Best Practice**: No login required to unsubscribe ✓

## License

CC0 1.0 Universal - See [LICENSE.md](LICENSE.md)
