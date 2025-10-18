import express from 'express';
import routes from './routes';
import { initDatabase } from './services/db';

const app = express();
const PORT = process.env.PORT || 3000;

app.use('/api', routes);

(async () => {
  try {
    await initDatabase();
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  }
})();
