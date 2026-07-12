# OJT Log Backend API

Express.js backend API for the OJT Daily Log application.

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Language:** TypeScript
- **Database:** SQLite
- **ORM:** Prisma
- **Auth:** JWT (JSON Web Tokens)
- **Validation:** Zod

## Prerequisites

- Node.js 18+ 
- npm or yarn

## Setup

### 1. Install dependencies

```bash
cd backend
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` with a secure JWT secret (database is pre-configured for SQLite).

### 3. Setup database

```bash
# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# Seed database with test data (optional)
npm run db:seed
```

### 4. Start development server

```bash
npm run dev
```

The API will be available at `http://localhost:3001`

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login user |
| GET | `/api/auth/me` | Get current user (requires token) |

### Logs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/logs` | Get all logs (paginated) |
| GET | `/api/logs/stats` | Get total hours logged |
| GET | `/api/logs/:id` | Get single log |
| POST | `/api/logs` | Create new log |
| PUT | `/api/logs/:id` | Update log |
| DELETE | `/api/logs/:id` | Delete log |

## Example Requests

### Register

```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password123"}'
```

### Login

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password123"}'
```

### Create Log (with auth token)

```bash
curl -X POST http://localhost:3001/api/logs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "date": "2025-01-13",
    "weekNumber": 1,
    "dayNumber": 1,
    "timeIn": "08:00",
    "timeOut": "17:00",
    "tasksAccomplished": ["Task 1", "Task 2"],
    "keyLearnings": ["Learning 1"],
    "challenges": "Some challenges",
    "goalsForTomorrow": "Goals"
  }'
```

## Project Structure

```
backend/
├── prisma/
│   ├── schema.prisma      # Database schema
│   └── seed.ts            # Seed script
├── src/
│   ├── config/
│   │   └── index.ts       # Configuration
│   ├── lib/
│   │   └── prisma.ts      # Prisma client
│   ├── middleware/
│   │   ├── auth.ts        # JWT authentication
│   │   └── errorHandler.ts # Error handling
│   ├── routes/
│   │   ├── auth.routes.ts # Auth endpoints
│   │   └── logs.routes.ts # Log endpoints
│   ├── validators/
│   │   ├── auth.schema.ts # Auth validation
│   │   └── log.schema.ts  # Log validation
│   ├── utils/
│   │   ├── AppError.ts    # Custom error class
│   │   └── time.ts        # Time utilities
│   └── index.ts           # Entry point
├── .env.example           # Environment template
├── package.json
└── tsconfig.json
```
