import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { config } from './config/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { apiLimiter, authLimiter, writeLimiter } from './middleware/rateLimiter.js';
import { requestLogger, sanitizeInput, securityHeaders } from './middleware/security.js';
import authRoutes from './routes/auth.routes.js';
import logRoutes from './routes/logs.routes.js';

const app = express();

// Security middleware
app.use(helmet());
app.use(securityHeaders);
app.use(
  cors({
    origin: config.nodeEnv === 'production' ? config.frontendUrl : '*',
    credentials: true,
  }),
);

// Rate limiting
app.use('/api', apiLimiter);

// Request parsing and sanitization
app.use(express.json({ limit: '10mb' }));
app.use(sanitizeInput);

// Logging in development
if (config.nodeEnv === 'development') {
  app.use(requestLogger);
}

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes with rate limiting
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/logs', logRoutes);

// Apply write limiter to mutating routes
app.use('/api/logs', writeLimiter);

// Error handling
app.use(errorHandler);

// Start server
app.listen(config.port, () => {
  console.log(`🚀 Server running on http://localhost:${config.port}`);
  console.log(`📝 Environment: ${config.nodeEnv}`);
  console.log(`🔒 Security features enabled`);
});

export default app;
