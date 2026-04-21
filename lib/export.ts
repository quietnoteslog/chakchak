import ExcelJS from 'exceljs';
import JSZip from 'jszip';
import { ref as storageRef, getBlob } from 'firebase/storage';
import { storage } from './firebase';
import { Project, ExpenseRecord } from './types';

function sanitize(s: string): string {
  return s.replace(/[\\/:*?"<>|\n\r\t]/g, '').trim().slice(0, 60);
}

function formatDateShort(d: Date): string {
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
}

function formatFullDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function extFromBlob(blob: Blob, fallback: string): string {
  const t = blob.type.toLowerCase();
  if (t.includes('jpeg') || t.includes('jpg')) return 'jpg';
  if (t.includes('png')) return 'png';
  if (t.includes('heic')) return 'heic';
  if (t.includes('webp')) return 'webp';
  if (t.includes('pdf')) return 'pdf';
  if (t.includes('gif')) return 'gif';
  return fallback;
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (isIOS) {
    // iOS: Quick Look 미리보기로 열어 공유 메뉴에서 앱 선택 가능하게
    const w = window.open(url, '_blank');
    if (!w) {
      // 팝업 차단 시 anchor fallback
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } else {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

// Firebase SDK getBlob 사용 -- fetch CORS 이슈 회피
async function fetchReceiptBlob(receiptPath: string, fallbackUrl: string): Promise<Blob> {
  try {
    return await getBlob(storageRef(storage, receiptPath));
  } catch (e) {
    // 경로 없으면 URL로 fallback 시도
    console.warn('getBlob failed, fallback to fetch', e);
    const res = await fetch(fallbackUrl);
    if (!res.ok) throw new Error(`fetch ${res.status}`);
    return await res.blob();
  }
}

export async function exportRecordsToExcel(project: Project, records: ExpenseRecord[]) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('내역', { views: [{ state: 'frozen', ySplit: 1 }] });

  ws.columns = [
    { header: 'No', key: 'no', width: 5 },
    { header: '일자', key: 'date', width: 12 },
    { header: '구분', key: 'type', width: 10 },
    { header: '카테고리1', key: 'categoryId', width: 14 },
    { header: '카테고리2', key: 'categoryId2', width: 14 },
    { header: '구매처', key: 'merchant', width: 20 },
    { header: '내용', key: 'content', width: 20 },
    { header: '금액', key: 'amount', width: 14 },
    { header: '결제수단', key: 'paymentType', width: 10 },
    { header: '카드', key: 'paymentCardLabel', width: 20 },
    { header: '결제자', key: 'payerName', width: 12 },
    { header: '이용자', key: 'userNames', width: 18 },
    { header: '메모', key: 'memo', width: 24 },
  ];

  records.forEach((r, i) => {
    ws.addRow({
      no: i + 1,
      date: formatFullDate(r.date.toDate()),
      type: r.type || '',
      categoryId: r.categoryId || '',
      categoryId2: r.categoryId2 || '',
      merchant: r.merchant,
      content: r.content || '',
      amount: r.amount,
      paymentType: r.paymentType || '',
      paymentCardLabel: r.paymentCardLabel || '',
      payerName: r.payerName || r.createdByName || '',
      userNames: r.userNames || '',
      memo: r.memo || '',
    });
  });

  const total = records.reduce((s, r) => s + (r.amount ?? 0), 0);
  const totalRow = ws.addRow({
    no: '',
    date: '',
    type: '',
    categoryId: '',
    categoryId2: '',
    merchant: '',
    content: '',
    amount: total,
    paymentType: '',
    paymentCardLabel: '',
    payerName: '합계',
    userNames: '',
    memo: '',
  });

  // 헤더 스타일
  const headerRow = ws.getRow(1);
  headerRow.height = 24;
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF7B9FE8' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFC8D4EF' } },
      left: { style: 'thin', color: { argb: 'FFC8D4EF' } },
      bottom: { style: 'thin', color: { argb: 'FFC8D4EF' } },
      right: { style: 'thin', color: { argb: 'FFC8D4EF' } },
    };
  });

  // 데이터 행 스타일 (zebra)
  for (let i = 2; i < 2 + records.length; i++) {
    const row = ws.getRow(i);
    if (i % 2 === 0) {
      row.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF7F9FD' } };
      });
    }
    row.getCell('amount').numFmt = '#,##0';
    row.alignment = { vertical: 'middle' };
  }

  // 합계 행 스타일
  totalRow.eachCell((cell) => {
    cell.font = { bold: true, size: 12 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8EFFF' } };
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF7B9FE8' } },
    };
  });
  totalRow.getCell('amount').numFmt = '#,##0';
  totalRow.getCell('amount').alignment = { horizontal: 'right' };

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const safeName = sanitize(project.name);
  triggerDownload(blob, `${safeName}_내역_${formatDateShort(new Date())}.xlsx`);
}

