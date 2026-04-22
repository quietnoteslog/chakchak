'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
  deleteUser,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from 'firebase/auth';
import { auth, googleProvider } from './firebase';
import { upsertUserProfile, deleteUserData } from './firestore';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, displayName: string) => Promise<void>;
  sendResetEmail: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: (password: string) => Promise<{ ownedProjects: string[] }>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) {
        try {
          await upsertUserProfile(u.uid, u.email ?? '', u.displayName ?? '');
        } catch (e) {
          console.error('profile sync failed', e);
        }
      }
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signInWithGoogle = async () => {
    await signInWithPopup(auth, googleProvider);
  };

  const signInWithEmail = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUpWithEmail = async (email: string, password: string, displayName: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    if (displayName.trim()) {
      await updateProfile(cred.user, { displayName: displayName.trim() });
    }
    // AuthContext useEffect가 upsert 하지만 displayName 갱신 반영 위해 수동 upsert
    await upsertUserProfile(cred.user.uid, email, displayName.trim());
  };

  const sendResetEmail = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const logout = async () => {
    await signOut(auth);
  };

  const deleteAccount = async (password: string): Promise<{ ownedProjects: string[] }> => {
    const u = auth.currentUser;
    if (!u || !u.email) throw new Error('로그인 상태가 아닙니다');
    const credential = EmailAuthProvider.credential(u.email, password);
    await reauthenticateWithCredential(u, credential);
    const result = await deleteUserData(u.uid);
    if (result.ownedProjects.length > 0) return result;
    await deleteUser(u);
    return { ownedProjects: [] };
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signInWithEmail, signUpWithEmail, sendResetEmail, logout, deleteAccount }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
