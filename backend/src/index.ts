import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import routes from './routes';
import { initDatabase } from './services/db';
import { initializeTools } from './services/tools';

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// CORS Configuration - production-ready with allowlist
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS || 'http://localhost:3001,http://localhost:3000';
const allowedOrigins = ALLOWED_ORIGINS.split(',').map(origin => origin.trim());

app.use(cors({
  origin: (origin, callback) => {
    // In development, allow requests with no origin (Postman, mobile apps, etc.)
    if (!origin && NODE_ENV === 'development') {
      return callback(null, true);
    }
    
    // Check if origin is in the allowed list
    if (origin && allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else if (NODE_ENV === 'development') {
      // In development, be more permissive and allow with a warning
      console.warn(`⚠️  CORS Warning: Origin '${origin}' not in ALLOWED_ORIGINS, but allowing in development mode`);
      callback(null, true);
    } else {
      // In production, strictly enforce the allowlist
      console.error(`❌ CORS Error: Origin '${origin}' is not allowed`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Request body size limits (10kb for JSON, 10kb for URL-encoded)
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Error handler for body size limit exceeded
app.use((err: any, req: any, res: any, next: any) => {
  if (err.type === 'entity.too.large') {
    res.status(413).json({
      success: false,
      error: 'Request body too large. Maximum size is 10kb.'
    });
    return;
  }
  next(err);
});

app.use('/api', routes);

(async () => {
  try {
    await initDatabase();
    initializeTools();
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  }
})();
