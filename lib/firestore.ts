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
  Timestamp,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { db } from './firebase';
import { Project, ProjectInput, UserProfile } from './types';

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

export async function createProject(ownerUid: string, ownerEmail: string, input: ProjectInput): Promise<string> {
  const ref = await addDoc(collection(db, PROJECTS), {
    name: input.name,
    startDate: Timestamp.fromDate(input.startDate),
    endDate: input.endDate ? Timestamp.fromDate(input.endDate) : null,
    ownerId: ownerUid,
    ownerEmail,
    memberIds: [ownerUid],
    invitedEmails: [],
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function listMyProjects(uid: string): Promise<Project[]> {
  const q = query(collection(db, PROJECTS), where('memberIds', 'array-contains', uid));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Project, 'id'>) }));
}

export async function listPendingInvitations(email: string): Promise<Project[]> {
  const q = query(collection(db, PROJECTS), where('invitedEmails', 'array-contains', email));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Project, 'id'>) }));
}

export async function acceptInvitation(projectId: string, uid: string, email: string) {
  const ref = doc(db, PROJECTS, projectId);
  await updateDoc(ref, {
    memberIds: arrayUnion(uid),
    invitedEmails: arrayRemove(email),
  });
}

export async function getProject(projectId: string): Promise<Project | null> {
  const snap = await getDoc(doc(db, PROJECTS, projectId));
  return snap.exists() ? ({ id: snap.id, ...(snap.data() as Omit<Project, 'id'>) }) : null;
}

export async function inviteMember(projectId: string, email: string) {
  await updateDoc(doc(db, PROJECTS, projectId), {
    invitedEmails: arrayUnion(email.toLowerCase()),
  });
}

export async function removeMember(projectId: string, uid: string) {
  await updateDoc(doc(db, PROJECTS, projectId), {
    memberIds: arrayRemove(uid),
  });
}

export async function cancelInvitation(projectId: string, email: string) {
  await updateDoc(doc(db, PROJECTS, projectId), {
    invitedEmails: arrayRemove(email.toLowerCase()),
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
