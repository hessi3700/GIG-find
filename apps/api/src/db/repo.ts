import type { IRepo } from './repo-types.js';
import { createD1Repo } from './repo-d1.js';

export type { ApplicationRow, GigRow, IRepo, MessageRow, UserRow } from './repo-types.js';
export { createD1Repo } from './repo-d1.js';

let repo: IRepo | null = null;

export function setRepo(r: IRepo): void {
  repo = r;
}

export function getRepo(): IRepo {
  if (!repo) throw new Error('Repo not set: call setRepo(createNodeRepo()) or setRepo(createD1Repo(env.DB)) first');
  return repo;
}

export async function createUser(data: { email: string; passwordHash: string; name: string }) {
  return getRepo().createUser(data);
}

export async function getUserById(id: string, includePassword?: boolean) {
  return getRepo().getUserById(id, includePassword);
}

export async function findUserByEmail(email: string, includePassword?: boolean) {
  return getRepo().findUserByEmail(email, includePassword);
}

export async function createGig(data: {
  title: string;
  description: string;
  category: string;
  payRate: number;
  currency?: string;
  createdBy: string;
}) {
  return getRepo().createGig(data);
}

export async function getGigById(id: string) {
  return getRepo().getGigById(id);
}

export async function listGigs(params: {
  category?: string;
  minPay?: number;
  maxPay?: number;
  search?: string;
  page: number;
  limit: number;
}) {
  return getRepo().listGigs(params);
}

export async function listGigsByUser(createdBy: string) {
  return getRepo().listGigsByUser(createdBy);
}

export async function updateGig(
  id: string,
  createdBy: string,
  data: Partial<{ title: string; description: string; category: string; payRate: number; currency: string }>
) {
  return getRepo().updateGig(id, createdBy, data);
}

export async function deleteGig(id: string, createdBy: string) {
  return getRepo().deleteGig(id, createdBy);
}

export async function createApplication(data: { gigId: string; applicantId: string; message: string }) {
  return getRepo().createApplication(data);
}

export async function getApplicationById(id: string) {
  return getRepo().getApplicationById(id);
}

export async function getApplicationWithDetails(id: string) {
  return getRepo().getApplicationWithDetails(id);
}

export async function listApplicationsByGig(gigId: string) {
  return getRepo().listApplicationsByGig(gigId);
}

export async function listApplicationsByApplicant(applicantId: string) {
  return getRepo().listApplicationsByApplicant(applicantId);
}

export async function updateApplicationStatus(id: string, status: string, gigOwnerId: string) {
  return getRepo().updateApplicationStatus(id, status, gigOwnerId);
}

export async function getGigOwnerId(gigId: string) {
  return getRepo().getGigOwnerId(gigId);
}

export async function hasApplication(gigId: string, applicantId: string) {
  return getRepo().hasApplication(gigId, applicantId);
}

export async function createMessage(data: {
  gigId: string;
  senderId: string;
  receiverId: string;
  body: string;
  conversationId?: string;
}) {
  return getRepo().createMessage(data);
}

export async function getMessageById(id: string) {
  return getRepo().getMessageById(id);
}

export async function getMessageWithDetails(id: string) {
  return getRepo().getMessageWithDetails(id);
}

export async function listMessagesByUser(userId: string) {
  return getRepo().listMessagesByUser(userId);
}

export async function listMessagesByConversation(conversationId: string, userId: string) {
  return getRepo().listMessagesByConversation(conversationId, userId);
}
