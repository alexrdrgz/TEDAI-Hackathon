import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import routes from './routes';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: ['chrome-extension://*', 'http://localhost:*', 'https://localhost:*'],
  credentials: true
}));
app.use(express.json());

app.use('/api', routes);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
