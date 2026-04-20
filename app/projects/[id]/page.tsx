'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';
import {
  getProject,
  deleteProject,
  listRecords,
  deleteRecord,
  addCategory,
  removeCategory,
  addPaymentCard,
  removePaymentCard,
} from '@/lib/firestore';
import { Project, ExpenseRecord } from '@/lib/types';
import { exportRecordsToExcel, exportReceiptsAsZip, downloadSingleReceipt } from '@/lib/export';

const ALL_TAB = '__all__';

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
  const [selectedTab, setSelectedTab] = useState<string>(ALL_TAB);
  const [showSettings, setShowSettings] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [cardLabel, setCardLabel] = useState('');

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
      // 무시
    } finally {
      setLoadingRecords(false);
    }
  };

  useEffect(() => {
    if (user && projectId) { loadProject(); loadRecords(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, projectId]);

  if (loading || !user) return null;

  const isOwner = project?.ownerId === user.uid;
  const visibleRecords = selectedTab === ALL_TAB ? records : records.filter((r) => r.categoryId === selectedTab);
  const total = visibleRecords.reduce((s, r) => s + (r.amount ?? 0), 0);

  const onDeleteProject = async () => {
    if (!project || !isOwner) return;
    if (!confirm(`"${project.name}" 프로젝트를 삭제합니다. 내역과 영수증은 별도 정리되지 않습니다. 계속할까요?`)) return;
    try { await deleteProject(project.id); router.replace('/dashboard'); } catch { alert('삭제 실패'); }
  };

  const onDeleteRecord = async (r: ExpenseRecord) => {
    if (!project) return;
    if (!confirm(`${r.merchant} ${formatMoney(r.amount)}원 내역을 삭제할까요?`)) return;
    try { await deleteRecord(project.id, r.id); await loadRecords(); } catch { alert('삭제 실패'); }
  };

  const onExportExcel = () => {
    if (!project || visibleRecords.length === 0) return;
    try { exportRecordsToExcel(project, visibleRecords); } catch (e) { console.error(e); alert('엑셀 생성 실패'); }
  };

  const onExportZip = async () => {
    if (!project || visibleRecords.length === 0) return;
    setZipProgress({ done: 0, total: visibleRecords.length });
    try { await exportReceiptsAsZip(project, visibleRecords, (done, total) => setZipProgress({ done, total })); }
    catch (e) { console.error(e); alert(e instanceof Error ? e.message : 'Zip 생성 실패'); }
    finally { setZipProgress(null); }
  };

  const onDownloadSingle = async (r: ExpenseRecord, index: number) => {
    if (!project) return;
    if (!r.receiptUrl) { alert('영수증이 없습니다'); return; }
    try { await downloadSingleReceipt(r, project.name, index); } catch { alert('다운로드 실패'); }
  };

  const onAddCategory = async (e: FormEvent) => {
    e.preventDefault();
    if (!project || !isOwner) return;
    const name = newCategory.trim();
    if (!name) return;
    if (project.categories.includes(name)) { alert('이미 있는 카테고리'); return; }
    await addCategory(project.id, name);
    setNewCategory('');
    await loadProject();
  };

  const onRemoveCategory = async (name: string) => {
    if (!project || !isOwner) return;
    const inUse = records.some((r) => r.categoryId === name);
    if (inUse && !confirm(`"${name}" 카테고리에 내역이 있습니다. 삭제해도 기존 내역은 남지만 필터 탭에서 사라집니다. 계속할까요?`)) return;
    if (!confirm(`"${name}" 카테고리를 삭제할까요?`)) return;
    await removeCategory(project.id, name);
    if (selectedTab === name) setSelectedTab(ALL_TAB);
    await loadProject();
  };

  const onAddCard = async (e: FormEvent) => {
    e.preventDefault();
    if (!project || !isOwner) return;
    const label = cardLabel.trim();
    if (!label) return;
    const id = `card_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    await addPaymentCard(project.id, { id, label });
    setCardLabel('');
    await loadProject();
  };

  const onRemoveCard = async (cardId: string, label: string) => {
    if (!project || !isOwner) return;
    if (!confirm(`카드 "${label}"를 삭제할까요? 기존 내역의 카드 정보는 그대로 남습니다.`)) return;
    await removePaymentCard(project.id, cardId);
    await loadProject();
  };

  return (
    <div className="min-h-screen" style={{ background: '#f5f7fb' }}>
      <header style={{ padding: '16px 20px', background: '#fff', borderBottom: '1px solid #e5e9f2' }}>
        <Link href="/dashboard" style={{ fontSize: 14, color: '#555', textDecoration: 'none' }}>← 프로젝트 목록</Link>
      </header>

      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px' }}>
        {loadingProject ? (
          <p style={{ color: '#888' }}>로딩 중...</p>
        ) : error ? (
          <p style={{ color: '#c33' }}>{error}</p>
        ) : project ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
              <div>
                <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, marginBottom: 4 }}>{project.name}</h1>
                <p style={{ fontSize: 13, color: '#888', margin: 0 }}>
                  {formatDate(project.startDate)} ~ {project.endDate ? formatDate(project.endDate) : '-'}
                </p>
              </div>
              {isOwner && <span style={ownerBadge}>총괄</span>}
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              <Link href={`/projects/${project.id}/members`} style={btnSecondary}>
                멤버 ({project.memberIds.length})
              </Link>
              {isOwner && (
                <>
                  <button onClick={() => setShowSettings(!showSettings)} style={{ ...btnSecondary, cursor: 'pointer' }}>
                    {showSettings ? '설정 닫기' : '설정'}
                  </button>
                  <button onClick={onDeleteProject} style={{ ...btnSecondary, color: '#c33', borderColor: '#f0c8c8', cursor: 'pointer' }}>
                    프로젝트 삭제
                  </button>
                </>
              )}
            </div>

            {showSettings && isOwner && (
              <section style={settingsBox}>
                <div>
                  <h3 style={settingsTitle}>카테고리</h3>
                  <form onSubmit={onAddCategory} style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                    <input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="예: 현장 운영비" style={{ flex: 1, ...inlineInput }} />
                    <button type="submit" style={btnPrimary}>+ 추가</button>
                  </form>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {project.categories.map((c) => (
                      <span key={c} style={chip}>
                        {c}
                        <button onClick={() => onRemoveCategory(c)} style={chipClose}>×</button>
                      </span>
                    ))}
                    {project.categories.length === 0 && <span style={{ fontSize: 12, color: '#888' }}>추가된 카테고리 없음</span>}
                  </div>
                </div>

                <div style={{ marginTop: 16 }}>
                  <h3 style={settingsTitle}>법인카드</h3>
                  <form onSubmit={onAddCard} style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                    <input value={cardLabel} onChange={(e) => setCardLabel(e.target.value)} placeholder="예: 신한 법인카드 ****0912" style={{ flex: 1, ...inlineInput }} />
                    <button type="submit" style={btnPrimary}>+ 등록</button>
                  </form>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {project.paymentCards.map((c) => (
                      <span key={c.id} style={chip}>
                        {c.label}
                        <button onClick={() => onRemoveCard(c.id, c.label)} style={chipClose}>×</button>
                      </span>
                    ))}
                    {project.paymentCards.length === 0 && <span style={{ fontSize: 12, color: '#888' }}>등록된 카드 없음</span>}
                  </div>
                </div>
              </section>
            )}

            <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
              <TabBtn active={selectedTab === ALL_TAB} onClick={() => setSelectedTab(ALL_TAB)}>전체 ({records.length})</TabBtn>
              {project.categories.map((c) => {
                const count = records.filter((r) => r.categoryId === c).length;
                return (
                  <TabBtn key={c} active={selectedTab === c} onClick={() => setSelectedTab(c)}>{c} ({count})</TabBtn>
                );
              })}
            </div>

            <div style={summaryBox}>
              <div>
                <div style={{ fontSize: 12, color: '#888', marginBottom: 2 }}>
                  {selectedTab === ALL_TAB ? '전체 지출' : `${selectedTab} 소계`}
                </div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{formatMoney(total)}원</div>
              </div>
              <Link href={`/projects/${project.id}/new-record`} style={btnPrimary}>+ 내역 추가</Link>
            </div>

            <section>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                <h2 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>내역 ({visibleRecords.length})</h2>
                {visibleRecords.length > 0 && (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={onExportExcel} style={btnSmall}>📊 엑셀</button>
                    <button onClick={onExportZip} disabled={!!zipProgress} style={{ ...btnSmall, color: zipProgress ? '#999' : '#333' }}>
                      {zipProgress ? `Zip ${zipProgress.done}/${zipProgress.total}` : '📦 Zip'}
                    </button>
                  </div>
                )}
              </div>

              {loadingRecords ? (
                <p style={{ color: '#888' }}>로딩 중...</p>
              ) : visibleRecords.length === 0 ? (
                <div style={emptyBox}>아직 내역이 없습니다. 영수증을 추가해보세요.</div>
              ) : (
                <div style={{ background: '#fff', border: '1px solid #e5e9f2', borderRadius: 8, overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 1000 }}>
                    <thead>
                      <tr style={{ background: '#f5f7fb', color: '#555' }}>
                        <th style={thStyle}>#</th>
                        <th style={thStyle}>일자</th>
                        <th style={thStyle}>구분</th>
                        <th style={thStyle}>카테고리</th>
                        <th style={thStyle}>구매처</th>
                        <th style={thStyle}>내용</th>
                        <th style={{ ...thStyle, textAlign: 'right' }}>금액</th>
                        <th style={thStyle}>결제수단</th>
                        <th style={thStyle}>결제자</th>
                        <th style={thStyle}>이용자</th>
                        <th style={thStyle}>영수증</th>
                        <th style={thStyle}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleRecords.map((r, i) => {
                        const canEdit = r.createdBy === user.uid || isOwner;
                        return (
                          <tr key={r.id} style={{ borderTop: '1px solid #eef1f7' }}>
                            <td style={{ ...tdStyle, color: '#888', textAlign: 'center' }}>{i + 1}</td>
                            <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>{formatDate(r.date)}</td>
                            <td style={tdStyle}><span style={tag}>{r.type}</span></td>
                            <td style={{ ...tdStyle, color: '#666' }}>{r.categoryId || '-'}</td>
                            <td style={{ ...tdStyle, fontWeight: 600 }}>{r.merchant}</td>
                            <td style={{ ...tdStyle, color: '#666', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.content}>{r.content || '-'}</td>
                            <td style={{ ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{formatMoney(r.amount)}</td>
                            <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <span style={{ fontSize: 11 }}>{r.paymentType}</span>
                                {r.paymentCardLabel && <span style={{ fontSize: 10, color: '#888' }}>{r.paymentCardLabel}</span>}
                              </div>
                            </td>
                            <td style={{ ...tdStyle, color: '#666' }}>{r.payerName || '-'}</td>
                            <td style={{ ...tdStyle, color: '#666', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.userNames}>{r.userNames || '-'}</td>
                            <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                              {r.receiptUrl ? (
                                <>
                                  <a href={r.receiptUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: '#7b9fe8', textDecoration: 'none', marginRight: 6 }}>보기</a>
                                  <button onClick={() => onDownloadSingle(r, i)} style={linkBtn}>저장</button>
                                </>
                              ) : (
                                <span style={{ fontSize: 11, color: '#c33' }}>미제출</span>
                              )}
                            </td>
                            <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                              {canEdit && (
                                <>
                                  <Link href={`/projects/${project.id}/records/${r.id}/edit`} style={{ ...miniBtn, marginRight: 4 }}>수정</Link>
                                  <button onClick={() => onDeleteRecord(r)} style={{ ...miniBtn, color: '#c33', borderColor: '#f0c8c8' }}>삭제</button>
                                </>
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

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '8px 14px',
        fontSize: 13,
        fontWeight: 600,
        border: `1px solid ${active ? '#7b9fe8' : '#d0d6e2'}`,
        background: active ? '#7b9fe8' : '#fff',
        color: active ? '#fff' : '#555',
        borderRadius: 8,
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  );
}

function formatDate(ts: { toDate: () => Date }): string {
  const d = ts.toDate();
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}
function formatMoney(n: number): string {
  return n.toLocaleString('ko-KR');
}

const ownerBadge: React.CSSProperties = { fontSize: 11, padding: '3px 10px', background: '#e8efff', color: '#4a6bc4', borderRadius: 10, fontWeight: 600 };
const btnPrimary: React.CSSProperties = { padding: '10px 16px', background: '#7b9fe8', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none', cursor: 'pointer', display: 'inline-block' };
const btnSecondary: React.CSSProperties = { padding: '8px 14px', background: '#fff', border: '1px solid #d0d6e2', borderRadius: 8, fontSize: 13, color: '#555', textDecoration: 'none' };
const btnSmall: React.CSSProperties = { padding: '6px 12px', fontSize: 12, background: '#fff', border: '1px solid #d0d6e2', borderRadius: 6, cursor: 'pointer', fontWeight: 600, color: '#333' };
const summaryBox: React.CSSProperties = { padding: 16, background: '#fff', borderRadius: 12, border: '1px solid #e5e9f2', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 };
const settingsBox: React.CSSProperties = { padding: 16, background: '#fff', borderRadius: 12, border: '1px solid #e5e9f2', marginBottom: 16 };
const settingsTitle: React.CSSProperties = { fontSize: 13, fontWeight: 700, margin: 0, marginBottom: 8, color: '#555' };
const inlineInput: React.CSSProperties = { padding: '8px 10px', fontSize: 13, border: '1px solid #d0d6e2', borderRadius: 6, outline: 'none' };
const chip: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', background: '#eef4ff', color: '#4a6bc4', borderRadius: 14, fontSize: 12, fontWeight: 600 };
const chipClose: React.CSSProperties = { background: 'transparent', border: 'none', color: '#4a6bc4', cursor: 'pointer', fontSize: 14, padding: 0, lineHeight: 1 };
const emptyBox: React.CSSProperties = { padding: 24, background: '#fff', border: '1px dashed #d0d6e2', borderRadius: 12, textAlign: 'center', color: '#888', fontSize: 13 };
const thStyle: React.CSSProperties = { padding: '10px 10px', fontSize: 11, fontWeight: 700, textAlign: 'left', whiteSpace: 'nowrap' };
const tdStyle: React.CSSProperties = { padding: '10px 10px', fontSize: 12, color: '#333' };
const tag: React.CSSProperties = { fontSize: 10, padding: '2px 6px', background: '#f0f2f8', color: '#555', borderRadius: 4 };
const linkBtn: React.CSSProperties = { fontSize: 11, background: 'none', border: 'none', color: '#7b9fe8', cursor: 'pointer', padding: 0, textDecoration: 'underline' };
const miniBtn: React.CSSProperties = { padding: '4px 8px', fontSize: 11, background: '#fff', border: '1px solid #d0d6e2', borderRadius: 4, color: '#555', cursor: 'pointer', textDecoration: 'none', display: 'inline-block' };
