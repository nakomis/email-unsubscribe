#!/bin/bash
set -e

export AWS_PROFILE=nakom.is-sandbox

echo "=== Deploying Email Unsubscribe POC ==="
echo ""

# Deploy Lambda changes via CDK
echo "Step 1: Deploying infrastructure (Lambda updates)..."
cd infra
npx cdk deploy UnsubApiStack --require-approval never
cd ..

# Deploy web app
echo ""
echo "Step 2: Deploying web application..."
cd web
./scripts/set-config.sh sandbox
npm run build

BUCKET=$(aws cloudformation describe-stacks --stack-name UnsubCloudfrontStack \
  --query 'Stacks[0].Outputs[?OutputKey==`UnsubSiteBucketName`].OutputValue' --output text)
DIST_ID=$(aws cloudformation describe-stacks --stack-name UnsubCloudfrontStack \
  --query 'Stacks[0].Outputs[?OutputKey==`UnsubSiteDistributionId`].OutputValue' --output text)

echo "Uploading to S3 bucket: $BUCKET"
aws s3 sync ./build/ s3://$BUCKET --delete

# Set content types
aws s3 cp s3://$BUCKET/index.html s3://$BUCKET/index.html \
  --content-type "text/html" --metadata-directive REPLACE
aws s3 cp s3://$BUCKET/wolf.png s3://$BUCKET/wolf.png \
  --content-type "image/png" --metadata-directive REPLACE

echo "Invalidating CloudFront..."
aws cloudfront create-invalidation --distribution-id $DIST_ID --paths "/*" > /dev/null

cd ..

echo ""
echo "=== Deployment complete! ==="
echo "URL: https://unsubscribe.sandbox.nakomis.com"
