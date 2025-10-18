import { Router } from 'express';
import { getSessionTimeline } from '../../services/timeline';

const router = Router();

router.get('/session-context', async (req, res) => {
  try {
    const sessionId = (req.query.sessionId as string) || '0';
    const timeline = await getSessionTimeline(sessionId);
    
    if (!timeline) {
      return res.json({ message: 'No timeline for this session', timeline: '' });
    }
    
    res.json({ sessionId, timeline });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error', details: (err as Error).message });
  }
});

export default router;
