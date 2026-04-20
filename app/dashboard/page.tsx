'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';

export default function DashboardPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  if (loading || !user) return null;

  return (
    <div style={{ padding: 32 }}>
      <p>안녕하세요, {user.displayName}님</p>
      <button onClick={logout} style={{ marginTop: 16 }}>로그아웃</button>
    </div>
  );
}
