'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';
import { getProject, deleteProject, listRecords, deleteRecord } from '@/lib/firestore';
import { Project, ExpenseRecord } from '@/lib/types';
import { exportRecordsToExcel, exportReceiptsAsZip, downloadSingleReceipt } from '@/lib/export';

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
  const [zipProgress, setZipProgress] = useState<{ done: number; total: number } | null>(null);

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

  const onExportExcel = () => {
    if (!project || records.length === 0) return;
    try {
      exportRecordsToExcel(project, records);
    } catch (e) {
      console.error(e);
      alert('엑셀 생성 실패');
    }
  };

  const onExportZip = async () => {
    if (!project || records.length === 0) return;
    setZipProgress({ done: 0, total: records.length });
    try {
      await exportReceiptsAsZip(project, records, (done, total) => setZipProgress({ done, total }));
    } catch (e) {
      console.error(e);
      alert('Zip 생성 실패');
    } finally {
      setZipProgress(null);
    }
  };

  const onDownloadSingleReceipt = async (r: ExpenseRecord, index: number) => {
    if (!project) return;
    try {
      await downloadSingleReceipt(r, project.name, index);
    } catch {
      alert('다운로드 실패');
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                <h2 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>내역 ({records.length})</h2>
                {records.length > 0 && (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={onExportExcel}
                      style={{ padding: '6px 12px', fontSize: 12, background: '#fff', border: '1px solid #d0d6e2', borderRadius: 6, color: '#333', cursor: 'pointer', fontWeight: 600 }}
                    >
                      📊 엑셀
                    </button>
                    <button
                      onClick={onExportZip}
                      disabled={!!zipProgress}
                      style={{ padding: '6px 12px', fontSize: 12, background: '#fff', border: '1px solid #d0d6e2', borderRadius: 6, color: zipProgress ? '#999' : '#333', cursor: zipProgress ? 'default' : 'pointer', fontWeight: 600 }}
                    >
                      {zipProgress ? `Zip ${zipProgress.done}/${zipProgress.total}` : '📦 Zip'}
                    </button>
                  </div>
                )}
              </div>
              {loadingRecords ? (
                <p style={{ color: '#888' }}>로딩 중...</p>
              ) : records.length === 0 ? (
                <div style={{ padding: 24, background: '#fff', border: '1px dashed #d0d6e2', borderRadius: 12, textAlign: 'center', color: '#888', fontSize: 13 }}>
                  아직 내역이 없습니다. 영수증을 추가해보세요.
                </div>
              ) : (
                <div style={{ background: '#fff', border: '1px solid #e5e9f2', borderRadius: 8, overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 680 }}>
                    <thead>
                      <tr style={{ background: '#f5f7fb', color: '#555' }}>
                        <th style={thStyle}>No</th>
                        <th style={thStyle}>일자</th>
                        <th style={thStyle}>가맹점</th>
                        <th style={thStyle}>결제수단</th>
                        <th style={thStyle}>작성자</th>
                        <th style={{ ...thStyle, textAlign: 'right' }}>금액</th>
                        <th style={thStyle}>영수증</th>
                        <th style={thStyle}>메모</th>
                        <th style={thStyle}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {records.map((r, i) => {
                        const canDelete = r.createdBy === user.uid || isOwner;
                        return (
                          <tr key={r.id} style={{ borderTop: '1px solid #eef1f7' }}>
                            <td style={{ ...tdStyle, color: '#888', width: 36, textAlign: 'center' }}>{i + 1}</td>
                            <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>{formatDate(r.date)}</td>
                            <td style={{ ...tdStyle, fontWeight: 600 }}>{r.merchant}</td>
                            <td style={tdStyle}>
                              <span style={{ fontSize: 11, padding: '2px 8px', background: '#f0f2f8', color: '#555', borderRadius: 4 }}>{r.paymentMethod}</span>
                            </td>
                            <td style={{ ...tdStyle, color: '#666' }}>{r.createdByName || '-'}</td>
                            <td style={{ ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                              {formatMoney(r.amount)}
                            </td>
                            <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                              <a href={r.receiptUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: '#7b9fe8', textDecoration: 'none', marginRight: 8 }}>
                                보기
                              </a>
                              <button
                                type="button"
                                onClick={() => onDownloadSingleReceipt(r, i)}
                                style={{ fontSize: 11, background: 'none', border: 'none', color: '#7b9fe8', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
                              >
                                저장
                              </button>
                            </td>
                            <td style={{ ...tdStyle, color: '#666', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.memo}>
                              {r.memo || '-'}
                            </td>
                            <td style={tdStyle}>
                              {canDelete && (
                                <button
                                  onClick={() => onDeleteRecord(r)}
                                  style={{ padding: '2px 8px', fontSize: 11, background: '#fff', border: '1px solid #f0c8c8', borderRadius: 4, color: '#c33', cursor: 'pointer' }}
                                >
                                  삭제
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
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

const thStyle: React.CSSProperties = {
  padding: '10px 12px',
  fontSize: 12,
  fontWeight: 700,
  textAlign: 'left',
  whiteSpace: 'nowrap',
};

const tdStyle: React.CSSProperties = {
  padding: '10px 12px',
  fontSize: 13,
  color: '#333',
};
