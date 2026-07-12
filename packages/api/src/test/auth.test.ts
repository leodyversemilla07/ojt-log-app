import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { beforeEach, describe, expect, it } from 'vitest';
import { config } from '../config/index.js';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../utils/AppError.js';
import { loginSchema, registerSchema } from '../validators/auth.schema.js';

describe('Auth Validators', () => {
  describe('registerSchema', () => {
    it('should validate correct registration data', () => {
      const result = registerSchema.safeParse({
        email: 'test@example.com',
        password: 'password123',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const result = registerSchema.safeParse({
        email: 'invalid-email',
        password: 'password123',
      });
      expect(result.success).toBe(false);
    });

    it('should reject short password', () => {
      const result = registerSchema.safeParse({
        email: 'test@example.com',
        password: '12345',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('loginSchema', () => {
    it('should validate correct login data', () => {
      const result = loginSchema.safeParse({
        email: 'test@example.com',
        password: 'password123',
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty password', () => {
      const result = loginSchema.safeParse({
        email: 'test@example.com',
        password: '',
      });
      expect(result.success).toBe(false);
    });
  });
});

describe('Auth Utils', () => {
  beforeEach(async () => {
    await prisma.oJTLog.deleteMany();
    await prisma.user.deleteMany();
  });

  it('should hash password correctly', async () => {
    const password = 'testpassword';
    const hashedPassword = await bcrypt.hash(password, 12);
    expect(hashedPassword).not.toBe(password);
    expect(await bcrypt.compare(password, hashedPassword)).toBe(true);
  });

  it('should generate valid JWT token', () => {
    const payload = { userId: 'test-id', email: 'test@example.com' };
    const token = jwt.sign(payload, config.jwtSecret, { expiresIn: '7d' });
    const decoded = jwt.verify(token, config.jwtSecret) as typeof payload;
    expect(decoded.userId).toBe(payload.userId);
    expect(decoded.email).toBe(payload.email);
  });

  it('should create user in database', async () => {
    const hashedPassword = await bcrypt.hash('password123', 12);
    const user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        password: hashedPassword,
      },
    });
    expect(user.email).toBe('test@example.com');
    expect(user.id).toBeDefined();
  });

  it('should throw AppError with correct properties', () => {
    const error = new AppError('Test error', 404);
    expect(error.message).toBe('Test error');
    expect(error.statusCode).toBe(404);
    expect(error.name).toBe('AppError');
  });
});
