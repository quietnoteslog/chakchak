import {
  collection,
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  deleteField,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  Project,
  ProjectInput,
  UserProfile,
  ExpenseRecord,
  PaymentCard,
  InviteToken,
  RecordType,
  PaymentType,
} from './types';

export const USERS = 'users';
export const PROJECTS = 'projects';

// --- users ---

export async function upsertUserProfile(uid: string, email: string, displayName: string) {
  const ref = doc(db, USERS, uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      uid,
      email,
      displayName,
      createdAt: serverTimestamp(),
    });
  } else if (snap.data().email !== email || snap.data().displayName !== displayName) {
    await updateDoc(ref, { email, displayName });
  }
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, USERS, uid));
  return snap.exists() ? (snap.data() as UserProfile) : null;
}

// --- projects ---

export async function createProject(
  ownerUid: string,
  ownerEmail: string,
  ownerDisplayName: string,
  input: ProjectInput
): Promise<string> {
  const ref = await addDoc(collection(db, PROJECTS), {
    name: input.name,
    startDate: Timestamp.fromDate(input.startDate),
    endDate: input.endDate ? Timestamp.fromDate(input.endDate) : null,
    ownerId: ownerUid,
    ownerEmail,
    memberIds: [ownerUid],
    memberNames: { [ownerUid]: ownerDisplayName },
    invitedMembers: [],
    categories: [],
    categories2: [],
    paymentCards: [],
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function listMyProjects(uid: string): Promise<Project[]> {
  const q = query(collection(db, PROJECTS), where('memberIds', 'array-contains', uid));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Project, 'id'>) }));
}

export async function getProject(projectId: string): Promise<Project | null> {
  const snap = await getDoc(doc(db, PROJECTS, projectId));
  return snap.exists() ? ({ id: snap.id, ...(snap.data() as Omit<Project, 'id'>) }) : null;
}

export async function deleteProject(projectId: string) {
  await deleteDoc(doc(db, PROJECTS, projectId));
}

export async function deleteUserData(
  uid: string,
  deleteOwnedProjects = false
): Promise<{ ownedProjects: string[] }> {
  const allProjects = await listMyProjects(uid);
  const owned = allProjects.filter((p) => p.ownerId === uid);
  const ownedNames = owned.map((p) => p.name);

  if (owned.length > 0 && !deleteOwnedProjects) {
    return { ownedProjects: ownedNames };
  }

  // 소유 프로젝트 삭제 (records subcollection 먼저)
  if (deleteOwnedProjects) {
    for (const p of owned) {
      const recSnap = await getDocs(collection(db, PROJECTS, p.id, 'records'));
      await Promise.all(recSnap.docs.map((d) => deleteDoc(d.ref)));
      await deleteDoc(doc(db, PROJECTS, p.id));
    }
  }

  // 멤버로만 참여한 프로젝트에서 제거
  const memberOnly = allProjects.filter((p) => p.ownerId !== uid);
  await Promise.all(memberOnly.map((p) => removeMember(p.id, uid)));

  // users 문서 삭제
  await deleteDoc(doc(db, USERS, uid));

  return { ownedProjects: [] };
}

// --- member management ---

export async function removeMember(projectId: string, uid: string) {
  const ref = doc(db, PROJECTS, projectId);
  await updateDoc(ref, {
    memberIds: arrayRemove(uid),
    [`memberNames.${uid}`]: deleteField(),
  });
}

export async function updateMemberName(projectId: string, uid: string, displayName: string) {
  await updateDoc(doc(db, PROJECTS, projectId), {
    [`memberNames.${uid}`]: displayName,
  });
}

// --- categories ---

export async function addCategory(projectId: string, name: string) {
  await updateDoc(doc(db, PROJECTS, projectId), {
    categories: arrayUnion(name),
  });
}

export async function removeCategory(projectId: string, name: string) {
  await updateDoc(doc(db, PROJECTS, projectId), {
    categories: arrayRemove(name),
  });
}

