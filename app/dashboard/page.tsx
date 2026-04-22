'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';
import { listMyProjects } from '@/lib/firestore';
import { Project } from '@/lib/types';

export default function DashboardPage() {
  const { user, loading, logout, deleteAccount } = useAuth();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [ownedProjectNames, setOwnedProjectNames] = useState<string[]>([]);
  const [deleteOwned, setDeleteOwned] = useState(false);

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

  const handleDeleteAccount = async () => {
    if (!deletePassword) { setDeleteError('비밀번호를 입력하세요'); return; }
    setDeleting(true);
    setDeleteError('');
    try {
      const result = await deleteAccount(deletePassword, deleteOwned);
      if (result.ownedProjects.length > 0) {
        setOwnedProjectNames(result.ownedProjects);
        setDeleting(false);
        return;
      }
      router.replace('/login');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '';
      if (msg.includes('wrong-password') || msg.includes('invalid-credential')) {
        setDeleteError('비밀번호가 올바르지 않습니다');
      } else {
        setDeleteError('탈퇴 처리 중 오류가 발생했습니다');
      }
      setDeleting(false);
    }
  };

  if (loading || !user) return null;

  return (
    <div className="min-h-screen" style={{ background: '#f5f7fb' }}>
      <header
        style={{
          padding: '16px 20px',
          background: 'linear-gradient(135deg, #a8c8f8 0%, #7b9fe8 50%, #8b7fd4 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 18, letterSpacing: '0.05em', color: '#fff' }}>착착</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>{user.displayName}</span>
          <button
            onClick={logout}
            style={{ padding: '6px 12px', fontSize: 12, background: 'linear-gradient(135deg, rgba(255,255,255,0.25) 0%, rgba(200,200,210,0.25) 100%)', border: '1px solid rgba(255,255,255,0.35)', borderRadius: 6, cursor: 'pointer', color: '#fff', fontWeight: 500 }}
          >
            로그아웃
          </button>
          <button
            onClick={() => { setShowDeleteModal(true); setDeletePassword(''); setDeleteError(''); setOwnedProjectNames([]); setDeleteOwned(false); }}
            style={{ padding: '6px 10px', fontSize: 12, background: 'linear-gradient(135deg, rgba(180,40,40,0.35) 0%, rgba(120,30,30,0.35) 100%)', border: '1px solid rgba(220,80,80,0.4)', borderRadius: 6, cursor: 'pointer', color: '#fca5a5', fontWeight: 500 }}
          >
            탈퇴
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
      {showDeleteModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: '28px 24px', maxWidth: 360, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: '#dc2626' }}>회원 탈퇴</div>
            <p style={{ fontSize: 13, color: '#555', marginBottom: 16, lineHeight: 1.6 }}>
              탈퇴하면 참여 중인 프로젝트에서 제거되며, 계정이 영구 삭제됩니다.
            </p>
            {ownedProjectNames.length > 0 && (
              <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 8, padding: '10px 12px', marginBottom: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#c2410c', marginBottom: 6 }}>총괄인 프로젝트가 있습니다</div>
                <ul style={{ margin: 0, padding: '0 0 0 16px', fontSize: 12, color: '#555' }}>
                  {ownedProjectNames.map((n) => <li key={n}>{n}</li>)}
                </ul>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, cursor: 'pointer' }}>
                  <input type="checkbox" checked={deleteOwned} onChange={(e) => setDeleteOwned(e.target.checked)} />
                  <span style={{ fontSize: 12, color: '#dc2626', fontWeight: 600 }}>위 프로젝트와 모든 내역을 함께 삭제합니다</span>
                </label>
              </div>
            )}
            <div style={{ fontSize: 12, fontWeight: 600, color: '#444', marginBottom: 6 }}>비밀번호 확인</div>
            <input
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleDeleteAccount()}
              placeholder="현재 비밀번호"
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e0e0e0', fontSize: 14, marginBottom: 8, boxSizing: 'border-box' }}
            />
            {deleteError && (
              <p style={{ fontSize: 12, color: '#dc2626', marginBottom: 8 }}>{deleteError}</p>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button
                onClick={() => setShowDeleteModal(false)}
                style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid #e0e0e0', background: '#fff', fontSize: 13, cursor: 'pointer' }}
              >
                취소
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting || (ownedProjectNames.length > 0 && !deleteOwned)}
                style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: (deleting || (ownedProjectNames.length > 0 && !deleteOwned)) ? '#f87171' : '#dc2626', color: '#fff', fontSize: 13, fontWeight: 600, cursor: (deleting || (ownedProjectNames.length > 0 && !deleteOwned)) ? 'not-allowed' : 'pointer' }}
              >
                {deleting ? '처리 중...' : '탈퇴하기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatDate(ts: { toDate: () => Date }): string {
  const d = ts.toDate();
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}
