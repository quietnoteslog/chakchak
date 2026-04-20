import { Timestamp } from 'firebase/firestore';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  createdAt: Timestamp;
}

export interface Project {
  id: string;
  name: string;
  startDate: Timestamp;
  endDate: Timestamp | null;
  ownerId: string;
  memberIds: string[];
  invitedEmails: string[];
  createdAt: Timestamp;
}

export interface ProjectInput {
  name: string;
  startDate: Date;
  endDate: Date | null;
}

export type MemberRole = 'owner' | 'member';
