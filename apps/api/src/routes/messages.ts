import { Router } from 'express';
import { z } from 'zod';
import {
  createMessage,
  getGigById,
  getMessageWithDetails,
  hasApplication,
  listMessagesByUser,
  listMessagesByConversation,
} from '../db/repo.js';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

const router = Router();

const sendMessageSchema = z.object({
  gigId: z.string(),
  receiverId: z.string(),
  body: z.string().min(1).max(5000),
  conversationId: z.string().optional(),
});

function getConversationId(a: string, b: string): string {
  return [a, b].sort().join('_');
}

function toMessageResponse(m: {
  id: string;
  gig_id: string;
  sender_id: string;
  receiver_id: string;
  body: string;
  conversation_id: string | null;
  created_at: string;
  gig_title?: string;
  sender_name?: string;
  sender_email?: string;
  receiver_name?: string;
  receiver_email?: string;
}) {
  return {
    _id: m.id,
    gig: { _id: m.gig_id, title: m.gig_title },
    sender: { _id: m.sender_id, name: m.sender_name, email: m.sender_email },
    receiver: { _id: m.receiver_id, name: m.receiver_name, email: m.receiver_email },
    body: m.body,
    conversationId: m.conversation_id,
    createdAt: m.created_at,
  };
}

router.get('/', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const messages = listMessagesByUser(req.user!.userId);
    const byConversation = new Map<string, typeof messages>();
    for (const m of messages) {
      const cid = m.conversation_id ?? getConversationId(m.sender_id, m.receiver_id);
      if (!byConversation.has(cid)) byConversation.set(cid, []);
      byConversation.get(cid)!.push(m);
    }
    const conversations = Array.from(byConversation.entries()).map(([id, msgs]) => ({
      conversationId: id,
      messages: msgs.map(toMessageResponse),
      gig: msgs[0] ? { _id: msgs[0].gig_id, title: msgs[0].gig_title } : undefined,
    }));
    res.json({ success: true, data: conversations });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch messages' });
  }
});

router.get('/:conversationId', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const messages = listMessagesByConversation(req.params.conversationId, req.user!.userId);
    res.json({ success: true, data: messages.map(toMessageResponse) });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch conversation' });
  }
});

router.post('/', authenticate, validateBody(sendMessageSchema), async (req: AuthenticatedRequest, res) => {
  try {
    const { gigId, receiverId, body, conversationId } = req.body as z.infer<typeof sendMessageSchema>;
    const gig = getGigById(gigId);
    if (!gig) {
      return res.status(404).json({ success: false, error: 'Gig not found' });
    }
    const isOwner = gig.created_by === req.user!.userId;
    const isApplicant = hasApplication(gigId, req.user!.userId);
    if (!isOwner && !isApplicant) {
      return res.status(403).json({ success: false, error: 'Only gig owner or applicants can message' });
    }
    if (!isOwner && receiverId !== gig.created_by) {
      return res.status(403).json({ success: false, error: 'Applicants can only message the gig owner' });
    }
    const cid = conversationId ?? getConversationId(req.user!.userId, receiverId);
    const message = createMessage({
      gigId,
      senderId: req.user!.userId,
      receiverId,
      body,
      conversationId: cid,
    });
    const populated = getMessageWithDetails(message.id);
    res.status(201).json({
      success: true,
      data: populated ? toMessageResponse(populated) : toMessageResponse({ ...message, gig_title: gig.title }),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to send message' });
  }
});

export default router;
