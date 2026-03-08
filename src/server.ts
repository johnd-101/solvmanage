import dotenv from 'dotenv';
dotenv.config();

import express      from 'express';
import cors         from 'cors';
import bodyParser   from 'body-parser';
import cookie from 'cookie';
import authRoutes   from './routes/auth.routes';

const app  = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ───────────────────────────────────────────────────────────────

app.use(cors({
  origin:      process.env.ALLOWED_ORIGINS?.split(',') ?? 'http://localhost:3000',
  credentials: true,   // required for cookies
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Parse cookies manually (avoids cookie-parser dependency)
app.use((req, _res, next) => {
  req.cookies = req.headers.cookie ? cookie.parse(req.headers.cookie) : {};
  next();
});

// Remove fingerprinting headers
app.disable('x-powered-by');

// ─── Routes ───────────────────────────────────────────────────────────────────

app.use('/api/auth', authRoutes);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found.' });
});

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Unhandled Error]', err);
  res.status(500).json({ error: 'Internal server error.' });
});

// ─── Start ────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`\n🔐 Auth server running on http://localhost:${PORT}`);
  console.log(`   POST /api/auth/register`);
  console.log(`   POST /api/auth/login`);
  console.log(`   POST /api/auth/refresh`);
  console.log(`   POST /api/auth/logout`);
  console.log(`   GET  /api/auth/me\n`);
});

export default app;