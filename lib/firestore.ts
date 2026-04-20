import {
  collection,
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
import { Project, ProjectInput, UserProfile, ExpenseRecord, PaymentMethod, InvitedMember } from './types';

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
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function listMyProjects(uid: string): Promise<Project[]> {
  const q = query(collection(db, PROJECTS), where('memberIds', 'array-contains', uid));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Project, 'id'>) }));
}

// 초대받은 이메일을 가진 프로젝트 찾기 (invitedMembers 배열 안 객체 검색)
// Firestore에서 배열 내 객체 필드로 쿼리 불가 → 전체 스캔 불가. 대안: email만 따로 indexed 배열 보조필드 둘까?
// 간단 MVP: invitedMemberEmails 보조 배열을 함께 유지 (쿼리는 이 배열로, 수락 시 양쪽 동기화).
export async function listPendingInvitations(email: string): Promise<Project[]> {
  const q = query(collection(db, PROJECTS), where('invitedMemberEmails', 'array-contains', email));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Project, 'id'>) }));
}

export async function acceptInvitation(projectId: string, uid: string, email: string) {
  const ref = doc(db, PROJECTS, projectId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const data = snap.data() as Project & { invitedMemberEmails?: string[] };
  const invited = (data.invitedMembers ?? []).find((m) => m.email === email);
  const displayName = invited?.displayName ?? email.split('@')[0];
  await updateDoc(ref, {
    memberIds: arrayUnion(uid),
    [`memberNames.${uid}`]: displayName,
    invitedMembers: (data.invitedMembers ?? []).filter((m) => m.email !== email),
    invitedMemberEmails: arrayRemove(email),
  });
}

export async function getProject(projectId: string): Promise<Project | null> {
  const snap = await getDoc(doc(db, PROJECTS, projectId));
  return snap.exists() ? ({ id: snap.id, ...(snap.data() as Omit<Project, 'id'>) }) : null;
}

export async function inviteMember(projectId: string, email: string, displayName: string) {
  const ref = doc(db, PROJECTS, projectId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('project not found');
  const data = snap.data() as Project & { invitedMemberEmails?: string[] };
  const normEmail = email.toLowerCase();
  const existing = (data.invitedMembers ?? []).filter((m) => m.email !== normEmail);
  existing.push({ email: normEmail, displayName });
  await updateDoc(ref, {
    invitedMembers: existing,
    invitedMemberEmails: arrayUnion(normEmail),
  });
}

export async function removeMember(projectId: string, uid: string) {
  const ref = doc(db, PROJECTS, projectId);
  await updateDoc(ref, {
    memberIds: arrayRemove(uid),
    [`memberNames.${uid}`]: deleteField(),
  });
}

export async function cancelInvitation(projectId: string, email: string) {
  const ref = doc(db, PROJECTS, projectId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const data = snap.data() as Project & { invitedMemberEmails?: string[] };
  const normEmail = email.toLowerCase();
  await updateDoc(ref, {
    invitedMembers: (data.invitedMembers ?? []).filter((m) => m.email !== normEmail),
    invitedMemberEmails: arrayRemove(normEmail),
  });
}

export async function updateMemberName(projectId: string, uid: string, displayName: string) {
  await updateDoc(doc(db, PROJECTS, projectId), {
    [`memberNames.${uid}`]: displayName,
  });
}

export async function deleteProject(projectId: string) {
  await deleteDoc(doc(db, PROJECTS, projectId));
}

// --- user lookup (멤버 표시용) ---

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, USERS, uid));
  return snap.exists() ? (snap.data() as UserProfile) : null;
}

// --- records (경비 내역) ---

export interface RecordInput {
  amount: number;
  date: Date;
  merchant: string;
  paymentMethod: PaymentMethod;
  memo: string;
  receiptUrl: string;
  receiptPath: string;
  createdByName: string;
}

export async function addRecord(projectId: string, uid: string, input: RecordInput): Promise<string> {
  const ref = await addDoc(collection(db, PROJECTS, projectId, 'records'), {
    projectId,
    amount: input.amount,
    date: Timestamp.fromDate(input.date),
    merchant: input.merchant,
    paymentMethod: input.paymentMethod,
    memo: input.memo,
    receiptUrl: input.receiptUrl,
    receiptPath: input.receiptPath,
    createdBy: uid,
    createdByName: input.createdByName,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function listRecords(projectId: string): Promise<ExpenseRecord[]> {
  const q = query(collection(db, PROJECTS, projectId, 'records'), orderBy('date', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ExpenseRecord, 'id'>) }));
}

export async function deleteRecord(projectId: string, recordId: string) {
  await deleteDoc(doc(db, PROJECTS, projectId, 'records', recordId));
}
