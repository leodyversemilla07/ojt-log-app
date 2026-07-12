import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create a test user
  const hashedPassword = await bcrypt.hash('password123', 12);

  const user = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      password: hashedPassword,
    },
  });

  console.log(`✅ Created test user: ${user.email}`);

  // Create some sample logs
  const sampleLogs = [
    {
      userId: user.id,
      date: '2025-01-13',
      weekNumber: 1,
      dayNumber: 1,
      timeIn: '08:00',
      timeOut: '17:00',
      totalHours: 9,
      tasksAccomplished: JSON.stringify([
        'Set up development environment',
        'Reviewed project documentation',
      ]),
      keyLearnings: JSON.stringify([
        'Learned about company coding standards',
        'Understanding project architecture',
      ]),
      challenges: 'Getting familiar with new tools and codebase',
      goalsForTomorrow: 'Complete first feature task',
    },
    {
      userId: user.id,
      date: '2025-01-14',
      weekNumber: 1,
      dayNumber: 2,
      timeIn: '08:30',
      timeOut: '17:30',
      totalHours: 9,
      tasksAccomplished: JSON.stringify([
        'Implemented login feature',
        'Fixed bugs from code review',
      ]),
      keyLearnings: JSON.stringify(['React best practices', 'Git workflow']),
      challenges: 'Understanding complex state management',
      goalsForTomorrow: 'Work on dashboard component',
    },
  ];

  for (const log of sampleLogs) {
    await prisma.oJTLog.create({ data: log });
  }

  console.log(`✅ Created ${sampleLogs.length} sample logs`);
  console.log('🎉 Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
