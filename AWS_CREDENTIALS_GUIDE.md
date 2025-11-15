# Getting AWS Credentials for DynamoDB Access

## Quick Start

Your app needs the API Gateway URL to communicate with DynamoDB. Here's how to get it:

## Option 1: Get API Gateway URL (Recommended)

After deploying your Lambda and API Gateway (see AWS_SETUP.md), get your API URL:

```bash
# List your APIs
aws apigateway get-rest-apis --region ap-southeast-1

# Note the API ID, then get the URL
# Your URL will be: https://{api-id}.execute-api.ap-southeast-1.amazonaws.com/prod
```

Update `.env.local`:
```env
NEXT_PUBLIC_API_URL=https://YOUR_API_ID.execute-api.ap-southeast-1.amazonaws.com/prod
```

## Option 2: Quick Deploy with AWS CLI

If you haven't deployed yet, here's the fastest path:

### 1. Deploy Lambda Function

```bash
cd aws-lambda
zip function.zip check-in-handler.js

# Replace YOUR_ACCOUNT_ID with your AWS account ID
aws lambda create-function \
  --function-name skylytics-checkin-api \
  --runtime nodejs18.x \
  --role arn:aws:iam::YOUR_ACCOUNT_ID:role/lambda-dynamodb-role \
  --handler check-in-handler.handler \
  --zip-file fileb://function.zip \
  --environment Variables={TABLE_NAME=skylytics-checkins} \
  --region ap-southeast-1
```

### 2. Create API Gateway

```bash
# Create REST API
API_ID=$(aws apigateway create-rest-api \
  --name skylytics-api \
  --region ap-southeast-1 \
  --query 'id' \
  --output text)

echo "Your API ID: $API_ID"
echo "Your API URL: https://$API_ID.execute-api.ap-southeast-1.amazonaws.com/prod"
```

### 3. Update .env.local

Copy the URL from above into your `.env.local` file.

## Option 3: Use AWS Amplify (Easiest)

AWS Amplify handles everything automatically:

```bash
npm install -g @aws-amplify/cli
amplify init
amplify add api
amplify push
```

Amplify will automatically:
- Create DynamoDB table
- Deploy Lambda functions
- Set up API Gateway
- Configure CORS
- Provide you with the API URL

## Finding Your AWS Account ID

```bash
aws sts get-caller-identity --query Account --output text
```

## Checking if Resources Exist

```bash
# Check DynamoDB tables
aws dynamodb list-tables --region ap-southeast-1

# Check Lambda functions
aws lambda list-functions --region ap-southeast-1

# Check API Gateways
aws apigateway get-rest-apis --region ap-southeast-1
```

## Testing Your Setup

Once configured, test the connection:

```bash
# Test API endpoint
curl https://YOUR_API_ID.execute-api.ap-southeast-1.amazonaws.com/prod/check-in \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"pnr_id":"TEST123","pnr":"ABC123","passengerName":"Test User"}'
```

## Troubleshooting

### "Unable to connect to API"
- Check that your API Gateway is deployed
- Verify the URL in `.env.local` is correct
- Ensure CORS is enabled on API Gateway

### "Access Denied"
- Check Lambda execution role has DynamoDB permissions
- Verify API Gateway has permission to invoke Lambda

### "Table not found"
- Create DynamoDB table (see AWS_SETUP.md)
- Verify TABLE_NAME environment variable in Lambda

## Cost Considerations

With the free tier:
- DynamoDB: 25 GB storage, 25 read/write capacity units
- Lambda: 1M requests/month free
- API Gateway: 1M requests/month free (first 12 months)

For typical usage (100 check-ins/day), you'll stay within free tier limits.