export async function exportReceiptsAsZip(
  project: Project,
  records: ExpenseRecord[],
  onProgress?: (done: number, total: number) => void
) {
  const zip = new JSZip();
  const safeProject = sanitize(project.name);
  let added = 0;

  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    if (!r.receiptPath && !r.receiptUrl) {
      onProgress?.(i + 1, records.length);
      continue;
    }
    try {
      const blob = await fetchReceiptBlob(r.receiptPath, r.receiptUrl);
      const ext = extFromBlob(blob, 'jpg');
      const no = String(i + 1).padStart(3, '0');
      const dateStr = formatDateShort(r.date.toDate());
      const label = sanitize(r.content || r.merchant) || 'unknown';
      const filename = `${safeProject}_${no}_${label}_${dateStr}.${ext}`;
      zip.file(filename, blob);
      added++;
    } catch (e) {
      console.error('receipt fetch failed', r.id, e);
    }
    onProgress?.(i + 1, records.length);
  }

  if (added === 0) {
    throw new Error('다운로드할 영수증이 없습니다');
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  triggerDownload(zipBlob, `${safeProject}_영수증_${formatDateShort(new Date())}.zip`);
}

interface PdfOptions {
  filterSummary?: string;
  columns?: Record<string, boolean>;
  includeReceipts?: boolean;
}

const DEFAULT_PDF_COLS: Record<string, boolean> = {
  no: true, date: true, type: true, category1: true, category2: true,
  merchant: true, content: true, amount: true,
  paymentType: true, payer: false, userNames: false, memo: false,
};

const COL_DEFS: { key: string; label: string; width: string; align?: string }[] = [
  { key: 'no', label: 'No', width: '3%', align: 'center' },
  { key: 'date', label: '일자', width: '7%' },
  { key: 'type', label: '구분', width: '6%' },
  { key: 'category1', label: '카테고리1', width: '8%' },
  { key: 'category2', label: '카테고리2', width: '8%' },
  { key: 'merchant', label: '구매처', width: '13%' },
  { key: 'content', label: '내용', width: '11%' },
  { key: 'amount', label: '금액', width: '9%', align: 'right' },
  { key: 'paymentType', label: '결제수단', width: '10%' },
  { key: 'payer', label: '결제자', width: '8%' },
  { key: 'userNames', label: '이용자', width: '9%' },
  { key: 'memo', label: '메모', width: '13%' },
];

function cellValue(r: ExpenseRecord, key: string, index: number): string {
  switch (key) {
    case 'no': return String(index + 1);
    case 'date': return formatFullDate(r.date.toDate());
    case 'type': return escapeHtml(r.type || '');
    case 'category1': return escapeHtml(r.categoryId || '-');
    case 'category2': return escapeHtml(r.categoryId2 || '-');
    case 'merchant': return `<span style="font-weight:600">${escapeHtml(r.merchant)}</span>`;
    case 'content': return escapeHtml(r.content || '-');
    case 'amount': return (r.amount ?? 0).toLocaleString('ko-KR');
    case 'paymentType': return `${escapeHtml(r.paymentType || '')}${r.paymentCardLabel ? `<br><span style="font-size:9px;color:#888">${escapeHtml(r.paymentCardLabel)}</span>` : ''}`;
    case 'payer': return escapeHtml(r.payerName || r.createdByName || '-');
    case 'userNames': return escapeHtml(r.userNames || '-');
    case 'memo': return escapeHtml(r.memo || '-');
    default: return '';
  }
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('read failed'));
    reader.readAsDataURL(blob);
  });
}

