#!/bin/bash

# This script sets the configuration for the Email Unsubscribe web application.
# It should be run before the build process.

function setValue() {
    local key="$1"
    local value="$2"
    echo "Setting $key"
    local file="$SCRIPT_DIR/../src/config/config.json"
    sed -i.bk "s|\"$key\": \".*\"|\"$key\": \"$value\"|g" "$file"
}

PARAM=$1
ENV="${PARAM:=sandbox}"

if [[ $ENV == "localhost" ]]; then
    export AWS_ENV=sandbox
else
    export AWS_ENV=$ENV
fi

SCRIPT_DIR="$(dirname "$(readlink -f "$0")")"
export AWS_PROFILE=nakom.is-$AWS_ENV

rm -rf $SCRIPT_DIR/../src/config/config.json
cp $SCRIPT_DIR/../src/config/config.json.template $SCRIPT_DIR/../src/config/config.json

setValue env $ENV

setValue region $(aws configure get region)

USER_POOL_ID=$(aws cognito-idp list-user-pools --max-results 60 | jq -r '.UserPools[] | select(.Name == "UnsubUserPool") | .Id')

setValue authority "https://cognito-idp.eu-west-2.amazonaws.com/"$USER_POOL_ID

setValue userPoolId $USER_POOL_ID

USER_POOL_CLIENT_ID=$(aws cognito-idp list-user-pool-clients --user-pool-id $USER_POOL_ID | jq -r '.UserPoolClients[] | select(.ClientName == "UnsubUserPoolClient") | .ClientId')

setValue userPoolClientId $USER_POOL_CLIENT_ID

API_URL=$(aws cloudformation describe-stacks --stack-name UnsubApiStack --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' --output text)

setValue apiUrl $API_URL

case $ENV in
    sandbox)
        setValue redirectUri "https://unsubscribe.sandbox.nakomis.com/loggedin"
        setValue logoutUri "https://unsubscribe.sandbox.nakomis.com/logout"
        setValue cognitoDomain "auth.unsubscribe.sandbox.nakomis.com"
        ;;
    localhost)
        setValue redirectUri "http://localhost:3000/loggedin"
        setValue logoutUri "http://localhost:3000/logout"
        setValue cognitoDomain "auth.unsubscribe.sandbox.nakomis.com"
        ;;
    *)
        echo "Unknown environment: $ENV"
        exit 1
        ;;
esac

rm -f $SCRIPT_DIR/../src/config/config.json.bk
