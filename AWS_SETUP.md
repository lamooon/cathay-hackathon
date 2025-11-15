# AWS Setup Guide for Skylytics

## DynamoDB Table Setup

### 1. Create DynamoDB Table

```bash
aws dynamodb create-table \
  --table-name skylytics-checkins \
  --attribute-definitions \
    AttributeName=pnr_id,AttributeType=S \
    AttributeName=pnr,AttributeType=S \
  --key-schema \
    AttributeName=pnr_id,KeyType=HASH \
    AttributeName=pnr,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST \
  --region ap-southeast-1
```

### 2. Create Global Secondary Index (GSI) for PNR lookup

```bash
aws dynamodb update-table \
  --table-name skylytics-checkins \
  --attribute-definitions AttributeName=pnr,AttributeType=S \
  --global-secondary-index-updates \
    "[{\"Create\":{\"IndexName\":\"pnr-index\",\"KeySchema\":[{\"AttributeName\":\"pnr\",\"KeyType\":\"HASH\"}],\"Projection\":{\"ProjectionType\":\"ALL\"}}}]" \
  --region ap-southeast-1
```

## Lambda Function Setup

### 1. Create IAM Role for Lambda

Create a role with these policies:
- `AWSLambdaBasicExecutionRole` (for CloudWatch logs)
- Custom policy for DynamoDB access:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:PutItem",
        "dynamodb:GetItem",
        "dynamodb:Query",
        "dynamodb:Scan"
      ],
      "Resource": [
        "arn:aws:dynamodb:ap-southeast-1:*:table/skylytics-checkins",
        "arn:aws:dynamodb:ap-southeast-1:*:table/skylytics-checkins/index/*"
      ]
    }
  ]
}
```

### 2. Deploy Lambda Function

```bash
# Package the Lambda function
cd aws-lambda
zip function.zip check-in-handler.js

# Create Lambda function
aws lambda create-function \
  --function-name skylytics-checkin-api \
  --runtime nodejs18.x \
  --role arn:aws:iam::YOUR_ACCOUNT_ID:role/lambda-dynamodb-role \
  --handler check-in-handler.handler \
  --zip-file fileb://function.zip \
  --environment Variables={TABLE_NAME=skylytics-checkins} \
  --region ap-southeast-1
```

## API Gateway Setup

### 1. Create REST API

```bash
aws apigateway create-rest-api \
  --name skylytics-api \
  --description "Skylytics Check-in API" \
  --region ap-southeast-1
```

### 2. Configure Routes

Create these routes in API Gateway:
- `POST /check-in` - Sync check-in record
- `GET /pnr/{pnr}` - Get records by PNR

### 3. Enable CORS

Add CORS headers to all responses (already included in Lambda handler).

### 4. Deploy API

```bash
aws apigateway create-deployment \
  --rest-api-id YOUR_API_ID \
  --stage-name prod \
  --region ap-southeast-1
```

Your API URL will be:
```
https://YOUR_API_ID.execute-api.ap-southeast-1.amazonaws.com/prod
```

## Frontend Configuration

1. Copy `.env.local.example` to `.env.local`
2. Update `NEXT_PUBLIC_API_URL` with your API Gateway URL:

```env
NEXT_PUBLIC_API_URL=https://YOUR_API_ID.execute-api.ap-southeast-1.amazonaws.com/prod
```

## Testing

### Test DynamoDB Insert

```bash
aws dynamodb put-item \
  --table-name skylytics-checkins \
  --item file://test-item.json \
  --region ap-southeast-1
```

### Test Lambda Function

```bash
aws lambda invoke \
  --function-name skylytics-checkin-api \
  --payload file://test-event.json \
  --region ap-southeast-1 \
  response.json
```

### Test API Gateway

```bash
curl -X POST https://YOUR_API_ID.execute-api.ap-southeast-1.amazonaws.com/prod/check-in \
  -H "Content-Type: application/json" \
  -d @test-checkin.json
```

## Cost Estimation

- **DynamoDB**: Pay-per-request pricing (~$1.25 per million writes)
- **Lambda**: First 1M requests free, then $0.20 per 1M requests
- **API Gateway**: $3.50 per million requests

For typical usage (100 check-ins/day):
- Monthly cost: < $5

## Alternative: Use AWS Amplify

For simpler setup, consider AWS Amplify which handles all of this automatically:

```bash
npm install -g @aws-amplify/cli
amplify init
amplify add api
amplify push
```

This will create DynamoDB, Lambda, and API Gateway automatically with proper configuration.
