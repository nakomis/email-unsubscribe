#!/bin/bash
set -e

export AWS_PROFILE=nakom.is-sandbox

echo "Getting bucket name..."
BUCKET=$(aws cloudformation describe-stacks --stack-name UnsubCloudfrontStack \
  --query 'Stacks[0].Outputs[?OutputKey==`UnsubSiteBucketName`].OutputValue' --output text)
echo "Bucket: $BUCKET"

echo "Fixing content types..."
aws s3 cp s3://$BUCKET/index.html s3://$BUCKET/index.html \
  --content-type "text/html" --metadata-directive REPLACE

echo "Getting CloudFront distribution ID..."
DIST_ID=$(aws cloudformation describe-stacks --stack-name UnsubCloudfrontStack \
  --query 'Stacks[0].Outputs[?OutputKey==`UnsubSiteDistributionId`].OutputValue' --output text)
echo "Distribution: $DIST_ID"

echo "Invalidating CloudFront cache..."
aws cloudfront create-invalidation --distribution-id $DIST_ID --paths "/*"

echo "Done! Wait a minute for invalidation to complete, then try the URL again."
