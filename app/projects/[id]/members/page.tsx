'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';
import {
  getProject,
  removeMember,
  updateMemberName,
  createInviteToken,
  listInviteTokens,
  revokeInviteToken,
  addEditor,
  removeEditor,
} from '@/lib/firestore';
import { Project, InviteToken } from '@/lib/types';

export default function MembersPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const projectId = params.id;
  const [project, setProject] = useState<Project | null>(null);
  const [tokens, setTokens] = useState<InviteToken[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [latestUrl, setLatestUrl] = useState<string | null>(null);
  const [editingUid, setEditingUid] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

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
      if (p.ownerId === user?.uid) {
        const ts = await listInviteTokens(projectId);
        setTokens(ts);
      }
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

  const onCreateLink = async () => {
    if (!project || !user) return;
    setCreating(true);
    try {
      const token = await createInviteToken(project.id, user.uid, 7);
      const origin = window.location.origin;
      const url = `${origin}/invite/${project.id}/${token}`;
      setLatestUrl(url);
      await refresh();
    } catch {
      alert('초대 링크 생성 실패');
    } finally {
      setCreating(false);
    }
  };

  const onRevoke = async (token: string) => {
    if (!project) return;
    if (!confirm('이 초대 링크를 무효화할까요? 이후 해당 링크로는 참여 불가합니다.')) return;
    await revokeInviteToken(project.id, token);
    await refresh();
  };

  const onCopy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      alert('링크가 복사되었습니다');
    } catch {
      alert('복사 실패 — 직접 선택 후 복사해주세요');
    }
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

  const onToggleEditor = async (uid: string, currentlyEditor: boolean) => {
    if (!project || !isOwner) return;
    if (currentlyEditor) {
      if (!confirm('편집 권한을 회수할까요? 이후 본인이 작성한 내역만 수정·삭제할 수 있습니다.')) return;
      await removeEditor(project.id, uid);
    } else {
      if (!confirm('편집 권한을 부여할까요? 이후 다른 사람이 작성한 내역도 수정·삭제할 수 있습니다.')) return;
      await addEditor(project.id, uid);
    }
    await refresh();
  };

  const startEdit = (uid: string, currentName: string) => {
    setEditingUid(uid);
    setEditingName(currentName);
  };

  const saveEdit = async () => {
    if (!project || !editingUid) return;
    const name = editingName.trim();
    if (!name) { alert('이름을 비울 수 없습니다'); return; }
    await updateMemberName(project.id, editingUid, name);
    setEditingUid(null);
    await refresh();
  };

  return (
    <div className="min-h-screen" style={{ background: '#f5f7fb' }}>
      <header style={{ padding: '16px 20px', background: '#fff', borderBottom: '1px solid #e5e9f2' }}>
        <Link href={`/projects/${projectId}`} style={{ fontSize: 14, color: '#555', textDecoration: 'none' }}>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                  <h2 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>초대 링크</h2>
                  <button
                    onClick={onCreateLink}
                    disabled={creating}
                    style={{ padding: '8px 14px', background: creating ? '#b5c4e8' : '#7b9fe8', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: creating ? 'default' : 'pointer' }}
                  >
                    {creating ? '생성 중...' : '+ 링크 생성 (7일 유효)'}
                  </button>
                </div>
                <p style={{ fontSize: 12, color: '#888', marginTop: 0, marginBottom: 8 }}>
                  생성된 링크를 받은 사람은 Google 로그인 후 자동으로 참여됩니다. 다회용.
                </p>

                {latestUrl && (
                  <div style={{ padding: 12, background: '#eef4ff', borderRadius: 8, marginBottom: 12 }}>
                    <div style={{ fontSize: 11, color: '#4a6bc4', marginBottom: 6, fontWeight: 600 }}>새 링크</div>
                    <div style={{ fontSize: 12, color: '#333', wordBreak: 'break-all', marginBottom: 8 }}>{latestUrl}</div>
                    <button
                      onClick={() => onCopy(latestUrl)}
                      style={{ padding: '6px 12px', background: '#7b9fe8', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                    >
                      복사
                    </button>
                  </div>
                )}

                {tokens.length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontSize: 11, color: '#888', fontWeight: 600, marginBottom: 6 }}>활성 링크 ({tokens.filter((t) => !t.revoked && t.expiresAt.toDate() > new Date()).length})</div>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 6 }}>
                      {tokens.map((t) => {
                        const expired = t.expiresAt.toDate() < new Date();
                        const dead = t.revoked || expired;
                        const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/invite/${project.id}/${t.id}`;
                        return (
                          <li
                            key={t.id}
                            style={{ padding: 10, background: dead ? '#f5f5f5' : '#fff', border: '1px solid #e5e9f2', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, opacity: dead ? 0.5 : 1, flexWrap: 'wrap' }}
                          >
                            <div style={{ fontSize: 11, color: '#666', flex: 1, minWidth: 0, wordBreak: 'break-all' }}>
                              {t.id.slice(0, 12)}...
                              <span style={{ marginLeft: 8, color: dead ? '#c33' : '#3a8e5f' }}>
                                {t.revoked ? '취소됨' : expired ? '만료' : `~${formatYmd(t.expiresAt.toDate())}`}
                              </span>
                              <span style={{ marginLeft: 8, color: '#888' }}>사용 {t.useCount}회</span>
                            </div>
                            {!dead && (
                              <div style={{ display: 'flex', gap: 4 }}>
                                <button onClick={() => onCopy(url)} style={miniBtn()}>복사</button>
                                <button onClick={() => onRevoke(t.id)} style={{ ...miniBtn(), color: '#c33', borderColor: '#f0c8c8' }}>취소</button>
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </section>
            )}

            <section>
              <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>참여 중 ({project.memberIds.length})</h2>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 8 }}>
                {project.memberIds.map((uid) => {
                  const isThisOwner = uid === project.ownerId;
                  const isEditorMember = (project.editorIds ?? []).includes(uid);
                  const displayName = project.memberNames?.[uid] ?? '(이름 없음)';
                  const canEdit = isOwner || uid === user.uid;
                  const isEditing = editingUid === uid;
                  return (
                    <li
                      key={uid}
                      style={{ padding: 12, background: '#fff', borderRadius: 8, border: '1px solid #e5e9f2', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}
                    >
                      <div style={{ flex: 1, minWidth: 120 }}>
                        {isEditing ? (
                          <input
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            style={{ padding: '6px 10px', fontSize: 14, border: '1px solid #d0d6e2', borderRadius: 6, outline: 'none', width: '100%', color: '#222', background: '#fff' }}
                            autoFocus
                          />
                        ) : (
                          <div style={{ fontSize: 14, fontWeight: 600, color: '#222' }}>{displayName}</div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                        {isThisOwner && <span style={{ fontSize: 10, padding: '2px 8px', background: '#e8efff', color: '#4a6bc4', borderRadius: 10, fontWeight: 600 }}>총괄</span>}
                        {!isThisOwner && isEditorMember && <span style={{ fontSize: 10, padding: '2px 8px', background: '#e8f5e9', color: '#2e7d32', borderRadius: 10, fontWeight: 600 }}>편집 권한</span>}
                        {isEditing ? (
                          <>
                            <button onClick={saveEdit} style={{ ...miniBtn(), color: '#4a6bc4', borderColor: '#c5d3ef' }}>저장</button>
                            <button onClick={() => setEditingUid(null)} style={miniBtn()}>취소</button>
                          </>
                        ) : (
                          <>
                            {canEdit && <button onClick={() => startEdit(uid, displayName)} style={miniBtn()}>이름 수정</button>}
                            {isOwner && !isThisOwner && (
                              <button
                                onClick={() => onToggleEditor(uid, isEditorMember)}
                                style={{ ...miniBtn(), color: isEditorMember ? '#c33' : '#2e7d32', borderColor: isEditorMember ? '#f0c8c8' : '#c6e7c9' }}
                              >
                                {isEditorMember ? '권한 회수' : '편집 권한'}
                              </button>
                            )}
                            {isOwner && !isThisOwner && (
                              <button onClick={() => onRemoveMember(uid, displayName)} style={{ ...miniBtn(), color: '#c33', borderColor: '#f0c8c8' }}>제거</button>
                            )}
                          </>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          </>
        ) : null}
      </main>
    </div>
  );
}

function miniBtn(): React.CSSProperties {
  return { padding: '4px 10px', fontSize: 11, background: '#fff', border: '1px solid #d0d6e2', borderRadius: 6, color: '#555', cursor: 'pointer' };
}

function formatYmd(d: Date): string {
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}
