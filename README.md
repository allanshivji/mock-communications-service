# Mock Communications Service

A production-ready assessment async REST + WebSocket service that simulates a calling platform with real-time state management, rate limiting, and background recording uploads.

Built with **Node.js**, **TypeScript**, **Express**, **PostgreSQL**, **Redis**, and **Docker**.


## ✨ Features

- **RESTful API** with async request handling
- **WebSocket** for real-time call state updates
- **Dual Rate Limiting**:
  - Concurrent calls limit (3 per API key)
  - Calls per second limit (2 per API key)
- **Automatic State Machine**: Calls automatically progress through states
- **Background Job Processing**: Non-blocking recording uploads using Bull queue
- **Redis State Management**: Fast, in-memory call state tracking
- **PostgreSQL Persistence**: Durable call record storage
- **API Key Authentication**: Bearer token-based security
- **Docker Compose**: Fully containerized for easy deployment
- **TypeScript**: Fully typed codebase for type safety

---

## 🛠️ Tech Stack

| Component | Technology |
|-----------|------------|
| **Runtime** | Node.js 18 |
| **Language** | TypeScript |
| **Web Framework** | Express.js |
| **Database** | PostgreSQL 15 |
| **Cache/Queue** | Redis 7 |
| **Job Queue** | Bull (Redis-based) |
| **WebSocket** | ws library |
| **Containerization** | Docker & Docker Compose |

---

### System Components

- **API Service**: Handles HTTP/WebSocket requests, manages call lifecycle
- **Worker Service**: Processes background recording upload jobs
- **PostgreSQL**: Stores call records and metrics
- **Redis**: Manages live state, rate limiting counters, and job queue

---

## 📦 Prerequisites

Before running this application, ensure you have:

- **Docker** (version 20.x or higher)
- **Docker Compose** (version 2.x or higher)

That's it! No need to install Node.js, PostgreSQL, or Redis locally.

### Verify Installation
```bash
docker --version
docker compose version
```

---

## 🚀 Installation & Setup
## Option 1: Docker
### Step 1: Clone the Repository
```bash
git clone 
cd mock-communications-service
```

### Step 2: Configure Environment Variables

Copy the example environment file:
```bash
cp .env.example .env
```

The default values in `.env.example` are ready to use. No changes needed for Docker setup.

**Important**: For Docker, ensure these values:
```env
POSTGRES_HOST=postgres
REDIS_HOST=redis
```

### Step 3: Start All Services
```bash
docker compose up --build
```

This command will:
- Build the Docker images
- Start PostgreSQL, Redis, API, and Worker services
- Create necessary networks and volumes

**Wait about 30 seconds** for all services to start and health checks to pass.

### Step 4: Run Database Migrations

In a **new terminal window**, run:
```bash
docker compose exec api npm run migrate
```

**Expected output:**
```
🔄 Running database migrations...
✅ Calls table created/verified
✅ Indexes created/verified
✅ Metrics table created/verified
✅ Initial metrics row created/verified
🎉 All migrations completed successfully!
```

### Step 5: Verify Services

Check that all services are running:
```bash
docker compose ps
```

**Expected output:**
```
NAME            STATUS          PORTS
mock_postgres   Up (healthy)    0.0.0.0:5433->5432/tcp
mock_redis      Up (healthy)    0.0.0.0:6379->6379/tcp
mock_api        Up              0.0.0.0:3000->3000/tcp
mock_worker     Up              
```

### Step 6: Test the API
```bash
curl http://localhost:3000/health
```

**Expected response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-11-18T...",
  "uptime": 15.234
}
```

✅ **You're all set!** The service is now running.


## Option 2: Local (Without Docker)

If you prefer to run the services locally for development:

### Prerequisites
- Node.js 18+
- PostgreSQL running locally on port 5432
- Redis running locally on port 6379

### Setup

1. **Install dependencies:**
```bash
npm install
```

2. **Configure environment for local:**
```bash
cp .env.example .env
```

Edit `.env` and change:
```env
POSTGRES_HOST=localhost
POSTGRES_PORT=5432  # or 5433 if using Docker PostgreSQL
REDIS_HOST=localhost
```

3. **Run migrations:**
```bash
npm run migrate
```

4. **Start API server** (Terminal 1):
```bash
npm run dev
```

5. **Start background worker** (Terminal 2):
```bash
npm run worker
```

The API will be available at `http://localhost:3000`

---

