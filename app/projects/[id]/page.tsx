'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, FileSpreadsheet, FileText, Archive, X, Users, Settings, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import {
  getProject,
  deleteProject,
  listRecords,
  deleteRecord,
  addCategory,
  removeCategory,
  addCategory2,
  removeCategory2,
  setCategories,
  setCategories2,
  addPaymentCard,
  removePaymentCard,
} from '@/lib/firestore';
import { Project, ExpenseRecord, RECORD_TYPES, PAYMENT_TYPES } from '@/lib/types';
import { exportRecordsToExcel, exportRecordsToPdf, exportReceiptsAsZip, downloadSingleReceipt } from '@/lib/export';

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
  const [newCategory2, setNewCategory2] = useState('');
  const [cardBank, setCardBank] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  // 필터
  const [filterType, setFilterType] = useState<string>('');           // 구분
  const [filterCategory2, setFilterCategory2] = useState<string>(''); // 카테고리2
  const [filterPayer, setFilterPayer] = useState<string>('');         // 결제자 uid
  const [filterPaymentType, setFilterPaymentType] = useState<string>(''); // 결제수단
  const [filterQuery, setFilterQuery] = useState<string>('');         // 검색어
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');   // 기간 시작
  const [filterDateTo, setFilterDateTo] = useState<string>('');       // 기간 종료
  const [filterAmountMin, setFilterAmountMin] = useState<string>(''); // 금액 최소
  const [filterAmountMax, setFilterAmountMax] = useState<string>(''); // 금액 최대
  const [showFilter, setShowFilter] = useState(false);
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [pdfColumns, setPdfColumns] = useState<Record<string, boolean>>({
    no: true, date: true, type: true, category1: true, category2: true,
    merchant: true, content: true, amount: true,
    paymentType: true, payer: false, userNames: false, memo: false,
  });
  const [pdfIncludeReceipts, setPdfIncludeReceipts] = useState(true);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

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
  const q = filterQuery.trim().toLowerCase();
  const visibleRecords = records.filter((r) => {
    if (selectedTab !== ALL_TAB && r.categoryId !== selectedTab) return false;
    if (filterType && r.type !== filterType) return false;
    if (filterCategory2 && r.categoryId2 !== filterCategory2) return false;
    if (filterPayer && r.payerId !== filterPayer) return false;
    if (filterPaymentType && r.paymentType !== filterPaymentType) return false;
    if (filterDateFrom || filterDateTo) {
      const d = r.date.toDate().toISOString().slice(0, 10);
      if (filterDateFrom && d < filterDateFrom) return false;
      if (filterDateTo && d > filterDateTo) return false;
    }
    if (filterAmountMin && r.amount < Number(filterAmountMin)) return false;
    if (filterAmountMax && r.amount > Number(filterAmountMax)) return false;
    if (q) {
      const hay = `${r.merchant ?? ''} ${r.content ?? ''} ${r.memo ?? ''} ${r.userNames ?? ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
  const total = visibleRecords.filter(r => !r.currency || r.currency === 'KRW').reduce((s, r) => s + (r.amount ?? 0), 0);
  const foreignTotals = visibleRecords
    .filter(r => r.currency && r.currency !== 'KRW')
    .reduce((acc, r) => { acc[r.currency!] = (acc[r.currency!] ?? 0) + r.amount; return acc; }, {} as Record<string, number>);
  const activeFilterCount = [filterType, filterCategory2, filterPayer, filterPaymentType, q, filterDateFrom, filterDateTo, filterAmountMin, filterAmountMax].filter(Boolean).length;
  const resetFilters = () => {
    setFilterType(''); setFilterCategory2(''); setFilterPayer(''); setFilterPaymentType(''); setFilterQuery('');
    setFilterDateFrom(''); setFilterDateTo(''); setFilterAmountMin(''); setFilterAmountMax('');
  };

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
    // 화면: 최신순(내림차순), 엑셀: 오래된 순(오름차순)
    const ordered = [...visibleRecords].reverse();
    try { exportRecordsToExcel(project, ordered); } catch (e) { console.error(e); alert('엑셀 생성 실패'); }
  };

  const onExportPdf = async () => {
    if (!project || visibleRecords.length === 0) return;
    const filterSummary = buildFilterSummary({
      tab: selectedTab === ALL_TAB ? '' : selectedTab,
      type: filterType,
      category2: filterCategory2,
      payer: filterPayer ? (project.memberNames?.[filterPayer] ?? filterPayer) : '',
      paymentType: filterPaymentType,
      query: q,
    });
    setPdfGenerating(true);
    try {
      // 화면: 최신순(내림차순), PDF: 오래된 순(오름차순)
      const ordered = [...visibleRecords].reverse();
      await exportRecordsToPdf(project, ordered, {
        filterSummary,
        columns: pdfColumns,
        includeReceipts: pdfIncludeReceipts,
      });
      setPdfModalOpen(false);
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : 'PDF 생성 실패');
    } finally {
      setPdfGenerating(false);
    }
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
    if ((project.categories ?? []).includes(name)) { alert('이미 있는 카테고리'); return; }
    await addCategory(project.id, name);
    setNewCategory('');
    await loadProject();
  };

  const onRemoveCategory = async (name: string) => {
    if (!project || !isOwner) return;
    const inUse = records.some((r) => r.categoryId === name);
    if (inUse && !confirm(`"${name}" 카테고리1에 내역이 있습니다. 삭제해도 기존 내역은 남지만 필터 탭에서 사라집니다. 계속할까요?`)) return;
    if (!confirm(`"${name}" 카테고리1을 삭제할까요?`)) return;
    await removeCategory(project.id, name);
    if (selectedTab === name) setSelectedTab(ALL_TAB);
    await loadProject();
  };

  const onMoveCategory = async (which: 1 | 2, index: number, delta: -1 | 1) => {
    if (!project || !isOwner) return;
    const source = which === 1 ? (project.categories ?? []) : (project.categories2 ?? []);
    const list = [...source];
    const to = index + delta;
    if (to < 0 || to >= list.length) return;
    [list[index], list[to]] = [list[to], list[index]];
    if (which === 1) await setCategories(project.id, list);
    else await setCategories2(project.id, list);
    await loadProject();
  };

  const onAddCategory2 = async (e: FormEvent) => {
    e.preventDefault();
    if (!project || !isOwner) return;
    const name = newCategory2.trim();
    if (!name) return;
    if ((project.categories2 ?? []).includes(name)) { alert('이미 있는 카테고리'); return; }
    await addCategory2(project.id, name);
    setNewCategory2('');
    await loadProject();
  };

  const onRemoveCategory2 = async (name: string) => {
    if (!project || !isOwner) return;
    const inUse = records.some((r) => r.categoryId2 === name);
    if (inUse && !confirm(`"${name}" 카테고리2에 내역이 있습니다. 삭제해도 기존 내역은 남지만 추후 선택 불가입니다. 계속할까요?`)) return;
    if (!confirm(`"${name}" 카테고리2를 삭제할까요?`)) return;
    await removeCategory2(project.id, name);
    await loadProject();
  };

  const onAddCard = async (e: FormEvent) => {
    e.preventDefault();
    if (!project || !isOwner) return;
    const bank = cardBank.trim();
    const number = cardNumber.trim();
    if (!bank || !number) { alert('카드사와 카드번호를 모두 입력해주세요'); return; }
    const label = `${bank} ${number}`;
    const id = `card_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    await addPaymentCard(project.id, { id, label, bank, number });
    setCardBank('');
    setCardNumber('');
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
      <header style={{ padding: '16px 20px', background: 'linear-gradient(135deg, #a8c8f8 0%, #7b9fe8 50%, #8b7fd4 100%)' }}>
        <Link href="/dashboard" style={{ fontSize: 14, color: '#fff', textDecoration: 'none', opacity: 0.9, display: 'inline-flex', alignItems: 'center', gap: 4 }}><ArrowLeft size={16} />프로젝트 목록</Link>
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
              <Link href={`/projects/${project.id}/members`} style={{ ...btnSecondary, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <Users size={14} />멤버 ({project.memberIds.length})
              </Link>
              {isOwner && (
                <>
                  <button onClick={() => setShowSettings(!showSettings)} style={{ ...btnSecondary, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <Settings size={14} />{showSettings ? '설정 닫기' : '설정'}
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
                  <h3 style={settingsTitle}>카테고리1</h3>
                  <form onSubmit={onAddCategory} style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                    <input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="예: 사전 업무" style={{ flex: 1, ...inlineInput }} />
                    <button type="submit" style={btnPrimary}>+ 추가</button>
                  </form>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {(project.categories ?? []).map((c, i, arr) => (
                      <span key={c} style={chip}>
                        <button onClick={() => onMoveCategory(1, i, -1)} disabled={i === 0} style={{ ...chipArrow, opacity: i === 0 ? 0.3 : 1 }} title="위로">↑</button>
                        <button onClick={() => onMoveCategory(1, i, 1)} disabled={i === arr.length - 1} style={{ ...chipArrow, opacity: i === arr.length - 1 ? 0.3 : 1 }} title="아래로">↓</button>
                        {c}
                        <button onClick={() => onRemoveCategory(c)} style={chipClose}><X size={12} /></button>
                      </span>
                    ))}
                    {(project.categories ?? []).length === 0 && <span style={{ fontSize: 12, color: '#888' }}>추가된 카테고리 없음</span>}
                  </div>
                </div>

                <div style={{ marginTop: 16 }}>
                  <h3 style={settingsTitle}>카테고리2</h3>
                  <form onSubmit={onAddCategory2} style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                    <input value={newCategory2} onChange={(e) => setNewCategory2(e.target.value)} placeholder="예: 식비" style={{ flex: 1, ...inlineInput }} />
                    <button type="submit" style={btnPrimary}>+ 추가</button>
                  </form>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {(project.categories2 ?? []).map((c, i, arr) => (
                      <span key={c} style={chip}>
                        <button onClick={() => onMoveCategory(2, i, -1)} disabled={i === 0} style={{ ...chipArrow, opacity: i === 0 ? 0.3 : 1 }} title="위로">↑</button>
                        <button onClick={() => onMoveCategory(2, i, 1)} disabled={i === arr.length - 1} style={{ ...chipArrow, opacity: i === arr.length - 1 ? 0.3 : 1 }} title="아래로">↓</button>
                        {c}
                        <button onClick={() => onRemoveCategory2(c)} style={chipClose}><X size={12} /></button>
                      </span>
                    ))}
                    {(project.categories2 ?? []).length === 0 && <span style={{ fontSize: 12, color: '#888' }}>추가된 카테고리 없음</span>}
                  </div>
                </div>

                <div style={{ marginTop: 16 }}>
                  <h3 style={settingsTitle}>법인카드</h3>
                  <form onSubmit={onAddCard} style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr auto', gap: 6, marginBottom: 8 }}>
                    <input value={cardBank} onChange={(e) => setCardBank(e.target.value)} placeholder="카드사 (예: 신한)" style={{ ...inlineInput }} />
                    <input value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} placeholder="카드번호 (예: ****0912)" style={{ ...inlineInput }} />
                    <button type="submit" style={{ ...btnPrimary, textAlign: 'center' }}>+ 등록</button>
                  </form>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {(project.paymentCards ?? []).map((c) => (
                      <span key={c.id} style={chip}>
                        {c.bank && c.number ? `${c.bank} · ${c.number}` : c.label}
                        <button onClick={() => onRemoveCard(c.id, c.label)} style={chipClose}><X size={12} /></button>
                      </span>
                    ))}
                    {(project.paymentCards ?? []).length === 0 && <span style={{ fontSize: 12, color: '#888' }}>등록된 카드 없음</span>}
                  </div>
                </div>
              </section>
            )}

            <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
              <TabBtn active={selectedTab === ALL_TAB} onClick={() => setSelectedTab(ALL_TAB)}>전체 ({records.length})</TabBtn>
              {(project.categories ?? []).map((c) => {
                const count = records.filter((r) => r.categoryId === c).length;
                return (
                  <TabBtn key={c} active={selectedTab === c} onClick={() => setSelectedTab(c)}>{c} ({count})</TabBtn>
                );
              })}
            </div>

            <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <button onClick={() => setShowFilter(!showFilter)} style={{ ...btnSmall, background: showFilter ? '#eef4ff' : '#fff', color: showFilter ? '#4a6bc4' : '#333' }}>
                🔍 필터 {activeFilterCount > 0 ? `(${activeFilterCount})` : ''}
              </button>
              {activeFilterCount > 0 && (
                <button onClick={resetFilters} style={{ ...btnSmall, color: '#c33', borderColor: '#f0c8c8' }}>초기화</button>
              )}
            </div>

            {showFilter && (
              <section style={{ ...settingsBox, marginBottom: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
                  <label style={{ display: 'grid', gap: 4 }}>
                    <span style={filterLabel}>구분</span>
                    <select value={filterType} onChange={(e) => setFilterType(e.target.value)} style={inlineInput}>
                      <option value="">전체</option>
                      {RECORD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </label>
                  <label style={{ display: 'grid', gap: 4 }}>
                    <span style={filterLabel}>카테고리2</span>
                    <select value={filterCategory2} onChange={(e) => setFilterCategory2(e.target.value)} style={inlineInput}>
                      <option value="">전체</option>
                      {(project.categories2 ?? []).map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </label>
                  <label style={{ display: 'grid', gap: 4 }}>
                    <span style={filterLabel}>결제수단</span>
                    <select value={filterPaymentType} onChange={(e) => setFilterPaymentType(e.target.value)} style={inlineInput}>
                      <option value="">전체</option>
                      {PAYMENT_TYPES.map((pt) => <option key={pt} value={pt}>{pt}</option>)}
                    </select>
                  </label>
                  <label style={{ display: 'grid', gap: 4 }}>
                    <span style={filterLabel}>결제자</span>
                    <select value={filterPayer} onChange={(e) => setFilterPayer(e.target.value)} style={inlineInput}>
                      <option value="">전체</option>
                      {project.memberIds.map((uid) => (
                        <option key={uid} value={uid}>{(project.memberNames ?? {})[uid] ?? uid}</option>
                      ))}
                    </select>
                  </label>
                  <label style={{ display: 'grid', gap: 4, gridColumn: '1 / -1' }}>
                    <span style={filterLabel}>금액</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <input type="number" value={filterAmountMin} onChange={(e) => setFilterAmountMin(e.target.value)} placeholder="최소" inputMode="numeric" style={{ ...inlineInput, flex: 1 }} />
                      <span style={{ color: '#888', fontSize: 12 }}>~</span>
                      <input type="number" value={filterAmountMax} onChange={(e) => setFilterAmountMax(e.target.value)} placeholder="최대" inputMode="numeric" style={{ ...inlineInput, flex: 1 }} />
                    </div>
                  </label>
                  <label style={{ display: 'grid', gap: 4, gridColumn: '1 / -1' }}>
                    <span style={filterLabel}>기간</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} style={{ ...inlineInput, flex: 1 }} />
                      <span style={{ color: '#888', fontSize: 12 }}>~</span>
                      <input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} style={{ ...inlineInput, flex: 1 }} />
                    </div>
                  </label>
                  <label style={{ display: 'grid', gap: 4, gridColumn: '1 / -1' }}>
                    <span style={filterLabel}>검색어 (구매처/내용/메모/이용자)</span>
                    <input value={filterQuery} onChange={(e) => setFilterQuery(e.target.value)} placeholder="예: 이마트" style={inlineInput} />
                  </label>
                </div>
              </section>
            )}

            <div style={{ ...summaryBox, flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'center' }}>
              <div>
                <div style={{ fontSize: 12, color: '#888', marginBottom: 2 }}>
                  {activeFilterCount > 0 || selectedTab !== ALL_TAB ? '필터 소계' : '전체 지출'}
                </div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{formatMoney(total)}원</div>
                {Object.entries(foreignTotals).map(([cur, amt]) => (
                  <div key={cur} style={{ fontSize: 14, fontWeight: 600, color: '#555', marginTop: 2 }}>
                    {cur} {amt.toLocaleString()}
                  </div>
                ))}
              </div>
              <Link href={`/projects/${project.id}/new-record`} style={{ ...btnPrimary, textAlign: 'center' }}>+ 내역 추가</Link>
            </div>

            <section>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                <h2 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>내역 ({visibleRecords.length})</h2>
                {visibleRecords.length > 0 && (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={onExportExcel} style={{ ...btnSmall, display: 'inline-flex', alignItems: 'center', gap: 4 }}><FileSpreadsheet size={14} />엑셀</button>
                    <button onClick={() => setPdfModalOpen(true)} style={{ ...btnSmall, display: 'inline-flex', alignItems: 'center', gap: 4 }}><FileText size={14} />PDF</button>
                    <button onClick={onExportZip} disabled={!!zipProgress} style={{ ...btnSmall, color: zipProgress ? '#999' : '#333', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      {zipProgress ? `Zip ${zipProgress.done}/${zipProgress.total}` : <><Archive size={14} />Zip</>}
                    </button>
                  </div>
                )}
              </div>

              {loadingRecords ? (
                <p style={{ color: '#888' }}>로딩 중...</p>
              ) : visibleRecords.length === 0 ? (
                <div style={emptyBox}>아직 내역이 없습니다. 영수증을 추가해보세요.</div>
              ) : isMobile ? (
                <div style={{ display: 'grid', gap: 10 }}>
                  {visibleRecords.map((r, i) => {
                    const isEditor = (project.editorIds ?? []).includes(user.uid);
                    const canEdit = r.createdBy === user.uid || isOwner || isEditor;
                    const cats = [r.categoryId, r.categoryId2].filter(Boolean).join(' · ');
                    return (
                      <div key={r.id} style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e9f2', padding: '14px 16px', boxShadow: '0 1px 4px rgba(100,120,200,0.06)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={tag}>{r.type}</span>
                            <span style={{ fontSize: 12, color: '#888' }}>{formatDate(r.date)}</span>
                          </div>
                          <span style={{ fontSize: 15, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                            {r.currency && r.currency !== 'KRW'
                              ? `${r.currency} ${r.amount.toLocaleString()}`
                              : `${formatMoney(r.amount)}원`}
                          </span>
                        </div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a2e', marginBottom: 2 }}>{r.content || '-'}</div>
                        <div style={{ fontSize: 13, color: '#555', marginBottom: 8 }}>{r.merchant}</div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 12, color: '#888' }}>{cats || '-'}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            {r.receiptUrl ? (
                              <a href={r.receiptUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: '#7b9fe8', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                                <ImageIcon size={13} />영수증 보기
                              </a>
                            ) : (
                              <span style={{ fontSize: 12, color: '#e06060', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                                <AlertCircle size={13} />미제출
                              </span>
                            )}
                          </div>
                        </div>
                        {canEdit && (
                          <div style={{ display: 'flex', gap: 6, marginTop: 10, justifyContent: 'flex-end', borderTop: '1px solid #f0f2f8', paddingTop: 8 }}>
                            <button type="button" onClick={() => router.push(`/projects/${project.id}/records/${r.id}/edit`)} style={{ ...miniBtn, cursor: 'pointer' }}>수정</button>
                            <button onClick={() => onDeleteRecord(r)} style={{ ...miniBtn, color: '#c33', borderColor: '#f0c8c8' }}>삭제</button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ background: '#fff', border: '1px solid #e5e9f2', borderRadius: 8, overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 1000 }}>
                    <thead>
                      <tr style={{ background: '#f5f7fb', color: '#555' }}>
                        <th style={thStyle}>#</th>
                        <th style={thStyle}>일자</th>
                        <th style={thStyle}>구분</th>
                        <th style={thStyle}>카테고리1</th>
                        <th style={thStyle}>카테고리2</th>
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
                        const isEditor = (project.editorIds ?? []).includes(user.uid);
                        const canEdit = r.createdBy === user.uid || isOwner || isEditor;
                        return (
                          <tr key={r.id} style={{ borderTop: '1px solid #eef1f7' }}>
                            <td style={{ ...tdStyle, color: '#888', textAlign: 'center' }}>{i + 1}</td>
                            <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>{formatDate(r.date)}</td>
                            <td style={tdStyle}><span style={tag}>{r.type}</span></td>
                            <td style={{ ...tdStyle, color: '#666' }}>{r.categoryId || '-'}</td>
                            <td style={{ ...tdStyle, color: '#666' }}>{r.categoryId2 || '-'}</td>
                            <td style={tdStyle}>{r.merchant}</td>
                            <td style={{ ...tdStyle, color: '#666', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.content}>{r.content || '-'}</td>
                            <td style={{ ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                              {r.currency && r.currency !== 'KRW'
                                ? <>{r.currency} {r.amount.toLocaleString()}</>
                                : <>{formatMoney(r.amount)}원</>}
                            </td>
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
                                  <button
                                    type="button"
                                    onClick={() => router.push(`/projects/${project.id}/records/${r.id}/edit`)}
                                    style={{ ...miniBtn, marginRight: 4, cursor: 'pointer' }}
                                  >
                                    수정
                                  </button>
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

      {pdfModalOpen && project && (
        <div style={modalOverlay} onClick={() => !pdfGenerating && setPdfModalOpen(false)}>
          <div style={modalBox} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0, marginBottom: 4 }}>PDF 다운로드</h3>
            <p style={{ fontSize: 12, color: '#888', margin: 0, marginBottom: 14 }}>포함할 항목을 선택하세요</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
              {PDF_COLUMN_DEFS.map(({ key, label, note }) => (
                <label key={key} style={colToggleRow}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{label}</div>
                    {note && <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{note}</div>}
                  </div>
                  <input
                    type="checkbox"
                    checked={!!pdfColumns[key]}
                    onChange={(e) => setPdfColumns((prev) => ({ ...prev, [key]: e.target.checked }))}
                  />
                </label>
              ))}
            </div>

            <label style={{ ...colToggleRow, background: '#eef4ff', borderColor: '#c5d5f4' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#4a6bc4' }}>영수증 이미지 포함</div>
                <div style={{ fontSize: 11, color: '#4a6bc4', marginTop: 2 }}>목록 뒤에 번호 순서로 영수증을 첨부합니다</div>
              </div>
              <input type="checkbox" checked={pdfIncludeReceipts} onChange={(e) => setPdfIncludeReceipts(e.target.checked)} />
            </label>

            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button onClick={onExportPdf} disabled={pdfGenerating} style={{ flex: 1, ...btnPrimary, cursor: pdfGenerating ? 'default' : 'pointer', opacity: pdfGenerating ? 0.6 : 1 }}>
                {pdfGenerating ? 'PDF 생성 중...' : 'PDF 생성'}
              </button>
              <button onClick={() => setPdfModalOpen(false)} disabled={pdfGenerating} style={btnSecondary}>
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const PDF_COLUMN_DEFS: { key: string; label: string; note?: string }[] = [
  { key: 'no', label: '순번' },
  { key: 'date', label: '일자' },
  { key: 'type', label: '구분' },
  { key: 'category1', label: '카테고리1' },
  { key: 'category2', label: '카테고리2' },
  { key: 'merchant', label: '구매처' },
  { key: 'content', label: '내용' },
  { key: 'amount', label: '금액' },
  { key: 'paymentType', label: '결제수단' },
  { key: 'payer', label: '결제자', note: '내부 확인용 - 클라이언트 제출 시 제외 권장' },
  { key: 'userNames', label: '이용자', note: '내부 확인용 - 클라이언트 제출 시 제외 권장' },
  { key: 'memo', label: '메모' },
];

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
const btnPrimary: React.CSSProperties = { padding: '10px 16px', background: 'linear-gradient(135deg, #a8c8f8 0%, #7b9fe8 50%, #8b7fd4 100%)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none', cursor: 'pointer', display: 'inline-block' };
const btnSecondary: React.CSSProperties = { padding: '8px 14px', background: '#fff', border: '1px solid #d0d6e2', borderRadius: 8, fontSize: 13, color: '#555', textDecoration: 'none' };
const btnSmall: React.CSSProperties = { padding: '6px 12px', fontSize: 12, background: '#fff', border: '1px solid #d0d6e2', borderRadius: 6, cursor: 'pointer', fontWeight: 600, color: '#333' };
const summaryBox: React.CSSProperties = { padding: 16, background: '#fff', borderRadius: 12, border: '1px solid #e5e9f2', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 };
const settingsBox: React.CSSProperties = { padding: 16, background: '#fff', borderRadius: 12, border: '1px solid #e5e9f2', marginBottom: 16 };
const settingsTitle: React.CSSProperties = { fontSize: 13, fontWeight: 700, margin: 0, marginBottom: 8, color: '#555' };
const inlineInput: React.CSSProperties = { padding: '8px 10px', fontSize: 13, border: '1px solid #d0d6e2', borderRadius: 6, outline: 'none' };
const chip: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', background: '#eef4ff', color: '#4a6bc4', borderRadius: 14, fontSize: 12, fontWeight: 600 };
const chipClose: React.CSSProperties = { background: 'transparent', border: 'none', color: '#4a6bc4', cursor: 'pointer', fontSize: 14, padding: 0, lineHeight: 1 };
const chipArrow: React.CSSProperties = { background: 'transparent', border: 'none', color: '#4a6bc4', cursor: 'pointer', fontSize: 11, padding: '0 2px', lineHeight: 1 };
const emptyBox: React.CSSProperties = { padding: 24, background: '#fff', border: '1px dashed #d0d6e2', borderRadius: 12, textAlign: 'center', color: '#888', fontSize: 13 };
const thStyle: React.CSSProperties = { padding: '10px 10px', fontSize: 11, fontWeight: 700, textAlign: 'left', whiteSpace: 'nowrap' };
const tdStyle: React.CSSProperties = { padding: '10px 10px', fontSize: 12, color: '#333' };
const tag: React.CSSProperties = { fontSize: 10, padding: '2px 6px', background: '#f0f2f8', color: '#555', borderRadius: 4 };
const linkBtn: React.CSSProperties = { fontSize: 11, background: 'none', border: 'none', color: '#7b9fe8', cursor: 'pointer', padding: 0, textDecoration: 'none' };
const miniBtn: React.CSSProperties = { padding: '4px 8px', fontSize: 11, background: '#fff', border: '1px solid #d0d6e2', borderRadius: 4, color: '#555', cursor: 'pointer', textDecoration: 'none', display: 'inline-block' };
const filterLabel: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: '#666' };
const modalOverlay: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 1000 };
const modalBox: React.CSSProperties = { background: '#fff', borderRadius: 12, padding: 20, maxWidth: 420, width: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 10px 40px rgba(0,0,0,0.2)' };
const colToggleRow: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '9px 12px', border: '1px solid #E0E0E0', borderRadius: 8, cursor: 'pointer', background: '#fff' };

function buildFilterSummary(f: { tab: string; type: string; category2: string; payer: string; paymentType: string; query: string }): string {
  const parts: string[] = [];
  if (f.tab) parts.push(`카테고리1: ${f.tab}`);
  if (f.type) parts.push(`구분: ${f.type}`);
  if (f.category2) parts.push(`카테고리2: ${f.category2}`);
  if (f.paymentType) parts.push(`결제수단: ${f.paymentType}`);
  if (f.payer) parts.push(`결제자: ${f.payer}`);
  if (f.query) parts.push(`검색어: ${f.query}`);
  return parts.join(' · ');
}
