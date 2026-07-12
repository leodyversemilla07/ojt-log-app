# OJT Daily Logs

OJT Daily Logs is a monorepo application for recording internship/OJT daily activities, tracking rendered hours, and exporting reports.

## Tech Stack

### Frontend (`packages/web`)
- React 19 + TypeScript
- Vite
- Tailwind CSS v4 + shadcn UI

### Backend (`packages/api`)
- Express.js + TypeScript
- SQLite (via Prisma ORM)
- JWT Authentication

### Shared (`packages/shared`)
- TypeScript types and interfaces

## Project Structure

```
ojt-log-app/
├── packages/
│   ├── api/                 # Express.js backend
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   ├── seed.ts
│   │   │   └── dev.db
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   ├── middleware/
│   │   │   ├── validators/
│   │   │   └── utils/
│   │   ├── .env
│   │   └── package.json
│   ├── web/                 # React frontend
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── lib/
│   │   │   └── pages/
│   │   ├── .env
│   │   └── package.json
│   └── shared/              # Shared types
│       ├── src/
│       │   └── index.ts
│       └── package.json
├── package.json             # Root workspace config
└── README.md
```

## Prerequisites

- Node.js 18+
- npm

## Setup

### 1. Install all dependencies

```bash
npm install
```

### 2. Setup database

```bash
npm run db:generate
npm run db:push
npm run db:seed      # Optional: Add test data
```

### 3. Start development servers

```bash
npm run dev          # Starts both frontend and backend
```

Or start them separately:

```bash
npm run dev:api      # Backend on http://localhost:3001
npm run dev:web      # Frontend on http://localhost:5173
```

## Environment Variables

### Frontend (`packages/web/.env`)
```env
VITE_API_URL=http://localhost:3001
```

### Backend (`packages/api/.env`)
```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="your-secret-key"
JWT_EXPIRES_IN="7d"
PORT=3001
```

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login user |
| GET | `/api/auth/me` | Get current user |

### Logs
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/logs` | Get all logs (paginated) |
| GET | `/api/logs/stats` | Get total hours logged |
| GET | `/api/logs/:id` | Get single log |
| POST | `/api/logs` | Create new log |
| PUT | `/api/logs/:id` | Update log |
| DELETE | `/api/logs/:id` | Delete log |

## Scripts

### Root
- `npm run dev` - Start all dev servers
- `npm run build` - Build all packages
- `npm run test` - Run all tests

### Frontend (`packages/web`)
- `npm run dev:web` - Start frontend dev server
- `npm run build:web` - Build frontend
- `npm run test` - Run frontend tests

### Backend (`packages/api`)
- `npm run dev:api` - Start backend dev server
- `npm run build:api` - Build backend
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema to database
- `npm run db:seed` - Seed database

## Testing

```bash
npm test
```

## Test Account

After running `npm run db:seed`:
- **Email:** `test@example.com`
- **Password:** `password123`
