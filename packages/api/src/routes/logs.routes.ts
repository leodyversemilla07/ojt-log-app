import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { AppError } from '../utils/AppError.js';
import { calculateTotalHours } from '../utils/time.js';
import { createLogSchema, updateLogSchema } from '../validators/log.schema.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Helper to get authenticated user ID
function getUserId(req: { user?: { userId?: string } }): string {
  const userId = req.user?.userId;
  if (!userId) {
    throw new AppError('User not authenticated', 401);
  }
  return userId;
}

// GET /api/logs - Get all logs for current user (paginated with filters)
router.get('/', async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const page = parseInt(req.query.page as string, 10) || 0;
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const skip = page * limit;

    // Extract filter parameters
    const search = req.query.search as string | undefined;
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;
    const weekNumber = req.query.weekNumber
      ? parseInt(req.query.weekNumber as string, 10)
      : undefined;

    // Build where clause
    const where: Record<string, unknown> = { userId };

    if (search) {
      where.OR = [
        { tasksAccomplished: { contains: search } },
        { keyLearnings: { contains: search } },
        { challenges: { contains: search } },
        { goalsForTomorrow: { contains: search } },
      ];
    }

    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date = { ...(where.date as Record<string, string>), gte: startDate };
      }
      if (endDate) {
        where.date = { ...(where.date as Record<string, string>), lte: endDate };
      }
    }

    if (weekNumber) {
      where.weekNumber = weekNumber;
    }

    const [logs, total] = await Promise.all([
      prisma.oJTLog.findMany({
        where,
        orderBy: { date: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          date: true,
          weekNumber: true,
          dayNumber: true,
          timeIn: true,
          timeOut: true,
          totalHours: true,
          tasksAccomplished: true,
        },
      }),
      prisma.oJTLog.count({ where }),
    ]);

    res.json({
      status: 'success',
      data: {
        logs: logs.map(
          (log: {
            id: string;
            date: string;
            weekNumber: number;
            dayNumber: number;
            timeIn: string;
            timeOut: string;
            totalHours: number | string;
            tasksAccomplished: string;
          }) => ({
            ...log,
            totalHours: Number(log.totalHours),
            tasksAccomplished: JSON.parse(log.tasksAccomplished || '[]'),
          }),
        ),
        total,
        page,
        hasMore: skip + limit < total,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/logs/stats - Get total hours logged
router.get('/stats', async (req, res, next) => {
  try {
    const userId = getUserId(req);

    const result = await prisma.oJTLog.aggregate({
      where: { userId },
      _sum: { totalHours: true },
    });

    res.json({
      status: 'success',
      data: {
        totalHours: Number(result._sum.totalHours || 0),
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/logs/weekly-summary - Get hours grouped by week
router.get('/weekly-summary', async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const limit = Math.min(parseInt(req.query.weeks as string, 10) || 8, 52);

    const rows = await prisma.oJTLog.groupBy({
      by: ['weekNumber'],
      where: { userId },
      _sum: { totalHours: true },
      _count: { _all: true },
      _min: { date: true },
      _max: { date: true },
      orderBy: { weekNumber: 'desc' },
      take: limit,
    });

    const weeks = rows.map(
      (row: {
        weekNumber: number;
        _sum: { totalHours: number | null };
        _count: { _all: number };
        _min: { date: string | null };
        _max: { date: string | null };
      }) => ({
        weekNumber: row.weekNumber,
        totalHours: Number(row._sum.totalHours || 0),
        daysLogged: row._count._all,
        firstDate: row._min.date,
        lastDate: row._max.date,
      }),
    );

    // reverse so most recent is last (easier for charts)
    weeks.reverse();

    res.json({
      status: 'success',
      data: { weeks },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/logs/:id - Get single log
router.get('/:id', async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;

    const log = await prisma.oJTLog.findFirst({
      where: { id, userId },
    });

    if (!log) {
      throw new AppError('Log not found', 404);
    }

    res.json({
      status: 'success',
      data: {
        ...log,
        totalHours: Number(log.totalHours),
        tasksAccomplished: JSON.parse(log.tasksAccomplished || '[]'),
        keyLearnings: JSON.parse(log.keyLearnings || '[]'),
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/logs - Create new log
router.post('/', async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const input = createLogSchema.parse(req.body);

    const totalHours = calculateTotalHours(input.timeIn, input.timeOut);

    const log = await prisma.oJTLog.create({
      data: {
        userId,
        date: input.date,
        weekNumber: input.weekNumber,
        dayNumber: input.dayNumber,
        timeIn: input.timeIn,
        timeOut: input.timeOut,
        totalHours,
        tasksAccomplished: JSON.stringify(input.tasksAccomplished),
        keyLearnings: JSON.stringify(input.keyLearnings),
        challenges: input.challenges,
        goalsForTomorrow: input.goalsForTomorrow,
      },
    });

    res.status(201).json({
      status: 'success',
      data: {
        ...log,
        totalHours: Number(log.totalHours),
        tasksAccomplished: input.tasksAccomplished,
        keyLearnings: input.keyLearnings,
      },
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/logs/:id - Update log
router.put('/:id', async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;
    const input = updateLogSchema.parse(req.body);

    // Check if log exists and belongs to user
    const existingLog = await prisma.oJTLog.findFirst({
      where: { id, userId },
    });

    if (!existingLog) {
      throw new AppError('Log not found', 404);
    }

    const totalHours = calculateTotalHours(input.timeIn, input.timeOut);

    const log = await prisma.oJTLog.update({
      where: { id },
      data: {
        date: input.date,
        weekNumber: input.weekNumber,
        dayNumber: input.dayNumber,
        timeIn: input.timeIn,
        timeOut: input.timeOut,
        totalHours,
        tasksAccomplished: JSON.stringify(input.tasksAccomplished),
        keyLearnings: JSON.stringify(input.keyLearnings),
        challenges: input.challenges,
        goalsForTomorrow: input.goalsForTomorrow,
      },
    });

    res.json({
      status: 'success',
      data: {
        ...log,
        totalHours: Number(log.totalHours),
        tasksAccomplished: input.tasksAccomplished,
        keyLearnings: input.keyLearnings,
      },
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/logs/:id - Delete log
router.delete('/:id', async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;

    // Check if log exists and belongs to user
    const existingLog = await prisma.oJTLog.findFirst({
      where: { id, userId },
    });

    if (!existingLog) {
      throw new AppError('Log not found', 404);
    }

    await prisma.oJTLog.delete({ where: { id } });

    res.json({
      status: 'success',
      message: 'Log deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
