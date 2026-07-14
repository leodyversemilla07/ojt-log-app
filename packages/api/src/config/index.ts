import dotenv from 'dotenv';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

// Refuse to boot in production with the placeholder secret
const rawJwtSecret = process.env.JWT_SECRET || 'default-secret-change-this';
if (isProduction && rawJwtSecret === 'default-secret-change-this') {
  throw new Error('JWT_SECRET must be set to a strong value in production. Refusing to start.');
}
if (rawJwtSecret.length < 16) {
  throw new Error('JWT_SECRET must be at least 16 characters long.');
}

/**
 * Parse a comma-separated CORS allow-list from env.
 *   CORS_ORIGINS="https://app.example.com,https://www.example.com"
 * Falls back to the single FRONTEND_URL (or localhost in dev).
 */
function parseCorsOrigins(): string[] {
  const raw = process.env.CORS_ORIGINS || process.env.FRONTEND_URL || '';
  const split = raw
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  if (split.length > 0) return split;
  return isProduction ? [] : ['http://localhost:5173', 'http://localhost:4173'];
}

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction,
  jwtSecret: rawJwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  corsOrigins: parseCorsOrigins(),
  databaseUrl: process.env.DATABASE_URL,
};

if (isProduction && config.corsOrigins.length === 0) {
  throw new Error(
    'CORS_ORIGINS (or FRONTEND_URL) must be configured in production. Refusing to start.',
  );
}
