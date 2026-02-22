import { Request, Router } from 'express';
import { z } from 'zod';
import {
  createGig,
  deleteGig,
  getGigById,
  getUserById,
  listGigs,
  listGigsByUser,
  updateGig,
} from '../db/repo.js';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.js';
import { validateBody, validateQuery } from '../middleware/validate.js';

const router = Router();

const createGigSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1),
  category: z.string().min(1).max(100),
  payRate: z.number().min(0),
  currency: z.string().max(10).optional(),
});

const updateGigSchema = createGigSchema.partial();

const listGigsQuerySchema = z.object({
  category: z.string().optional(),
  minPay: z.coerce.number().optional(),
  maxPay: z.coerce.number().optional(),
  search: z.string().optional(),
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
});

function toGigResponse(g: {
  id: string;
  title: string;
  description: string;
  category: string;
  pay_rate: number;
  currency: string;
  created_by: string;
  status: string;
  created_at: string;
  updated_at: string;
  creator_name?: string;
  creator_email?: string;
}) {
  return {
    _id: g.id,
    title: g.title,
    description: g.description,
    category: g.category,
    payRate: g.pay_rate,
    currency: g.currency,
    createdBy: {
      _id: g.created_by,
      name: g.creator_name ?? '',
      email: g.creator_email ?? '',
    },
    status: g.status,
    createdAt: g.created_at,
    updatedAt: g.updated_at,
  };
}

router.get('/mine', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const gigs = await listGigsByUser(req.user!.userId);
    res.json({ success: true, data: gigs.map(toGigResponse) });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch gigs' });
  }
});

router.get(
  '/',
  validateQuery(listGigsQuerySchema),
  async (req, res) => {
    try {
      const q = (req as Request & { query: z.infer<typeof listGigsQuerySchema> }).query;
      const { category, minPay, maxPay, search, page, limit } = q;
      const { gigs, total } = await listGigs({
        category,
        minPay,
        maxPay,
        search,
        page,
        limit,
      });
      res.json({
        success: true,
        data: {
          gigs: gigs.map(toGigResponse),
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Failed to fetch gigs' });
    }
  }
);

router.get('/:id', async (req, res) => {
  try {
    const gig = await getGigById(req.params.id);
    if (!gig) {
      return res.status(404).json({ success: false, error: 'Gig not found' });
    }
    const creatorUser = await getUserById(gig.created_by);
    res.json({
      success: true,
      data: toGigResponse({
        ...gig,
        creator_name: creatorUser?.name,
        creator_email: creatorUser?.email,
      }),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch gig' });
  }
});

router.post('/', authenticate, validateBody(createGigSchema), async (req: AuthenticatedRequest, res) => {
  try {
    const body = req.body as z.infer<typeof createGigSchema>;
    const gig = await createGig({
      ...body,
      createdBy: req.user!.userId,
    });
    const creatorUser = await getUserById(gig.created_by);
    res.status(201).json({
      success: true,
      data: toGigResponse({
        ...gig,
        creator_name: creatorUser?.name,
        creator_email: creatorUser?.email,
      }),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to create gig' });
  }
});

router.put(
  '/:id',
  authenticate,
  validateBody(updateGigSchema),
  async (req: AuthenticatedRequest, res) => {
    try {
      const gig = await updateGig(req.params.id, req.user!.userId, req.body as z.infer<typeof updateGigSchema>);
      if (!gig) {
        return res.status(404).json({ success: false, error: 'Gig not found or not owner' });
      }
      const creatorUser = await getUserById(gig.created_by);
      res.json({
        success: true,
        data: toGigResponse({
          ...gig,
          creator_name: creatorUser?.name,
          creator_email: creatorUser?.email,
        }),
      });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Failed to update gig' });
    }
  }
);

router.delete('/:id', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const ok = await deleteGig(req.params.id, req.user!.userId);
    if (!ok) {
      return res.status(404).json({ success: false, error: 'Gig not found or not owner' });
    }
    res.json({ success: true, message: 'Gig deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to delete gig' });
  }
});

export default router;
