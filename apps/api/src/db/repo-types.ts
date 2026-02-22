/** Shared types and repo interface for Node (SQLite file) and Worker (D1) */

export interface UserRow {
  id: string;
  email: string;
  password_hash?: string;
  name: string;
  created_at: string;
}

export interface GigRow {
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
}

export interface ApplicationRow {
  id: string;
  gig_id: string;
  applicant_id: string;
  message: string;
  status: string;
  created_at: string;
}

export interface MessageRow {
  id: string;
  gig_id: string;
  sender_id: string;
  receiver_id: string;
  body: string;
  conversation_id: string | null;
  created_at: string;
}

export interface IRepo {
  createUser(data: { email: string; passwordHash: string; name: string }): Promise<UserRow>;
  getUserById(id: string, includePassword?: boolean): Promise<UserRow | null>;
  findUserByEmail(email: string, includePassword?: boolean): Promise<UserRow | null>;
  createGig(data: { title: string; description: string; category: string; payRate: number; currency?: string; createdBy: string }): Promise<GigRow>;
  getGigById(id: string): Promise<GigRow | null>;
  listGigs(params: { category?: string; minPay?: number; maxPay?: number; search?: string; page: number; limit: number }): Promise<{ gigs: (GigRow & { creator_name?: string; creator_email?: string })[]; total: number }>;
  listGigsByUser(createdBy: string): Promise<(GigRow & { creator_name?: string; creator_email?: string })[]>;
  updateGig(id: string, createdBy: string, data: Partial<{ title: string; description: string; category: string; payRate: number; currency: string }>): Promise<GigRow | null>;
  deleteGig(id: string, createdBy: string): Promise<boolean>;
  createApplication(data: { gigId: string; applicantId: string; message: string }): Promise<ApplicationRow | null>;
  getApplicationById(id: string): Promise<ApplicationRow | null>;
  getApplicationWithDetails(id: string): Promise<(ApplicationRow & { applicant_name?: string; applicant_email?: string; gig_title?: string }) | null>;
  listApplicationsByGig(gigId: string): Promise<(ApplicationRow & { applicant_name?: string; applicant_email?: string; gig_title?: string })[]>;
  listApplicationsByApplicant(applicantId: string): Promise<(ApplicationRow & { gig_title?: string; gig_category?: string; gig_pay_rate?: number; gig_status?: string; gig_created_by?: string })[]>;
  updateApplicationStatus(id: string, status: string, gigOwnerId: string): Promise<ApplicationRow | null>;
  getGigOwnerId(gigId: string): Promise<string | null>;
  hasApplication(gigId: string, applicantId: string): Promise<boolean>;
  createMessage(data: { gigId: string; senderId: string; receiverId: string; body: string; conversationId?: string }): Promise<MessageRow>;
  getMessageById(id: string): Promise<MessageRow | null>;
  getMessageWithDetails(id: string): Promise<(MessageRow & { gig_title?: string; sender_name?: string; sender_email?: string; receiver_name?: string; receiver_email?: string }) | null>;
  listMessagesByUser(userId: string): Promise<(MessageRow & { gig_title?: string; sender_name?: string; sender_email?: string; receiver_name?: string; receiver_email?: string })[]>;
  listMessagesByConversation(conversationId: string, userId: string): Promise<(MessageRow & { gig_title?: string; sender_name?: string; sender_email?: string; receiver_name?: string; receiver_email?: string })[]>;
}
