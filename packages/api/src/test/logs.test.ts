import bcrypt from 'bcryptjs';
import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../lib/prisma.js';
import { calculateTotalHours } from '../utils/time.js';
import { createLogSchema, updateLogSchema } from '../validators/log.schema.js';

describe('Log Validators', () => {
  describe('createLogSchema', () => {
    it('should validate correct log data', () => {
      const result = createLogSchema.safeParse({
        date: '2026-01-15',
        weekNumber: 3,
        dayNumber: 2,
        timeIn: '08:00',
        timeOut: '17:00',
        tasksAccomplished: ['Task 1', 'Task 2'],
        keyLearnings: ['Learning 1'],
        challenges: 'Some challenges',
        goalsForTomorrow: 'Goals for tomorrow',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid date format', () => {
      const result = createLogSchema.safeParse({
        date: '15-01-2026',
        weekNumber: 3,
        dayNumber: 2,
        timeIn: '08:00',
        timeOut: '17:00',
        tasksAccomplished: [],
        keyLearnings: [],
        challenges: '',
        goalsForTomorrow: '',
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid time format', () => {
      const result = createLogSchema.safeParse({
        date: '2026-01-15',
        weekNumber: 3,
        dayNumber: 2,
        timeIn: '8:00',
        timeOut: '17:00',
        tasksAccomplished: [],
        keyLearnings: [],
        challenges: '',
        goalsForTomorrow: '',
      });
      expect(result.success).toBe(false);
    });

    it('should reject week number out of range', () => {
      const result = createLogSchema.safeParse({
        date: '2026-01-15',
        weekNumber: 53,
        dayNumber: 2,
        timeIn: '08:00',
        timeOut: '17:00',
        tasksAccomplished: [],
        keyLearnings: [],
        challenges: '',
        goalsForTomorrow: '',
      });
      expect(result.success).toBe(false);
    });

    it('should reject day number out of range', () => {
      const result = createLogSchema.safeParse({
        date: '2026-01-15',
        weekNumber: 3,
        dayNumber: 8,
        timeIn: '08:00',
        timeOut: '17:00',
        tasksAccomplished: [],
        keyLearnings: [],
        challenges: '',
        goalsForTomorrow: '',
      });
      expect(result.success).toBe(false);
    });

    it('should use default values for optional fields', () => {
      const result = createLogSchema.safeParse({
        date: '2026-01-15',
        weekNumber: 3,
        dayNumber: 2,
        timeIn: '08:00',
        timeOut: '17:00',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tasksAccomplished).toEqual([]);
        expect(result.data.keyLearnings).toEqual([]);
        expect(result.data.challenges).toBe('');
        expect(result.data.goalsForTomorrow).toBe('');
      }
    });
  });

  describe('updateLogSchema', () => {
    it('should have same validation as createLogSchema', () => {
      const data = {
        date: '2026-01-15',
        weekNumber: 3,
        dayNumber: 2,
        timeIn: '08:00',
        timeOut: '17:00',
        tasksAccomplished: ['Task 1'],
        keyLearnings: ['Learning 1'],
        challenges: 'Challenges',
        goalsForTomorrow: 'Goals',
      };
      const createResult = createLogSchema.safeParse(data);
      const updateResult = updateLogSchema.safeParse(data);
      expect(createResult.success).toBe(updateResult.success);
    });
  });
});

describe('Time Utilities', () => {
  it('should calculate total hours correctly', () => {
    expect(calculateTotalHours('08:00', '17:00')).toBe(9);
  });

  it('should handle lunch break correctly', () => {
    expect(calculateTotalHours('08:00', '12:00')).toBe(4);
    expect(calculateTotalHours('13:00', '17:00')).toBe(4);
  });

  it('should handle overnight shifts', () => {
    expect(calculateTotalHours('22:00', '06:00')).toBe(8);
  });

  it('should handle partial hours', () => {
    expect(calculateTotalHours('08:30', '17:30')).toBe(9);
    expect(calculateTotalHours('08:00', '16:30')).toBe(8.5);
  });

  it('should handle same time in and out', () => {
    expect(calculateTotalHours('08:00', '08:00')).toBe(0);
  });

  it('should handle midnight crossing', () => {
    expect(calculateTotalHours('23:00', '01:00')).toBe(2);
  });
});

describe('Database Operations', () => {
  let testCounter = 0;

  beforeEach(async () => {
    testCounter++;
    await prisma.oJTLog.deleteMany();
    await prisma.user.deleteMany();
  });

  it('should create and retrieve user', async () => {
    const hashedPassword = await bcrypt.hash('password123', 12);
    const user = await prisma.user.create({
      data: {
        email: `test${testCounter}@example.com`,
        password: hashedPassword,
      },
    });

    const retrievedUser = await prisma.user.findUnique({
      where: { id: user.id },
    });

    expect(retrievedUser).not.toBeNull();
    expect(retrievedUser?.email).toBe(`test${testCounter}@example.com`);
  });

  it('should create and retrieve log entry', async () => {
    const hashedPassword = await bcrypt.hash('password123', 12);
    const user = await prisma.user.create({
      data: {
        email: `test${testCounter}@example.com`,
        password: hashedPassword,
      },
    });

    const log = await prisma.oJTLog.create({
      data: {
        userId: user.id,
        date: '2026-01-15',
        weekNumber: 3,
        dayNumber: 2,
        timeIn: '08:00',
        timeOut: '17:00',
        totalHours: 9,
        tasksAccomplished: JSON.stringify(['Task 1', 'Task 2']),
        keyLearnings: JSON.stringify(['Learning 1']),
        challenges: 'Some challenges',
        goalsForTomorrow: 'Goals for tomorrow',
      },
    });

    const retrievedLog = await prisma.oJTLog.findUnique({
      where: { id: log.id },
    });

    expect(retrievedLog).not.toBeNull();
    expect(retrievedLog?.date).toBe('2026-01-15');
    expect(retrievedLog?.totalHours).toBe(9);
    expect(JSON.parse(retrievedLog?.tasksAccomplished || '[]')).toEqual(['Task 1', 'Task 2']);
  });

  it('should delete log entry', async () => {
    const hashedPassword = await bcrypt.hash('password123', 12);
    const user = await prisma.user.create({
      data: {
        email: `test${testCounter}@example.com`,
        password: hashedPassword,
      },
    });

    const log = await prisma.oJTLog.create({
      data: {
        userId: user.id,
        date: '2026-01-15',
        weekNumber: 3,
        dayNumber: 2,
        timeIn: '08:00',
        timeOut: '17:00',
        totalHours: 9,
        tasksAccomplished: JSON.stringify([]),
        keyLearnings: JSON.stringify([]),
        challenges: '',
        goalsForTomorrow: '',
      },
    });

    await prisma.oJTLog.delete({
      where: { id: log.id },
    });

    const deletedLog = await prisma.oJTLog.findUnique({
      where: { id: log.id },
    });

    expect(deletedLog).toBeNull();
  });

  it('should cascade delete logs when user is deleted', async () => {
    const hashedPassword = await bcrypt.hash('password123', 12);
    const user = await prisma.user.create({
      data: {
        email: `test${testCounter}@example.com`,
        password: hashedPassword,
      },
    });

    await prisma.oJTLog.create({
      data: {
        userId: user.id,
        date: '2026-01-15',
        weekNumber: 3,
        dayNumber: 2,
        timeIn: '08:00',
        timeOut: '17:00',
        totalHours: 9,
        tasksAccomplished: JSON.stringify([]),
        keyLearnings: JSON.stringify([]),
        challenges: '',
        goalsForTomorrow: '',
      },
    });

    await prisma.user.delete({
      where: { id: user.id },
    });

    const logs = await prisma.oJTLog.findMany({
      where: { userId: user.id },
    });

    expect(logs).toHaveLength(0);
  });

  it('should aggregate total hours correctly', async () => {
    const hashedPassword = await bcrypt.hash('password123', 12);
    const user = await prisma.user.create({
      data: {
        email: `test${testCounter}@example.com`,
        password: hashedPassword,
      },
    });

    await prisma.oJTLog.create({
      data: {
        userId: user.id,
        date: '2026-01-15',
        weekNumber: 3,
        dayNumber: 2,
        timeIn: '08:00',
        timeOut: '17:00',
        totalHours: 9,
        tasksAccomplished: JSON.stringify([]),
        keyLearnings: JSON.stringify([]),
        challenges: '',
        goalsForTomorrow: '',
      },
    });

    await prisma.oJTLog.create({
      data: {
        userId: user.id,
        date: '2026-01-16',
        weekNumber: 3,
        dayNumber: 3,
        timeIn: '09:00',
        timeOut: '18:00',
        totalHours: 9,
        tasksAccomplished: JSON.stringify([]),
        keyLearnings: JSON.stringify([]),
        challenges: '',
        goalsForTomorrow: '',
      },
    });

    const result = await prisma.oJTLog.aggregate({
      where: { userId: user.id },
      _sum: { totalHours: true },
    });

    expect(Number(result._sum.totalHours)).toBe(18);
  });
});
