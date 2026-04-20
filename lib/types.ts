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

export type PaymentMethod = '법인카드' | '개인카드' | '현금' | '기타';

export const PAYMENT_METHODS: PaymentMethod[] = ['법인카드', '개인카드', '현금', '기타'];

export interface ExpenseRecord {
  id: string;
  projectId: string;
  amount: number;
  date: Timestamp;
  merchant: string;
  paymentMethod: PaymentMethod;
  memo: string;
  receiptUrl: string;
  receiptPath: string;
  createdBy: string;
  createdByName: string;
  createdAt: Timestamp;
}

export interface OcrResult {
  merchant: string | null;
  amount: number | null;
  date: string | null;
  confidence: number;
}
