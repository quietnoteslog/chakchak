'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';
import { getProject, deleteProject, listRecords, deleteRecord } from '@/lib/firestore';
import { Project, ExpenseRecord } from '@/lib/types';

export default function ProjectDetailPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const projectId = params.id;
  const [project, setProject] = useState<Project | null>(null);
  const [records, setRecords] = useState<ExpenseRecord[]>([]);
  const [loadingProject, setLoadingProject] = useState(true);
  const [loadingRecords, setLoadingRecords] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  const loadProject = async () => {
    if (!user || !projectId) return;
    setLoadingProject(true);
    try {
      const p = await getProject(projectId);
      if (!p) setError('프로젝트를 찾을 수 없습니다');
      else if (!p.memberIds.includes(user.uid)) setError('접근 권한이 없습니다');
      else setProject(p);
    } catch {
      setError('불러오기 실패');
    } finally {
      setLoadingProject(false);
    }
  };

  const loadRecords = async () => {
    if (!projectId) return;
    setLoadingRecords(true);
    try {
      const list = await listRecords(projectId);
      setRecords(list);
    } catch {
      // 규칙 에러 등 무시 — 프로젝트 본문은 보이게
    } finally {
      setLoadingRecords(false);
    }
  };

  useEffect(() => {
    if (user && projectId) {
      loadProject();
      loadRecords();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, projectId]);

  if (loading || !user) return null;

  const isOwner = project?.ownerId === user.uid;
  const total = records.reduce((sum, r) => sum + (r.amount ?? 0), 0);

  const onDeleteProject = async () => {
    if (!project || !isOwner) return;
    if (!confirm(`"${project.name}" 프로젝트를 삭제합니다. 내역은 별도 정리되지 않습니다. 계속할까요?`)) return;
    try {
      await deleteProject(project.id);
      router.replace('/dashboard');
    } catch {
      alert('삭제 실패');
    }
  };

  const onDeleteRecord = async (r: ExpenseRecord) => {
    if (!project) return;
    if (!confirm(`${r.merchant} ${formatMoney(r.amount)}원 내역을 삭제할까요?`)) return;
    try {
      await deleteRecord(project.id, r.id);
      await loadRecords();
    } catch {
      alert('삭제 실패 (권한이 없거나 네트워크 오류)');
    }
  };

  return (
    <div className="min-h-screen" style={{ background: '#f5f7fb' }}>
      <header style={{ padding: '16px 20px', background: '#fff', borderBottom: '1px solid #e5e9f2' }}>
        <Link href="/dashboard" style={{ fontSize: 14, color: '#555', textDecoration: 'none' }}>
          ← 프로젝트 목록
        </Link>
      </header>

      <main style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px' }}>
        {loadingProject ? (
          <p style={{ color: '#888' }}>로딩 중...</p>
        ) : error ? (
          <p style={{ color: '#c33' }}>{error}</p>
        ) : project ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, marginBottom: 4 }}>{project.name}</h1>
                <p style={{ fontSize: 13, color: '#888', margin: 0 }}>
                  {formatDate(project.startDate)} ~ {project.endDate ? formatDate(project.endDate) : '-'}
                </p>
              </div>
              {isOwner && (
                <span style={{ fontSize: 11, padding: '3px 10px', background: '#e8efff', color: '#4a6bc4', borderRadius: 10, fontWeight: 600 }}>
                  총괄
                </span>
              )}
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
              <Link
                href={`/projects/${project.id}/members`}
                style={{ padding: '8px 14px', background: '#fff', border: '1px solid #d0d6e2', borderRadius: 8, fontSize: 13, color: '#555', textDecoration: 'none' }}
              >
                멤버 ({project.memberIds.length})
              </Link>
              {isOwner && (
                <button
                  onClick={onDeleteProject}
                  style={{ padding: '8px 14px', background: '#fff', border: '1px solid #f0c8c8', borderRadius: 8, fontSize: 13, color: '#c33', cursor: 'pointer' }}
                >
                  프로젝트 삭제
                </button>
              )}
            </div>

            <div style={{ padding: 16, background: '#fff', borderRadius: 12, border: '1px solid #e5e9f2', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 12, color: '#888', marginBottom: 2 }}>총 지출</div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{formatMoney(total)}원</div>
              </div>
              <Link
                href={`/projects/${project.id}/new-record`}
                style={{ padding: '10px 16px', background: '#7b9fe8', color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}
              >
                + 영수증 추가
              </Link>
            </div>

            <section>
              <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>내역 ({records.length})</h2>
              {loadingRecords ? (
                <p style={{ color: '#888' }}>로딩 중...</p>
              ) : records.length === 0 ? (
                <div style={{ padding: 24, background: '#fff', border: '1px dashed #d0d6e2', borderRadius: 12, textAlign: 'center', color: '#888', fontSize: 13 }}>
                  아직 내역이 없습니다. 영수증을 추가해보세요.
                </div>
              ) : (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 8 }}>
                  {records.map((r) => {
                    const canDelete = r.createdBy === user.uid || isOwner;
                    return (
                      <li
                        key={r.id}
                        style={{ padding: 12, background: '#fff', border: '1px solid #e5e9f2', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 2, flexWrap: 'wrap' }}>
                            <strong style={{ fontSize: 14 }}>{r.merchant}</strong>
                            <span style={{ fontSize: 10, padding: '1px 6px', background: '#f0f2f8', color: '#666', borderRadius: 4 }}>{r.paymentMethod}</span>
                          </div>
                          <div style={{ fontSize: 12, color: '#888' }}>
                            {formatDate(r.date)} · {r.createdByName || '-'}
                          </div>
                          {r.memo && <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>{r.memo}</div>}
                          <a href={r.receiptUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: '#7b9fe8', textDecoration: 'none', marginTop: 4, display: 'inline-block' }}>
                            영수증 보기 →
                          </a>
                        </div>
                        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                          <strong style={{ fontSize: 15 }}>{formatMoney(r.amount)}원</strong>
                          {canDelete && (
                            <button
                              onClick={() => onDeleteRecord(r)}
                              style={{ padding: '2px 8px', fontSize: 11, background: '#fff', border: '1px solid #f0c8c8', borderRadius: 4, color: '#c33', cursor: 'pointer' }}
                            >
                              삭제
                            </button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </>
        ) : null}
      </main>
    </div>
  );
}

function formatDate(ts: { toDate: () => Date }): string {
  const d = ts.toDate();
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

function formatMoney(n: number): string {
  return n.toLocaleString('ko-KR');
}
