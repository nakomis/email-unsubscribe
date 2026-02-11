#!/bin/bash
set -e

echo "Starting Email Unsubscribe Web App Deployment..."

SCRIPT_DIR="$(dirname "$(readlink -f "$0")")"
cd "$SCRIPT_DIR/.."

# Get current version
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo "Current version: $CURRENT_VERSION"

# Build production version
echo "Building production version..."
npm run build

# Get AWS resources from CloudFormation
echo "Getting AWS resources from CloudFormation..."
BUCKET_NAME=$(aws cloudformation describe-stacks --stack-name UnsubCloudfrontStack \
  --query 'Stacks[0].Outputs[?OutputKey==`UnsubSiteBucketName`].OutputValue' --output text)
DISTRIBUTION_ID=$(aws cloudformation describe-stacks --stack-name UnsubCloudfrontStack \
  --query 'Stacks[0].Outputs[?OutputKey==`UnsubSiteDistributionId`].OutputValue' --output text)

if [ -z "$BUCKET_NAME" ] || [ -z "$DISTRIBUTION_ID" ]; then
    echo "Error: Could not retrieve AWS resources from CloudFormation"
    exit 1
fi

echo "Deploying to S3 bucket: $BUCKET_NAME"
echo "CloudFront distribution: $DISTRIBUTION_ID"

# Sync files to S3
echo "Syncing files to S3..."
aws s3 sync ./build/ s3://$BUCKET_NAME --delete

# Set cache headers for static assets
echo "Setting cache headers..."
aws s3 cp s3://$BUCKET_NAME/static/ s3://$BUCKET_NAME/static/ --recursive \
  --cache-control "max-age=31536000" --metadata-directive REPLACE

aws s3 cp s3://$BUCKET_NAME/index.html s3://$BUCKET_NAME/index.html \
  --cache-control "max-age=300" --metadata-directive REPLACE

# Invalidate CloudFront
echo "Invalidating CloudFront distribution..."
INVALIDATION_ID=$(aws cloudfront create-invalidation --distribution-id $DISTRIBUTION_ID --paths "/*" \
  --query 'Invalidation.Id' --output text)

echo "Waiting for CloudFront invalidation to complete..."
aws cloudfront wait invalidation-completed --distribution-id $DISTRIBUTION_ID --id $INVALIDATION_ID

echo "Deployment complete! Version $CURRENT_VERSION is now live."
echo "URL: https://unsubscribe.sandbox.nakomis.com"
