import { execSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll } from 'vitest';

const prisma = new PrismaClient();

beforeAll(async () => {
  // Reset test database
  execSync('npx prisma db push --skip-generate', {
    cwd: process.cwd(),
    stdio: 'inherit',
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});

export { prisma };
