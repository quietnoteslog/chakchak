'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';
import { listMyProjects } from '@/lib/firestore';
import { Project } from '@/lib/types';

export default function DashboardPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    setLoadingList(true);
    listMyProjects(user.uid)
      .then(setProjects)
      .finally(() => setLoadingList(false));
  }, [user]);

  if (loading || !user) return null;

  return (
    <div className="min-h-screen" style={{ background: '#f5f7fb' }}>
      <header
        style={{
          padding: '16px 20px',
          background: '#fff',
          borderBottom: '1px solid #e5e9f2',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 18, letterSpacing: '0.05em' }}>착착</div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: '#555' }}>{user.displayName}</span>
          <button
            onClick={logout}
            style={{
              padding: '6px 12px',
              fontSize: 12,
              background: '#fff',
              border: '1px solid #d0d6e2',
              borderRadius: 6,
              cursor: 'pointer',
              color: '#555',
            }}
          >
            로그아웃
          </button>
        </div>
      </header>

      <main style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>내 프로젝트</h1>
          <Link
            href="/projects/new"
            style={{
              padding: '10px 16px',
              background: '#7b9fe8',
              color: '#fff',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            + 새 프로젝트
          </Link>
        </div>

        {loadingList ? (
          <p style={{ color: '#888' }}>로딩 중...</p>
        ) : projects.length === 0 ? (
          <div
            style={{
              padding: '48px 24px',
              background: '#fff',
              borderRadius: 12,
              textAlign: 'center',
              color: '#888',
              border: '1px dashed #d0d6e2',
            }}
          >
            <p style={{ margin: 0, marginBottom: 8 }}>아직 프로젝트가 없습니다</p>
            <p style={{ margin: 0, fontSize: 13 }}>+ 새 프로젝트로 시작하세요</p>
          </div>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 12 }}>
            {projects.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/projects/${p.id}`}
                  style={{
                    display: 'block',
                    padding: 16,
                    background: '#fff',
                    borderRadius: 12,
                    border: '1px solid #e5e9f2',
                    textDecoration: 'none',
                    color: '#333',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <strong style={{ fontSize: 16 }}>{p.name}</strong>
                    {p.ownerId === user.uid && (
                      <span
                        style={{
                          fontSize: 10,
                          padding: '2px 8px',
                          background: '#e8efff',
                          color: '#4a6bc4',
                          borderRadius: 10,
                          fontWeight: 600,
                        }}
                      >
                        총괄
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: '#888' }}>
                    {formatDate(p.startDate)} ~ {p.endDate ? formatDate(p.endDate) : '-'} · 멤버 {p.memberIds.length}명
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

function formatDate(ts: { toDate: () => Date }): string {
  const d = ts.toDate();
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}
