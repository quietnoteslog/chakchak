'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';
import { getProject, getUserProfile, inviteMember, cancelInvitation, removeMember } from '@/lib/firestore';
import { Project, UserProfile } from '@/lib/types';

export default function MembersPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const projectId = params.id;
  const [project, setProject] = useState<Project | null>(null);
  const [members, setMembers] = useState<(UserProfile | null)[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  const refresh = async () => {
    if (!projectId) return;
    setLoadingData(true);
    try {
      const p = await getProject(projectId);
      if (!p) {
        setError('프로젝트를 찾을 수 없습니다');
        return;
      }
      setProject(p);
      const profiles = await Promise.all(p.memberIds.map((uid) => getUserProfile(uid)));
      setMembers(profiles);
    } catch {
      setError('불러오기 실패');
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (user && projectId) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, projectId]);

  if (loading || !user) return null;

  const isOwner = project?.ownerId === user.uid;

  const onInvite = async (e: FormEvent) => {
    e.preventDefault();
    if (!project || !isOwner) return;
    const email = inviteEmail.trim().toLowerCase();
    if (!email || !email.includes('@')) {
      alert('올바른 이메일을 입력해주세요');
      return;
    }
    if (email === user.email?.toLowerCase()) {
      alert('본인은 이미 멤버입니다');
      return;
    }
    if (project.invitedEmails.includes(email)) {
      alert('이미 초대한 이메일입니다');
      return;
    }
    setInviting(true);
    try {
      await inviteMember(project.id, email);
      setInviteEmail('');
      await refresh();
    } catch {
      alert('초대 실패');
    } finally {
      setInviting(false);
    }
  };

  const onCancelInvite = async (email: string) => {
    if (!project) return;
    if (!confirm(`${email} 초대를 취소할까요?`)) return;
    await cancelInvitation(project.id, email);
    await refresh();
  };

  const onRemoveMember = async (uid: string, name: string) => {
    if (!project) return;
    if (uid === project.ownerId) {
      alert('총괄은 제거할 수 없습니다');
      return;
    }
    if (!confirm(`${name}님을 프로젝트에서 제외할까요?`)) return;
    await removeMember(project.id, uid);
    await refresh();
  };

  return (
    <div className="min-h-screen" style={{ background: '#f5f7fb' }}>
      <header style={{ padding: '16px 20px', background: '#fff', borderBottom: '1px solid #e5e9f2' }}>
        <Link href={`/projects/${projectId}`} style={{ background: 'none', border: 'none', fontSize: 14, color: '#555', textDecoration: 'none' }}>
          ← 프로젝트
        </Link>
      </header>

      <main style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px' }}>
        {loadingData ? (
          <p style={{ color: '#888' }}>로딩 중...</p>
        ) : error ? (
          <p style={{ color: '#c33' }}>{error}</p>
        ) : project ? (
          <>
            <h1 style={{ fontSize: 20, fontWeight: 700, marginTop: 0, marginBottom: 16 }}>멤버 관리</h1>

            {isOwner && (
              <section style={{ marginBottom: 24, padding: 16, background: '#fff', borderRadius: 12, border: '1px solid #e5e9f2' }}>
                <h2 style={{ fontSize: 14, fontWeight: 700, margin: 0, marginBottom: 12 }}>이메일로 초대</h2>
                <form onSubmit={onInvite} style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="example@gmail.com"
                    style={{ flex: 1, padding: '10px 12px', fontSize: 14, border: '1px solid #d0d6e2', borderRadius: 8, outline: 'none' }}
                  />
                  <button
                    type="submit"
                    disabled={inviting}
                    style={{ padding: '10px 16px', background: inviting ? '#b5c4e8' : '#7b9fe8', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: inviting ? 'default' : 'pointer' }}
                  >
                    {inviting ? '초대 중...' : '초대'}
                  </button>
                </form>
                <p style={{ fontSize: 12, color: '#888', margin: '8px 0 0 0' }}>
                  초대받은 사람이 동일 이메일로 로그인하면 자동으로 프로젝트에 참여됩니다
                </p>
              </section>
            )}

            <section>
              <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>참여 중 ({project.memberIds.length})</h2>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 8, marginBottom: 24 }}>
                {members.map((m, i) => {
                  const uid = project.memberIds[i];
                  const isThisOwner = uid === project.ownerId;
                  return (
                    <li
                      key={uid}
                      style={{ padding: 12, background: '#fff', borderRadius: 8, border: '1px solid #e5e9f2', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                    >
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{m?.displayName ?? '(정보 없음)'}</div>
                        <div style={{ fontSize: 12, color: '#888' }}>{m?.email ?? uid}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        {isThisOwner && (
                          <span style={{ fontSize: 10, padding: '2px 8px', background: '#e8efff', color: '#4a6bc4', borderRadius: 10, fontWeight: 600 }}>
                            총괄
                          </span>
                        )}
                        {isOwner && !isThisOwner && (
                          <button
                            onClick={() => onRemoveMember(uid, m?.displayName ?? m?.email ?? '멤버')}
                            style={{ padding: '4px 10px', fontSize: 11, background: '#fff', border: '1px solid #f0c8c8', borderRadius: 6, color: '#c33', cursor: 'pointer' }}
                          >
                            제거
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>

              {project.invitedEmails.length > 0 && (
                <>
                  <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>초대 대기 ({project.invitedEmails.length})</h2>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 8 }}>
                    {project.invitedEmails.map((email) => (
                      <li
                        key={email}
                        style={{ padding: 12, background: '#fff', borderRadius: 8, border: '1px dashed #d0d6e2', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                      >
                        <div style={{ fontSize: 13, color: '#555' }}>{email}</div>
                        {isOwner && (
                          <button
                            onClick={() => onCancelInvite(email)}
                            style={{ padding: '4px 10px', fontSize: 11, background: '#fff', border: '1px solid #f0c8c8', borderRadius: 6, color: '#c33', cursor: 'pointer' }}
                          >
                            취소
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </section>
          </>
        ) : null}
      </main>
    </div>
  );
}
