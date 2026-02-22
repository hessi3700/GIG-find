import { api } from './client';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  createdAt?: string;
}

export async function getMe() {
  return api<UserProfile>('/api/users/me');
}

export async function getUser(id: string) {
  return api<UserProfile>(`/api/users/${id}`);
}