## 📖 API Documentation

### Base URL
```
http://localhost:3000
```

### Authentication

All endpoints (except `/health` and `/`) require authentication via Bearer token:
```
Authorization: Bearer <API_KEY>
```

**Available API Keys** (configured in `.env`):
- `test-api-key-1`
- `test-api-key-2`
- `demo-key`

---

### Endpoints

#### 1. Health Check
```http
GET /health
```

**Response (200):**
```json
{
  "status": "healthy",
  "timestamp": "2025-11-18T12:00:00.000Z",
  "uptime": 123.456
}
```

---

#### 2. Create a Call
```http
POST /calls
Authorization: Bearer test-api-key-1
Content-Type: application/json

{
  "from": "+1234567890",
  "to": "+0987654321",
  "metadata": {
    "customer_id": "12345",
    "campaign": "support"
  }
}
```

**Response (201):**
```json
{
  "call_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "QUEUED",
  "websocket_url": "ws://localhost:3000/ws?call_id=550e8400-e29b-41d4-a716-446655440000",
  "from": "+1234567890",
  "to": "+0987654321",
  "created_at": "2025-11-18T12:00:00.000Z"
}
```

**Error Responses:**

**400 Bad Request** - Missing required fields:
```json
{
  "error": "Bad Request",
  "message": "Missing required fields: from, to"
}
```

**401 Unauthorized** - Invalid or missing API key:
```json
{
  "error": "Unauthorized",
  "message": "Invalid API key"
}
```

**429 Rate Limit Exceeded** - Concurrent limit reached:
```json
{
  "error": "Rate limit exceeded",
  "message": "Maximum concurrent calls reached (3)"
}
```

**429 Rate Limit Exceeded** - CPS limit reached:
```json
{
  "error": "Rate limit exceeded",
  "message": "Calls per second limit exceeded (2)"
}
```

---

#### 3. Get Call Status
```http
GET /calls/{call_id}
Authorization: Bearer test-api-key-1
```

**Response (200):**
```json
{
  "call_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "COMPLETED",
  "from": "+1234567890",
  "to": "+0987654321",
  "metadata": {
    "customer_id": "12345",
    "campaign": "support"
  },
  "recording_url": "https://mock-recordings-bucket.s3.us-east-1.amazonaws.com/recordings/550e8400-e29b-41d4-a716-446655440000.mp3",
  "created_at": "2025-11-18T12:00:00.000Z",
  "updated_at": "2025-11-18T12:00:15.000Z"
}
```

**Error Response:**

**404 Not Found** - Call doesn't exist:
```json
{
  "error": "Not Found",
  "message": "Call not found"
}
```

---

#### 4. Get System Metrics
```http
GET /metrics
Authorization: Bearer test-api-key-1
```

**Response (200):**
```json
{
  "total_calls": 150,
  "active_calls": 2,
  "completed_calls": 148,
  "current_cps": 1,
  "uploads_in_progress": 1,
  "uploads_completed": 145
}
```

---

### WebSocket Connection

Connect to receive real-time call state updates:

**Connection URL:**
```
ws://localhost:3000/ws?call_id=<CALL_ID>
```

**State Transitions:**
```
QUEUED -> RINGING -> ANSWERED -> COMPLETED (70% of calls)
              |
           UNANSWERED -> COMPLETED (30% of calls)
```

---

## 🧪 Testing

### Basic Testing

#### Test 1: Create a Call
```bash
curl -X POST http://localhost:3000/calls \
  -H "Authorization: Bearer test-api-key-1" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "+1234567890",
    "to": "+0987654321",
    "metadata": {"test": true}
  }'
```

Save the `call_id` from the response.

#### Test 2: Get Call Status
```bash
curl http://localhost:3000/calls/ \
  -H "Authorization: Bearer test-api-key-1"
```

#### Test 3: Get Metrics
```bash
curl http://localhost:3000/metrics \
  -H "Authorization: Bearer test-api-key-1"
```

#### Test 4: Test Authentication

**Should fail (401 Unauthorized):**
```bash
curl http://localhost:3000/calls \
  -H "Authorization: Bearer invalid-key"
```

---

### Rate Limiting Tests

#### Test CPS Limit (2 calls per second)

Send 4 requests quickly:
```bash
for i in {1..4}; do
  curl -s -X POST http://localhost:3000/calls \
    -H "Authorization: Bearer test-api-key-1" \
    -H "Content-Type: application/json" \
    -d "{\"from\": \"+111$i\", \"to\": \"+222$i\"}" &
done
wait
```

