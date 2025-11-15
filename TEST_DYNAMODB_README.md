# DynamoDB Test Script

This standalone script tests DynamoDB operations for the CheckInRecords table.

## Features

- ✅ Inserts 20 mock passenger check-in records
- ✅ Retrieves a single record by PNR
- ✅ Scans all records to verify insertion
- ✅ Empty baggage array (as requested)

## Setup

1. Install dependencies:
```bash
pnpm install
```

2. Ensure your `.env.local` file has the correct AWS credentials:
```
AWS_REGION=ap-southeast-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_SESSION_TOKEN=your_session_token
```

3. Create the DynamoDB table:
```bash
pnpm setup:dynamodb
```

This will create the `CheckInRecords` table with:
   - Partition key: `pnr_id` (String)
   - Sort key: `pnr` (String)
   - Billing mode: Pay-per-request

## Usage

Run the test script:
```bash
pnpm test:dynamodb
```

Or directly with node:
```bash
node test-dynamodb.js
```

## What It Does

1. **Generates 20 mock passengers** with realistic data:
   - Random PNRs (6-character alphanumeric)
   - Flight numbers from airlines: SQ, CX, TG, MH, QF
   - Origins: SIN, HKG, BKK, KUL, SYD
   - Destinations: NRT, ICN, PVG, TPE, MNL
   - Random passenger names and seat assignments
   - Empty baggage arrays

2. **Inserts records** to DynamoDB one by one with progress feedback

3. **Tests retrieval** by fetching the first inserted record

4. **Scans table** to show total record count

## Functions Available

### `insertRecord(record)`
Inserts a single check-in record to DynamoDB.

### `insertMockData()`
Generates and inserts 20 mock passenger records.

### `getRecordByPNR(pnr_id, pnr)`
Retrieves a single record using the composite key.

### `getAllRecords()`
Scans and returns all records in the table.

## Sample Output

```
═══════════════════════════════════════════
  DynamoDB Test Script - Check-In Records
═══════════════════════════════════════════
Table: CheckInRecords
Region: ap-southeast-1
═══════════════════════════════════════════

🚀 Starting to insert 20 mock passengers...

✓ Inserted: John Smith (PNR: A1B2C3)
✓ Inserted: Jane Doe (PNR: D4E5F6)
...

✅ Successfully inserted 20 out of 20 records

🔍 Testing record retrieval...
✅ Successfully retrieved record

📊 Total records in table: 20
```

## Notes

- The script uses the AWS SDK v3 for DynamoDB operations
- All baggage arrays are empty as requested
- Each record has a unique `pnr_id` combining PNR and index
- Records are marked as `synced: true` by default
