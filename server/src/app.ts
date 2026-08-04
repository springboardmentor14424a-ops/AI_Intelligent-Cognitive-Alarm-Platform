import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import routes from './routes/index.js';
import { errorHandler } from './middleware/error.middleware.js';
import { initializeDatabase } from './db/init.js';

const app: Express = express();

// Middlewares
app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Intelligent Cognitive Alarm Backend API',
  });
});

// API Routes
app.use('/api', routes);

// Centralized Error Handling
app.use(errorHandler);

// Start server
const PORT = parseInt(env.PORT, 10) || 5000;
app.listen(PORT, async () => {
  console.log(`==================================================`);
  console.log(`🚀 Server running in ${env.NODE_ENV} mode on port ${PORT}`);
  console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
  console.log(`==================================================`);

  // Initialize PostgreSQL database tables & seed data
  await initializeDatabase();
});

export default app;
