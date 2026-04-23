import express from 'express';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/user.js';
import problemRoutes from './routes/problem.js';
import feedbackRoutes from './routes/feedback.js';
import testRoutes from './routes/test.js';
import statsRoutes from './routes/stats.js';
import adminRoutes from './routes/admin.js';
import { APP_NAME, TOPICS, ALLOWED_EMAIL_DOMAIN } from './config/env.js';
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Allowed origins
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.CLIENT_URL,
].filter(Boolean);

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/problems', problemRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/tests', testRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/admin', adminRoutes);

// Public config — lets the client know topics, app name, etc. without hardcoding them.
app.get('/api/config', (req, res) => {
  res.json({
    appName: APP_NAME,
    topics: TOPICS,
    emailDomain: ALLOWED_EMAIL_DOMAIN,
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
