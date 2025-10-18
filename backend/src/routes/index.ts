import { Router } from 'express';
import chatRoutes from './chat';

const router = Router();

router.get('/hello', (req, res) => {
  res.json({ message: 'Hello World' });
});

// Chat routes
router.use('/chat', chatRoutes);

export default router;
