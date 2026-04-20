import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { Project, ExpenseRecord } from './types';

function sanitize(s: string): string {
  return s.replace(/[\\/:*?"<>|\n\r\t]/g, '').trim().slice(0, 60);
}

function formatDateShort(d: Date): string {
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
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
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportRecordsToExcel(project: Project, records: ExpenseRecord[]) {
  const rows: Record<string, string | number>[] = records.map((r, i) => ({
    'No': i + 1,
    '일자': formatFullDate(r.date.toDate()),
    '가맹점': r.merchant,
    '결제수단': r.paymentMethod,
    '작성자': r.createdByName || '',
    '금액': r.amount,
    '메모': r.memo || '',
  }));
  const total = records.reduce((s, r) => s + (r.amount ?? 0), 0);
  rows.push({
    'No': '',
    '일자': '',
    '가맹점': '',
    '결제수단': '',
    '작성자': '합계',
    '금액': total,
    '메모': '',
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  // 열 너비
  ws['!cols'] = [
    { wch: 5 },   // No
    { wch: 12 },  // 일자
    { wch: 24 },  // 가맹점
    { wch: 10 },  // 결제수단
    { wch: 14 },  // 작성자
    { wch: 12 },  // 금액
    { wch: 30 },  // 메모
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '내역');

  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  const blob = new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const safeName = sanitize(project.name);
  const today = formatDateShort(new Date());
  triggerDownload(blob, `${safeName}_내역_${today}.xlsx`);
}

export async function exportReceiptsAsZip(
  project: Project,
  records: ExpenseRecord[],
  onProgress?: (done: number, total: number) => void
) {
  const zip = new JSZip();
  const safeProject = sanitize(project.name);

  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    try {
      const res = await fetch(r.receiptUrl);
      if (!res.ok) throw new Error(`fetch failed ${res.status}`);
      const blob = await res.blob();
      const ext = extFromBlob(blob, 'jpg');
      const no = String(i + 1).padStart(3, '0');
      const dateStr = formatDateShort(r.date.toDate());
      const merchant = sanitize(r.merchant) || 'unknown';
      const filename = `${safeProject}_${no}_${merchant}_${dateStr}.${ext}`;
      zip.file(filename, blob);
    } catch (e) {
      console.error('receipt fetch failed', r.id, e);
    }
    onProgress?.(i + 1, records.length);
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const today = formatDateShort(new Date());
  triggerDownload(zipBlob, `${safeProject}_영수증_${today}.zip`);
}

export async function downloadSingleReceipt(record: ExpenseRecord, projectName: string, index: number) {
  const res = await fetch(record.receiptUrl);
  if (!res.ok) throw new Error('fetch failed');
  const blob = await res.blob();
  const ext = extFromBlob(blob, 'jpg');
  const no = String(index + 1).padStart(3, '0');
  const dateStr = formatDateShort(record.date.toDate());
  const merchant = sanitize(record.merchant) || 'unknown';
  const safeProject = sanitize(projectName);
  const filename = `${safeProject}_${no}_${merchant}_${dateStr}.${ext}`;
  triggerDownload(blob, filename);
}

function formatFullDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
