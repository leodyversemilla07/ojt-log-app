# Contributing to OJT Daily Log App

Thank you for your interest in contributing! This document provides guidelines and information for contributors.

## Development Setup

### Prerequisites

- Node.js 22+
- npm 10+
- Docker (optional, for containerized development)

### Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/ojt-log-app.git
   cd ojt-log-app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up the database:
   ```bash
   npm run db:generate
   npm run db:push
   npm run db:seed
   ```

4. Start development servers:
   ```bash
   npm run dev
   ```

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start both API and Web servers |
| `npm run build` | Build all packages |
| `npm test` | Run all tests |
| `npm run lint` | Check for lint errors |
| `npm run lint:fix` | Fix lint errors automatically |
| `npm run format` | Format code with Biome |

## Project Structure

```
ojt-log-app/
├── packages/
│   ├── api/          # Express.js backend
│   ├── web/          # React frontend
│   └── shared/       # Shared TypeScript types
├── .github/          # GitHub Actions workflows
├── biome.json        # Linting/formatting config
├── package.json      # Root package with workspaces
└── docker-compose.yml
```

## Development Workflow

1. Create a feature branch from `main`
2. Make your changes
3. Run tests: `npm test`
4. Run lint: `npm run lint`
5. Commit using conventional commits
6. Push and create a pull request

## Code Style

We use Biome for linting and formatting. Run `npm run lint:fix` to auto-fix issues.

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat: add new feature`
- `fix: bug fix`
- `docs: documentation changes`
- `refactor: code refactoring`
- `test: add tests`
- `chore: maintenance tasks`

## Testing

- **API tests**: Vitest with Supertest
- **Web tests**: Vitest with React Testing Library

Run tests before submitting a PR:
```bash
npm test
```

## Pull Requests

1. Fill out the PR template
2. Link related issues
3. Ensure CI passes
4. Request review from maintainers

## Questions?

Open an issue for any questions or discussions.
