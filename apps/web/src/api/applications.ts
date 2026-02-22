import { api } from './client';

export interface Application {
  _id: string;
  gig: string | { _id: string; title: string; category?: string; payRate?: number; status?: string };
  applicant: string | { _id: string; name: string; email: string };
  message: string;
  status: string;
  createdAt: string;
}

export async function applyToGig(gigId: string, message: string) {
  return api<Application>(`/api/gigs/${gigId}/applications`, {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
}

export async function getGigApplications(gigId: string) {
  return api<Application[]>(`/api/gigs/${gigId}/applications`);
}

export async function getMyApplications() {
  return api<Application[]>('/api/applications/me');
}

export async function updateApplicationStatus(id: string, status: 'pending' | 'accepted' | 'rejected') {
  return api<Application>(`/api/applications/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}