export async function addCategory2(projectId: string, name: string) {
  await updateDoc(doc(db, PROJECTS, projectId), {
    categories2: arrayUnion(name),
  });
}

export async function removeCategory2(projectId: string, name: string) {
  await updateDoc(doc(db, PROJECTS, projectId), {
    categories2: arrayRemove(name),
  });
}

// 순서 덮어쓰기
export async function setCategories(projectId: string, list: string[]) {
  await updateDoc(doc(db, PROJECTS, projectId), { categories: list });
}

// 편집 권한 부여/회수
export async function addEditor(projectId: string, uid: string) {
  await updateDoc(doc(db, PROJECTS, projectId), {
    editorIds: arrayUnion(uid),
  });
}

export async function removeEditor(projectId: string, uid: string) {
  await updateDoc(doc(db, PROJECTS, projectId), {
    editorIds: arrayRemove(uid),
  });
}

export async function setCategories2(projectId: string, list: string[]) {
  await updateDoc(doc(db, PROJECTS, projectId), { categories2: list });
}

// --- payment cards ---

export async function addPaymentCard(projectId: string, card: PaymentCard) {
  const ref = doc(db, PROJECTS, projectId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('project not found');
  const data = snap.data() as Project;
  const cards = [...(data.paymentCards ?? []), card];
  await updateDoc(ref, { paymentCards: cards });
}

export async function removePaymentCard(projectId: string, cardId: string) {
  const ref = doc(db, PROJECTS, projectId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const data = snap.data() as Project;
  const cards = (data.paymentCards ?? []).filter((c) => c.id !== cardId);
  await updateDoc(ref, { paymentCards: cards });
}

// --- invite tokens (link-based invite) ---

export const INVITE_TOKENS = 'inviteTokens';

function generateToken(): string {
  // 32자 랜덤 (a-z, A-Z, 0-9)
  const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const arr = new Uint8Array(32);
  if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) {
    crypto.getRandomValues(arr);
  } else {
    for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256);
  }
  let s = '';
  for (let i = 0; i < arr.length; i++) s += alphabet[arr[i] % alphabet.length];
  return s;
}

export async function createInviteToken(projectId: string, uid: string, days: number = 7): Promise<string> {
  const token = generateToken();
  const expiresAt = Timestamp.fromDate(new Date(Date.now() + days * 24 * 60 * 60 * 1000));
  await setDoc(doc(db, PROJECTS, projectId, INVITE_TOKENS, token), {
    projectId,
    createdBy: uid,
    createdAt: serverTimestamp(),
    expiresAt,
    revoked: false,
    useCount: 0,
  });
  return token;
}

export async function listInviteTokens(projectId: string): Promise<InviteToken[]> {
  const q = query(collection(db, PROJECTS, projectId, INVITE_TOKENS), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<InviteToken, 'id'>) }));
}

export async function revokeInviteToken(projectId: string, token: string) {
  await updateDoc(doc(db, PROJECTS, projectId, INVITE_TOKENS, token), { revoked: true });
}

// 토큰으로 프로젝트/토큰 정보 찾기 (collectionGroup 쿼리)
export async function findInviteToken(token: string): Promise<{ projectId: string; data: InviteToken } | null> {
  const q = query(collectionGroup(db, INVITE_TOKENS), where('__name__', '>=', ''));
  // collectionGroup으로 도큐먼트 ID 검색은 불가하므로, 토큰 사용 시 프로젝트 ID를 URL에 같이 넣는 방식 권장
  // 대신 각 프로젝트에서 검색하는 건 비효율적이니, URL 구조를 /invite/{projectId}/{token}으로 쓰자.
  throw new Error('use getInviteTokenByProject instead');
}

export async function getInviteTokenByProject(projectId: string, token: string): Promise<InviteToken | null> {
  const snap = await getDoc(doc(db, PROJECTS, projectId, INVITE_TOKENS, token));
  return snap.exists() ? ({ id: snap.id, ...(snap.data() as Omit<InviteToken, 'id'>) }) : null;
}

