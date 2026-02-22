import { api, setToken } from './client';

export interface User {
  id: string;
  email: string;
  name: string;
}

export async function register(email: string, password: string, name: string) {
  const res = await api<{ token: string; user: User }>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, name }),
  });
  if (res.success && res.data.token) {
    setToken(res.data.token);
    return { user: res.data.user };
  }
  return { error: (res as { error: string }).error };
}

export async function login(email: string, password: string) {
  const res = await api<{ token: string; user: User }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  if (res.success && res.data.token) {
    setToken(res.data.token);
    return { user: res.data.user };
  }
  return { error: (res as { error: string }).error };
}
