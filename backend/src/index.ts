import 'dotenv/config';
import express from 'express';
import chatRoutes from './chat/routes';
import monitoringRoutes from './monitoring/routes';
import './chat/models/database'; // Initialize chat database
import './monitoring/models/database'; // Initialize monitoring database

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Enable CORS for Chrome extension
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Add hello route for testing
app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello World' });
});

// Mount routes
app.use('/api/chat', chatRoutes);
app.use('/api/monitor', monitoringRoutes);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('Chat endpoints: /api/chat/*');
  console.log('Monitoring endpoints: /api/monitor/*');
});
