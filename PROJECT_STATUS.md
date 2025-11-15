# Skylytics - Project Status

## ✅ What's Been Built

### Frontend (Complete)
- **Home Page** - Landing page with navigation to check-in and reconciliation
- **Check-In Page** - PNR lookup and passenger check-in flow
- **Baggage Tagging Page** - Add/remove baggage with tag generation
- **Reconciliation Page** - View sync queue, manual sync, CSV export
- **UI Components** - Full Radix UI component library with Tailwind styling
- **Online/Offline Detection** - Visual indicator and automatic sync management

### Local Storage (Complete)
- **IndexedDB Schema** - Matches your DynamoDB structure exactly
  - `pnr_id` (partition key)
  - `pnr` (sort key)
  - All fields: flightNumber, date, origin, destination, passengerName, seatNumber, baggage[], timestamp, deskId, synced
- **Sync Queue** - Tracks pending/synced/failed operations
- **Mock Data** - Demo PNRs for testing (ABC123, DEF456, GHI789, JKL012)

### Sync Logic (Complete)
- **API Client** - REST client with DynamoDB format conversion
- **Sync Manager** - Auto-sync every 30s when online, manual sync option
- **Queue Management** - Retry logic, error tracking, status updates
- **Offline-First** - All operations work offline, sync when connection returns

## 🔧 What Needs to Be Built

### Backend (AWS)
1. **DynamoDB Table** - Create table with pnr_id/pnr keys + GSI for PNR lookup
2. **Lambda Function** - Deploy `aws-lambda/check-in-handler.js`
3. **API Gateway** - Create REST API with POST /check-in and GET /pnr/{pnr}
4. **IAM Roles** - Lambda execution role with DynamoDB permissions

### Configuration
1. Copy `.env.local.example` to `.env.local`
2. Add your API Gateway URL to `NEXT_PUBLIC_API_URL`

## 📊 Database Schema

### Your DynamoDB Structure (Implemented)
```json
{
  "pnr_id": "ABC123-SMITH/JOHN",
  "pnr": "AB12CD",
  "flightNumber": "CX739",
  "date": "2025-10-24",
  "origin": "HKG",
  "destination": "SIN",
  "passengerName": "LEE/AMY",
  "seatNumber": "16C",
  "baggage": [
    {
      "tagNumber": "123456789",
      "weight": 18.2,
      "color": "RED",
      "status": "CHECKED"
    }
  ],
  "timestamp": "2025-10-24T10:14:55+08:00",
  "deskId": "HKG-F32",
  "synced": false
}
```

## 🚀 Quick Start

### Development
```bash
npm install
npm run dev
```

### Test Offline Mode
1. Open DevTools → Network tab
2. Set throttling to "Offline"
3. Check in passengers and add baggage
4. Go back online
5. Watch sync queue in reconciliation page

### Demo PNRs
- ABC123 - 2 passengers (SMITH/JOHN, SMITH/JANE)
- DEF456 - 1 passenger (JOHNSON/MICHAEL)
- GHI789 - 1 passenger (WILLIAMS/SARAH)
- JKL012 - 1 passenger (BROWN/DAVID)

## 📝 Next Steps

1. **Deploy AWS Infrastructure** (see AWS_SETUP.md)
   - Create DynamoDB table
   - Deploy Lambda function
   - Configure API Gateway
   - Get API URL

2. **Configure Frontend**
   - Add API URL to .env.local
   - Test sync with real backend

3. **Optional Enhancements**
   - Add authentication (Cognito)
   - Add real-time sync (WebSockets)
   - Add boarding pass printing
   - Add flight manifest export
   - Add multi-desk support

## 🔑 Key Features

- ✅ Full offline support with IndexedDB
- ✅ Automatic sync when online
- ✅ Manual sync option
- ✅ CSV export for manual reconciliation
- ✅ Retry logic with error tracking
- ✅ Real-time queue monitoring
- ✅ Baggage tag generation
- ✅ DynamoDB-compatible data format
- ✅ REST API ready (just needs deployment)

## 📦 Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript
- **UI**: Radix UI, Tailwind CSS
- **Storage**: IndexedDB (browser)
- **Backend**: AWS Lambda, API Gateway, DynamoDB
- **Sync**: Custom offline-first sync manager
