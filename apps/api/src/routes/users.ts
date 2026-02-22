import { Router } from 'express';
import { getUserById } from '../db/repo.js';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

function toUserResponse(row: { id: string; email: string; name: string; created_at: string }) {
  return { id: row.id, email: row.email, name: row.name, createdAt: row.created_at };
}

router.get('/me', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const user = await getUserById(req.user!.userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    res.json({ success: true, data: toUserResponse(user) });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch user' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const user = await getUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    res.json({ success: true, data: toUserResponse(user) });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch user' });
  }
});

export default router;