**Expected:** 2 succeed, 2 fail with "Calls per second limit exceeded"

#### Test Concurrent Limit (3 calls at once)

This test requires spacing requests so calls overlap:
```bash
# Send 3 calls with 2-second spacing
curl -s -X POST http://localhost:3000/calls \
  -H "Authorization: Bearer test-api-key-1" \
  -H "Content-Type: application/json" \
  -d '{"from": "+1111", "to": "+2222"}'

sleep 2

curl -s -X POST http://localhost:3000/calls \
  -H "Authorization: Bearer test-api-key-1" \
  -H "Content-Type: application/json" \
  -d '{"from": "+3333", "to": "+4444"}'

sleep 2

curl -s -X POST http://localhost:3000/calls \
  -H "Authorization: Bearer test-api-key-1" \
  -H "Content-Type: application/json" \
  -d '{"from": "+5555", "to": "+6666"}'

# Now send 4 more quickly while first 3 are still running
sleep 2
for i in {1..4}; do
  curl -s -X POST http://localhost:3000/calls \
    -H "Authorization: Bearer test-api-key-1" \
    -H "Content-Type: application/json" \
    -d "{\"from\": \"+777$i\", \"to\": \"+888$i\"}" &
done
wait
```

**Expected:** One call may succeed (reaching 3 concurrent), others fail with "Maximum concurrent calls reached"

---

### Observing Call State Transitions

Watch API logs to see state machine in action:
```bash
docker compose logs -f api
```

**You'll see:**
```
Call abc-123: QUEUED → RINGING
Call abc-123: RINGING → ANSWERED
Call abc-123: ANSWERED → COMPLETED
📥 Enqueued recording upload job for call: abc-123
```

Watch worker logs to see recording uploads:
```bash
docker compose logs -f worker
```

**You'll see:**
```
📤 [Job 1] Processing recording upload for call: abc-123
📤 [Job 1] Uploading recording to S3...
✅ Mock upload completed for call abc-123
📤 [Job 1] Updating call record with URL
✅ [Job 1] Recording upload completed
```

## ⚙️ Configuration

All configuration is done via environment variables in `.env` file.

### Key Configuration Options

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | API server port | `3000` |
| `POSTGRES_HOST` | PostgreSQL hostname | `postgres` (Docker) |
| `POSTGRES_PORT` | PostgreSQL port | `5432` |
| `POSTGRES_DB` | Database name | `mock_communications` |
| `REDIS_HOST` | Redis hostname | `redis` (Docker) |
| `REDIS_PORT` | Redis port | `6379` |
| `MAX_CONCURRENT_CALLS_PER_KEY` | Max simultaneous calls per API key | `3` |
| `MAX_CPS_PER_KEY` | Max calls per second per API key | `2` |
| `VALID_API_KEYS` | Comma-separated list of valid API keys | See `.env.example` |

---

## 🗄️ Database Schema

### `calls` Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `from_number` | VARCHAR(20) | Caller phone number |
| `to_number` | VARCHAR(20) | Recipient phone number |
| `status` | VARCHAR(20) | Current call state |
| `metadata` | JSONB | Additional call data |
| `recording_url` | TEXT | S3 URL after upload |
| `api_key` | VARCHAR(100) | API key that created call |
| `created_at` | TIMESTAMP | Creation timestamp |
| `updated_at` | TIMESTAMP | Last update timestamp |

**Indexes:**
- `idx_calls_status` on `status`
- `idx_calls_api_key` on `api_key`
- `idx_calls_created_at` on `created_at DESC`

### `metrics` Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL | Primary key |
| `total_calls` | INTEGER | Total calls created |
| `active_calls` | INTEGER | Currently active calls |
| `completed_calls` | INTEGER | Completed calls |
| `uploads_completed` | INTEGER | Successful uploads |
| `uploads_in_progress` | INTEGER | Ongoing uploads |
| `updated_at` | TIMESTAMP | Last update timestamp |

---

## 🛑 Stopping the Service

**Stop all services:**
```bash
docker compose down
```

**Stop and remove all data (including database):**
```bash
docker compose down -v
```

---

## 📝 Development Notes

- This is a **mock/demonstration environment**, not production-ready
- S3 uploads are **simulated** - no actual AWS integration required
- API keys are stored in `.env` for simplicity
