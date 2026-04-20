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
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
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
      const merchant = sanitize(r.merchant) || 'unknown';
      const filename = `${safeProject}_${no}_${merchant}_${dateStr}.${ext}`;
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

export async function downloadSingleReceipt(record: ExpenseRecord, projectName: string, index: number) {
  const blob = await fetchReceiptBlob(record.receiptPath, record.receiptUrl);
  const ext = extFromBlob(blob, 'jpg');
  const no = String(index + 1).padStart(3, '0');
  const dateStr = formatDateShort(record.date.toDate());
  const merchant = sanitize(record.merchant) || 'unknown';
  const safeProject = sanitize(projectName);
  triggerDownload(blob, `${safeProject}_${no}_${merchant}_${dateStr}.${ext}`);
}