// 토큰 사용 → 멤버 등록
// 비멤버는 project read 권한이 없으므로, project 조회 없이 update만 시도.
// already-member 여부는 호출자(invite page)가 이미 로그인 후 분기 처리함.
export async function acceptInviteByToken(
  projectId: string,
  token: string,
  uid: string,
  displayName: string
): Promise<'ok' | 'revoked' | 'expired' | 'not-found'> {
  const tokenSnap = await getDoc(doc(db, PROJECTS, projectId, INVITE_TOKENS, token));
  if (!tokenSnap.exists()) return 'not-found';
  const tokenData = tokenSnap.data() as InviteToken;
  if (tokenData.revoked) return 'revoked';
  if (tokenData.expiresAt.toDate().getTime() < Date.now()) return 'expired';

  const projectRef = doc(db, PROJECTS, projectId);
  await updateDoc(projectRef, {
    memberIds: arrayUnion(uid),
    [`memberNames.${uid}`]: displayName,
  });
  await updateDoc(doc(db, PROJECTS, projectId, INVITE_TOKENS, token), {
    useCount: (tokenData.useCount ?? 0) + 1,
  });
  return 'ok';
}

// --- records (경비 내역) ---

export interface RecordInput {
  date: Date;
  type: RecordType;
  categoryId: string;
  categoryId2: string;
  merchant: string;
  content: string;
  amount: number;
  vatAmount?: number;
  currency?: string;
  paymentType: PaymentType;
  paymentCardId: string;
  paymentCardLabel: string;
  payerId: string;
  payerName: string;
  userNames: string;
  memo: string;
  receiptUrl: string;
  receiptPath: string;
  createdByName: string;
}

export async function addRecord(projectId: string, uid: string, input: RecordInput): Promise<string> {
  const ref = await addDoc(collection(db, PROJECTS, projectId, 'records'), {
    projectId,
    date: Timestamp.fromDate(input.date),
    type: input.type,
    categoryId: input.categoryId,
    categoryId2: input.categoryId2,
    merchant: input.merchant,
    content: input.content,
    amount: input.amount,
    ...(input.vatAmount != null ? { vatAmount: input.vatAmount } : {}),
    ...(input.currency ? { currency: input.currency } : {}),
    paymentType: input.paymentType,
    paymentCardId: input.paymentCardId,
    paymentCardLabel: input.paymentCardLabel,
    payerId: input.payerId,
    payerName: input.payerName,
    userNames: input.userNames,
    memo: input.memo,
    receiptUrl: input.receiptUrl,
    receiptPath: input.receiptPath,
    createdBy: uid,
    createdByName: input.createdByName,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateRecord(projectId: string, recordId: string, patch: Partial<RecordInput>) {
  const data: Record<string, unknown> = { updatedAt: serverTimestamp() };
  for (const [k, v] of Object.entries(patch)) {
    if (v !== undefined) data[k] = v;
  }
  if (patch.date) data.date = Timestamp.fromDate(patch.date);
  await updateDoc(doc(db, PROJECTS, projectId, 'records', recordId), data);
}

export async function listRecords(projectId: string): Promise<ExpenseRecord[]> {
  const q = query(collection(db, PROJECTS, projectId, 'records'), orderBy('date', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ExpenseRecord, 'id'>) }));
}

export async function getRecord(projectId: string, recordId: string): Promise<ExpenseRecord | null> {
  const snap = await getDoc(doc(db, PROJECTS, projectId, 'records', recordId));
  return snap.exists() ? ({ id: snap.id, ...(snap.data() as Omit<ExpenseRecord, 'id'>) }) : null;
}

export async function deleteRecord(projectId: string, recordId: string) {
  await deleteDoc(doc(db, PROJECTS, projectId, 'records', recordId));
}
