import { api } from './client';

export interface Gig {
  _id: string;
  title: string;
  description: string;
  category: string;
  payRate: number;
  currency?: string;
  createdBy: { _id: string; name: string; email: string };
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface ListGigsParams {
  category?: string;
  minPay?: number;
  maxPay?: number;
  search?: string;
  page?: number;
  limit?: number;
}

export async function listGigs(params?: ListGigsParams) {
  return api<{ gigs: Gig[]; total: number; page: number; limit: number; totalPages: number }>(
    '/api/gigs',
    { params: params as Record<string, string | number | undefined> }
  );
}

export async function getMyGigs() {
  return api<Gig[]>('/api/gigs/mine');
}

export async function getGig(id: string) {
  return api<Gig>(`/api/gigs/${id}`);
}

export async function createGig(data: {
  title: string;
  description: string;
  category: string;
  payRate: number;
  currency?: string;
}) {
  return api<Gig>('/api/gigs', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateGig(
  id: string,
  data: Partial<{ title: string; description: string; category: string; payRate: number; currency: string }>
) {
  return api<Gig>(`/api/gigs/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export async function deleteGig(id: string) {
  return api<{ message: string }>(`/api/gigs/${id}`, { method: 'DELETE' });
}
