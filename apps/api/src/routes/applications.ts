import { Router } from 'express';
import { z } from 'zod';
import {
  createApplication,
  getGigById,
  getApplicationById,
  getApplicationWithDetails,
  listApplicationsByGig,
  listApplicationsByApplicant,
  updateApplicationStatus,
  hasApplication,
} from '../db/repo.js';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

const router = Router();

const createApplicationSchema = z.object({
  message: z.string().min(1).max(2000),
});

const updateApplicationSchema = z.object({
  status: z.enum(['pending', 'accepted', 'rejected']),
});

function toAppResponse(a: {
  id: string;
  gig_id: string;
  applicant_id: string;
  message: string;
  status: string;
  created_at: string;
  applicant_name?: string;
  applicant_email?: string;
  gig_title?: string;
}) {
  return {
    _id: a.id,
    gig: { _id: a.gig_id, title: a.gig_title },
    applicant: { _id: a.applicant_id, name: a.applicant_name, email: a.applicant_email },
    message: a.message,
    status: a.status,
    createdAt: a.created_at,
  };
}

function toAppResponseMy(a: {
  id: string;
  gig_id: string;
  applicant_id: string;
  message: string;
  status: string;
  created_at: string;
  gig_title?: string;
  gig_category?: string;
  gig_pay_rate?: number;
  gig_status?: string;
  gig_created_by?: string;
}) {
  return {
    _id: a.id,
    gig: {
      _id: a.gig_id,
      title: a.gig_title,
      category: a.gig_category,
      payRate: a.gig_pay_rate,
      status: a.gig_status,
      createdBy: a.gig_created_by,
    },
    applicant: a.applicant_id,
    message: a.message,
    status: a.status,
    createdAt: a.created_at,
  };
}

router.post(
  '/gigs/:gigId/applications',
  authenticate,
  validateBody(createApplicationSchema),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { gigId } = req.params;
      const { message } = req.body as z.infer<typeof createApplicationSchema>;
      const gig = await getGigById(gigId);
      if (!gig) {
        return res.status(404).json({ success: false, error: 'Gig not found' });
      }
      if (gig.status !== 'open') {
        return res.status(400).json({ success: false, error: 'Gig is not accepting applications' });
      }
      if (gig.created_by === req.user!.userId) {
        return res.status(400).json({ success: false, error: 'Cannot apply to your own gig' });
      }
      if (await hasApplication(gigId, req.user!.userId)) {
        return res.status(409).json({ success: false, error: 'Already applied to this gig' });
      }
      const application = await createApplication({
        gigId,
        applicantId: req.user!.userId,
        message,
      });
      if (!application) {
        return res.status(500).json({ success: false, error: 'Failed to create application' });
      }
      const populated = await getApplicationWithDetails(application.id);
      res.status(201).json({ success: true, data: populated ? toAppResponse(populated) : toAppResponse(application) });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Failed to create application' });
    }
  }
);

router.get('/gigs/:gigId/applications', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const gig = await getGigById(req.params.gigId);
    if (!gig || gig.created_by !== req.user!.userId) {
      return res.status(404).json({ success: false, error: 'Gig not found or not owner' });
    }
    const applications = await listApplicationsByGig(gig.id);
    res.json({ success: true, data: applications.map(toAppResponse) });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch applications' });
  }
});

router.get('/applications/me', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const applications = await listApplicationsByApplicant(req.user!.userId);
    res.json({ success: true, data: applications.map(toAppResponseMy) });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch applications' });
  }
});

router.patch(
  '/applications/:id',
  authenticate,
  validateBody(updateApplicationSchema),
  async (req: AuthenticatedRequest, res) => {
    try {
      const application = await getApplicationById(req.params.id);
      if (!application) {
        return res.status(404).json({ success: false, error: 'Application not found' });
      }
      const gig = await getGigById(application.gig_id);
      if (!gig || gig.created_by !== req.user!.userId) {
        return res.status(403).json({ success: false, error: 'Not the gig owner' });
      }
      const { status } = req.body as z.infer<typeof updateApplicationSchema>;
      const updated = await updateApplicationStatus(application.id, status, req.user!.userId);
      if (!updated) {
        return res.status(500).json({ success: false, error: 'Failed to update application' });
      }
      const populated = await getApplicationWithDetails(updated.id);
      res.json({ success: true, data: populated ? toAppResponse(populated) : toAppResponse(updated) });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Failed to update application' });
    }
  }
);

export default router;
