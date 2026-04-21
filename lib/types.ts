import { Timestamp } from 'firebase/firestore';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  createdAt: Timestamp;
}

export interface InvitedMember {
  email: string;
  displayName: string;
}

export interface PaymentCard {
  id: string;
  label: string;       // 표시용 (자동 조합 "{bank} {number}")
  bank?: string;       // 카드사 (신규 필드, 구 데이터는 없을 수 있음)
  number?: string;     // 카드번호 끝 4자리 등
}

export interface Project {
  id: string;
  name: string;
  startDate: Timestamp;
  endDate: Timestamp | null;
  ownerId: string;
  memberIds: string[];
  memberNames: Record<string, string>;
  invitedMembers: InvitedMember[];
  categories: string[];      // 카테고리1
  categories2?: string[];    // 카테고리2 (선택)
  editorIds?: string[];      // 다른 사람의 내역도 수정/삭제 가능한 uid 목록 (owner가 부여)
  paymentCards: PaymentCard[];
  createdAt: Timestamp;
}

export interface ProjectInput {
  name: string;
  startDate: Date;
  endDate: Date | null;
}

export type MemberRole = 'owner' | 'member';

// 내역 구분
export type RecordType = '영수증' | '세금계산서' | '간이영수증' | '견적서';
export const RECORD_TYPES: RecordType[] = ['영수증', '세금계산서', '간이영수증', '견적서'];

// 결제수단 대분류
export type PaymentType = '법인카드' | '개인카드' | '현금';
export const PAYMENT_TYPES: PaymentType[] = ['법인카드', '개인카드', '현금'];

// 구 PaymentMethod 호환 (legacy record 마이그레이션 전까지)
export type PaymentMethod = '법인카드' | '개인카드' | '현금' | '기타';
export const PAYMENT_METHODS: PaymentMethod[] = ['법인카드', '개인카드', '현금', '기타'];

export interface ExpenseRecord {
  id: string;
  projectId: string;
  date: Timestamp;
  type: RecordType;
  categoryId: string;        // 카테고리1
  categoryId2?: string;      // 카테고리2
  merchant: string;
  content: string;
  amount: number;            // 합계금액 (세금계산서: 공급가액 + 부가세)
  vatAmount?: number;        // 부가세 (세금계산서 전용)
  currency?: string;         // 통화 코드 (기본 KRW, 해외 영수증 시 USD/JPY 등)
  paymentType: PaymentType;
  paymentCardId: string;
  paymentCardLabel: string;
  payerId: string;
  payerName: string;
  userNames: string;
  memo: string;
  receiptUrl: string;
  receiptPath: string;
  createdBy: string;
  createdByName: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

export interface OcrResult {
  merchant: string | null;
  amount: number | null;
  vatAmount?: number | null; // 부가세 (세금계산서 전용)
  date: string | null;
  currency: string | null;   // 통화 코드 (KRW, USD, JPY 등)
  confidence: number;
}

// 초대 링크 토큰
export interface InviteToken {
  id: string;               // Firestore doc id = token 값
  projectId: string;
  createdBy: string;
  createdAt: Timestamp;
  expiresAt: Timestamp;
  revoked: boolean;
  useCount: number;         // 사용 횟수 (통계용)
}