function renderRecordCard(r: ExpenseRecord, index: number, imgDataUrl: string | null, columns: Record<string, boolean>, activeCols: typeof COL_DEFS): string {
  const no = String(index + 1).padStart(3, '0');
  const HEADER_KEYS = new Set(['no', 'merchant', 'amount']);
  const detailCols = activeCols.filter((c) => !HEADER_KEYS.has(c.key));
  const showNo = columns.no !== false;
  const showMerchant = columns.merchant !== false;
  const showAmount = columns.amount !== false;
  const detailHtml = detailCols.map((c) => {
    const v = cellValue(r, c.key, index);
    return `<div class="rp-detail"><span class="k">${c.label}</span><span class="v">${v}</span></div>`;
  }).join('');
  const isPdfReceipt = imgDataUrl?.startsWith('__pdf__:');
  const pdfUrl = isPdfReceipt ? imgDataUrl!.slice('__pdf__:'.length) : '';
  const imageHtml = isPdfReceipt
    ? `<div class="rp-pdf-placeholder"><div style="font-size:28px;margin-bottom:6px">📄</div><div style="font-size:11px;font-weight:700;color:#4a6bc4;margin-bottom:4px">PDF 영수증</div><a href="${escapeHtml(pdfUrl)}" style="font-size:10px;color:#7b9fe8;word-break:break-all">${escapeHtml(pdfUrl.slice(0, 60))}...</a></div>`
    : imgDataUrl
      ? `<img src="${imgDataUrl}" alt="receipt ${no}" />`
      : `<div class="rp-no-image">영수증 없음</div>`;
  return `
    <article class="rp-card">
      <div class="rp-top">
        <div class="rp-topmain">
          ${showNo ? `<div class="rp-no">#${no}</div>` : ''}
          ${showMerchant ? `<div class="rp-merchant">${escapeHtml(r.merchant)}</div>` : '<div class="rp-merchant"></div>'}
          ${showAmount ? `<div class="rp-amount">${(r.amount ?? 0).toLocaleString('ko-KR')}원</div>` : ''}
        </div>
        ${detailCols.length > 0 ? `<div class="rp-details">${detailHtml}</div>` : ''}
      </div>
      <div class="rp-image-wrap">${imageHtml}</div>
    </article>`;
}

export async function exportRecordsToPdf(
  project: Project,
  records: ExpenseRecord[],
  options: PdfOptions = {}
) {
  // window.open은 반드시 async 작업 전에 호출 (모바일 팝업 차단 방지)
  const w = window.open('', '_blank');
  if (!w) throw new Error('팝업 차단을 해제하고 다시 시도해주세요');

  const { filterSummary = '', columns = DEFAULT_PDF_COLS, includeReceipts = true } = options;
  const total = records.reduce((s, r) => s + (r.amount ?? 0), 0);
  const projectName = escapeHtml(project.name);
  const periodStart = formatFullDate(project.startDate.toDate());
  const periodEnd = project.endDate ? formatFullDate(project.endDate.toDate()) : '';
  const generatedAt = formatFullDate(new Date());

  const activeCols = COL_DEFS.filter((c) => columns[c.key]);

  const coverHtml = `
  <h1>${projectName}</h1>
  <div class="meta">프로젝트 기간: ${periodStart}${periodEnd ? ' ~ ' + periodEnd : ''} / 발행일: ${generatedAt}</div>
  ${filterSummary ? `<div class="filter">필터: ${escapeHtml(filterSummary)}</div>` : ''}
  <div class="summary">
    <div>총 ${records.length}건</div>
    <div class="total">합계 ${total.toLocaleString('ko-KR')}원</div>
  </div>`;

  const pageSize = 'A4 portrait';

  // 요약 테이블 (커버 페이지에 항상 포함)
  let summaryTable = '';
  if (activeCols.length > 0) {
    const amountColIndex = activeCols.findIndex((c) => c.key === 'amount');
    const headRow = `<tr>${activeCols.map((c) => `<th style="width:${c.width}${c.align === 'right' ? ';text-align:right' : c.align === 'center' ? ';text-align:center' : ''}">${c.label}</th>`).join('')}</tr>`;
    const bodyRows = records.map((r, i) => {
      const tds = activeCols.map((c) => {
        const align = c.align === 'right' ? 'text-align:right;font-variant-numeric:tabular-nums' : c.align === 'center' ? 'text-align:center;color:#888' : '';
        return `<td style="${align}">${cellValue(r, c.key, i)}</td>`;
      }).join('');
      return `<tr>${tds}</tr>`;
    }).join('');
    let footRow = '';
    if (amountColIndex >= 0) {
      const before = amountColIndex;
      const after = activeCols.length - amountColIndex - 1;
      const labelCell = before > 0 ? `<td colspan="${before}" style="text-align:right">합계</td>` : '';
      const amountCell = `<td style="text-align:right;font-variant-numeric:tabular-nums">${total.toLocaleString('ko-KR')}</td>`;
      const afterCell = after > 0 ? `<td colspan="${after}"></td>` : '';
      footRow = `<tr>${labelCell}${amountCell}${afterCell}</tr>`;
    }
    summaryTable = `<table>
      <thead>${headRow}</thead>
      <tbody>${bodyRows}</tbody>
      ${footRow ? `<tfoot>${footRow}</tfoot>` : ''}
    </table>`;
  }

  // 영수증 페이지 (포함 시)
  let receiptPagesHtml = '';
  if (includeReceipts) {
    const fetchOne = async (r: ExpenseRecord, i: number): Promise<string | null> => {
      if (!r.receiptPath && !r.receiptUrl) return null;
      try {
        const blob = await fetchReceiptBlob(r.receiptPath, r.receiptUrl);
        if (blob.type === 'application/pdf') return `__pdf__:${r.receiptUrl}`;
        return await blobToDataUrl(blob);
      } catch (e) {
        console.warn('receipt fetch failed', r.id, e);
        return null;
      }
    };
    const imageArr = await Promise.all(records.map((r, i) => fetchOne(r, i)));
    const imageMap: Record<number, string | null> = Object.fromEntries(imageArr.map((v, i) => [i, v]));

    const pages: string[] = [];
    for (let i = 0; i < records.length; i += 2) {
      const first = renderRecordCard(records[i], i, imageMap[i], columns, activeCols);
      const second = records[i + 1]
        ? renderRecordCard(records[i + 1], i + 1, imageMap[i + 1], columns, activeCols)
        : '<article class="rp-card rp-empty"></article>';
      pages.push(`<div class="rp-page">${first}${second}</div>`);
    }
    receiptPagesHtml = pages.join('');
  }

  const bodyHtml = summaryTable + receiptPagesHtml;

  const html = `<!DOCTYPE html>
<html lang="ko"><head><meta charset="utf-8">
<title>${projectName} 경비 내역 ${generatedAt}</title>
<style>
  @page { size: ${pageSize}; margin: 8mm; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; color: #222; margin: 0; padding: 14px; font-size: 10px; }
  h1 { font-size: 16px; margin: 0 0 4px; }
  .meta { color: #666; font-size: 10px; margin-bottom: 4px; }
  .filter { font-size: 10px; color: #4a6bc4; margin-bottom: 10px; padding: 6px 8px; background: #eef4ff; border-radius: 4px; }
  .summary { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 10px; padding-bottom: 6px; border-bottom: 1px solid #ddd; }
  .summary .total { font-size: 14px; font-weight: 700; }
  .cover-footer { font-size: 9px; color: #888; text-align: right; margin-bottom: 6px; }
  table { width: 100%; border-collapse: collapse; font-size: 9.5px; }
  th { background: #7B9FE8; color: #fff; padding: 6px 5px; font-weight: 700; text-align: left; border: 1px solid #C8D4EF; }
  td { padding: 5px 5px; border: 1px solid #eef1f7; vertical-align: top; }
  tr:nth-child(even) td { background: #F7F9FD; }
  tfoot td { font-weight: 700; background: #E8EFFF; border-top: 2px solid #7B9FE8; padding: 6px 5px; }

  /* 레코드 페이지 (2열) — iOS print는 overflow:hidden 무시하므로 img에 mm 절대값 직접 지정 */
  .rp-page { page-break-before: always; break-before: page; display: grid; grid-template-columns: 1fr 1fr; gap: 6mm; padding: 2mm 0; }
  .rp-card { display: flex; flex-direction: column; page-break-inside: avoid; break-inside: avoid; }
  .rp-empty { visibility: hidden; }
  .rp-top { padding: 6px 8px; border: 2px solid #7B9FE8; border-radius: 6px; background: #F7F9FD; margin-bottom: 2px; flex-shrink: 0; }
  .rp-topmain { display: flex; align-items: center; gap: 8px; }
  .rp-no { font-size: 16px; font-weight: 800; color: #7B9FE8; line-height: 1; white-space: nowrap; }
  .rp-merchant { font-size: 12px; font-weight: 700; color: #222; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .rp-amount { font-size: 13px; font-weight: 800; color: #222; white-space: nowrap; }
  .rp-details { display: grid; grid-template-columns: 1fr 1fr; gap: 2px 10px; margin-top: 4px; padding-top: 4px; border-top: 1px solid #D0D6E2; font-size: 9.5px; }
  .rp-detail { display: flex; gap: 5px; align-items: baseline; overflow: hidden; }
  .rp-detail .k { color: #888; font-weight: 700; min-width: 40px; flex-shrink: 0; }
  .rp-detail .v { color: #222; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .rp-image-wrap { display: flex; align-items: flex-start; justify-content: center; }
  .rp-image-wrap img { max-width: 88mm; max-height: 205mm; width: auto; height: auto; display: block; border: 1px solid #E5E9F2; }
  .rp-no-image { padding: 12px; border: 2px dashed #D0D6E2; border-radius: 6px; color: #888; font-size: 12px; }
  .rp-pdf-placeholder { padding: 16px 12px; border: 2px dashed #b5c4e8; border-radius: 6px; background: #eef4ff; text-align: center; }

  @media print { body { padding: 0; } .rp-page { page-break-before: always; break-before: page; } .rp-card { page-break-inside: avoid; break-inside: avoid; } .rp-image-wrap img { max-width: 88mm; max-height: 205mm; } }
</style></head><body>
  ${coverHtml}
  <div class="cover-footer">착착 - ${projectName}</div>
  ${bodyHtml}
  <script>
    window.addEventListener('load', () => { setTimeout(() => window.print(), 500); });
  </script>
</body></html>`;

  w.document.open();
  w.document.write(html);
  w.document.close();
}

function escapeHtml(s: string): string {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}

export async function downloadSingleReceipt(record: ExpenseRecord, projectName: string, index: number) {
  const blob = await fetchReceiptBlob(record.receiptPath, record.receiptUrl);
  const ext = extFromBlob(blob, 'jpg');
  const no = String(index + 1).padStart(3, '0');
  const dateStr = formatDateShort(record.date.toDate());
  const label = sanitize(record.content || record.merchant) || 'unknown';
  const safeProject = sanitize(projectName);
  triggerDownload(blob, `${safeProject}_${no}_${label}_${dateStr}.${ext}`);
}
