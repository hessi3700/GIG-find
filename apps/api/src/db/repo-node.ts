import type { IRepo } from './repo-types.js';
import * as sync from './repo-sync.js';

export function createNodeRepo(): IRepo {
  return {
    createUser: (data) => Promise.resolve(sync.createUser(data)),
    getUserById: (id, includePassword) => Promise.resolve(sync.getUserById(id, includePassword)),
    findUserByEmail: (email, includePassword) => Promise.resolve(sync.findUserByEmail(email, includePassword)),
    createGig: (data) => Promise.resolve(sync.createGig(data)),
    getGigById: (id) => Promise.resolve(sync.getGigById(id)),
    listGigs: (params) => Promise.resolve(sync.listGigs(params)),
    listGigsByUser: (createdBy) => Promise.resolve(sync.listGigsByUser(createdBy)),
    updateGig: (id, createdBy, data) => Promise.resolve(sync.updateGig(id, createdBy, data)),
    deleteGig: (id, createdBy) => Promise.resolve(sync.deleteGig(id, createdBy)),
    createApplication: (data) => Promise.resolve(sync.createApplication(data)),
    getApplicationById: (id) => Promise.resolve(sync.getApplicationById(id)),
    getApplicationWithDetails: (id) => Promise.resolve(sync.getApplicationWithDetails(id)),
    listApplicationsByGig: (gigId) => Promise.resolve(sync.listApplicationsByGig(gigId)),
    listApplicationsByApplicant: (applicantId) => Promise.resolve(sync.listApplicationsByApplicant(applicantId)),
    updateApplicationStatus: (id, status, gigOwnerId) => Promise.resolve(sync.updateApplicationStatus(id, status, gigOwnerId)),
    getGigOwnerId: (gigId) => Promise.resolve(sync.getGigOwnerId(gigId)),
    hasApplication: (gigId, applicantId) => Promise.resolve(sync.hasApplication(gigId, applicantId)),
    createMessage: (data) => Promise.resolve(sync.createMessage(data)),
    getMessageById: (id) => Promise.resolve(sync.getMessageById(id)),
    getMessageWithDetails: (id) => Promise.resolve(sync.getMessageWithDetails(id)),
    listMessagesByUser: (userId) => Promise.resolve(sync.listMessagesByUser(userId)),
    listMessagesByConversation: (conversationId, userId) => Promise.resolve(sync.listMessagesByConversation(conversationId, userId)),
  };
}
