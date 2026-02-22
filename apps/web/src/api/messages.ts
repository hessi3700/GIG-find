import { api } from './client';

export interface Message {
  _id: string;
  gig: string | { _id: string; title: string };
  sender: string | { _id: string; name: string; email: string };
  receiver: string | { _id: string; name: string; email: string };
  body: string;
  conversationId?: string;
  createdAt: string;
}

export interface Conversation {
  conversationId: string;
  messages: Message[];
  gig?: { _id: string; title: string };
}

export async function getConversations() {
  return api<Conversation[]>('/api/messages');
}

export async function getConversation(conversationId: string) {
  return api<Message[]>(`/api/messages/${conversationId}`);
}

export async function sendMessage(data: {
  gigId: string;
  receiverId: string;
  body: string;
  conversationId?: string;
}) {
  return api<Message>('/api/messages', { method: 'POST', body: JSON.stringify(data) });
}
