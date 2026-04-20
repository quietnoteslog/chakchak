'use client';

import { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import { addRecord, updateRecord, RecordInput } from '@/lib/firestore';
import {
  Project,
  ExpenseRecord,
  RecordType,
  RECORD_TYPES,
  PaymentType,
  PAYMENT_TYPES,
  OcrResult,
} from '@/lib/types';

type Stage = 'form' | 'ocr' | 'saving';

interface Props {
  project: Project;
  currentUid: string;
  currentName: string;
  existing?: ExpenseRecord;
  onSaved: () => void;
  onCancel: () => void;
}

export default function RecordForm({ project, currentUid, currentName, existing, onSaved, onCancel }: Props) {
  const isEdit = !!existing;

  const [stage, setStage] = useState<Stage>('form');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [ocr, setOcr] = useState<OcrResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [type, setType] = useState<RecordType>(existing?.type ?? '영수증');
  const [categoryId, setCategoryId] = useState<string>(existing?.categoryId ?? ((project.categories ?? [])[0] ?? ''));
  const [date, setDate] = useState(
    existing ? existing.date.toDate().toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)
  );
  const [merchant, setMerchant] = useState(existing?.merchant ?? '');
  const [content, setContent] = useState(existing?.content ?? '');
  const [amount, setAmount] = useState(existing ? String(existing.amount) : '');
  const [paymentType, setPaymentType] = useState<PaymentType>(existing?.paymentType ?? '법인카드');
  const [paymentCardId, setPaymentCardId] = useState<string>(existing?.paymentCardId ?? ((project.paymentCards ?? [])[0]?.id ?? ''));
  const [payerId, setPayerId] = useState<string>(existing?.payerId ?? currentUid);
  const [userNames, setUserNames] = useState(existing?.userNames ?? '');
  const [memo, setMemo] = useState(existing?.memo ?? '');

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const onFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const isImage = f.type.startsWith('image/');
    const isPdf = f.type === 'application/pdf';
    if (!isImage && !isPdf) { setError('이미지 또는 PDF 파일만'); return; }
    if (f.size > 10 * 1024 * 1024) { setError('10MB 이하만'); return; }
    setError(null);
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
    await runOcr(f);
  };

  const runOcr = async (f: File) => {
    setStage('ocr');
    try {
      const isPdf = f.type === 'application/pdf';
      const form = new FormData();
      if (isPdf) form.append('image', f);
      else {
        const resized = await resizeImageForOcr(f, 1600);
        form.append('image', resized, 'ocr.jpg');
      }
      const res = await fetch('/api/ocr/receipt', { method: 'POST', body: form });
      if (!res.ok) throw new Error(await res.text());
      const result: OcrResult = await res.json();
      setOcr(result);
      if (result.amount != null) setAmount(String(result.amount));
      if (result.date) setDate(result.date);
      if (result.merchant) setMerchant(result.merchant);
      setStage('form');
    } catch (err) {
      console.error(err);
      setError('OCR 처리 실패 — 값은 직접 입력해주세요');
      setStage('form');
    }
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if ((project.categories ?? []).length === 0) { setError('카테고리를 먼저 추가하세요 (프로젝트 상세 상단)'); return; }
    if (!categoryId) { setError('카테고리를 선택하세요'); return; }
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) { setError('금액을 올바르게 입력해주세요'); return; }
    if (!merchant.trim()) { setError('구매처를 입력해주세요'); return; }
    if (paymentType === '법인카드' && !paymentCardId) {
      setError('법인카드를 선택하거나 먼저 등록해주세요');
      return;
    }
    if (!payerId) { setError('결제자를 선택해주세요'); return; }

    setError(null);
    setStage('saving');

    const payerName = (project.memberNames ?? {})[payerId] ?? '';
    const card = (project.paymentCards ?? []).find((c) => c.id === paymentCardId);
    const paymentCardLabel = paymentType === '법인카드' ? (card?.label ?? '') : '';

    try {
      let receiptUrl = existing?.receiptUrl ?? '';
      let receiptPath = existing?.receiptPath ?? '';

      if (file) {
        // 새 영수증 업로드
        if (existing?.receiptPath) {
          try { await deleteObject(storageRef(storage, existing.receiptPath)); } catch {}
        }
        const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
        const rand = Math.random().toString(36).slice(2, 10);
        const filename = `${Date.now()}_${rand}.${ext}`;
        receiptPath = `receipts/${project.id}/${filename}`;
        const ref = storageRef(storage, receiptPath);
        const snapshot = await uploadBytes(ref, file, { contentType: file.type });
        receiptUrl = await getDownloadURL(snapshot.ref);
      }

      const input: RecordInput = {
        date: new Date(date),
        type,
        categoryId,
        merchant: merchant.trim(),
        content: content.trim(),
        amount: amt,
        paymentType,
        paymentCardId: paymentType === '법인카드' ? paymentCardId : '',
        paymentCardLabel,
        payerId,
        payerName,
        userNames: userNames.trim(),
        memo: memo.trim(),
        receiptUrl,
        receiptPath,
        createdByName: currentName,
      };

      if (isEdit && existing) {
        await updateRecord(project.id, existing.id, input);
      } else {
        await addRecord(project.id, currentUid, input);
      }
      onSaved();
    } catch (err) {
      console.error(err);
      setError('저장 실패 — 다시 시도해주세요');
      setStage('form');
    }
  };

  return (
    <form onSubmit={onSubmit} style={{ display: 'grid', gap: 16 }}>
      {/* 영수증 업로드 섹션 */}
      {!file && !existing?.receiptUrl && (
        <label style={dropStyle}>
          <span style={{ fontSize: 32, marginBottom: 4 }}>📷</span>
          <strong style={{ fontSize: 14, marginBottom: 2 }}>영수증 촬영 또는 선택 (선택)</strong>
          <span style={{ fontSize: 11, color: '#888' }}>이미지/PDF, 최대 10MB · OCR 자동 입력</span>
          <input type="file" accept="image/*,application/pdf" capture="environment" onChange={onFileChange} style={{ display: 'none' }} />
        </label>
      )}

      {(file || existing?.receiptUrl) && (
        <div>
          {file && file.type === 'application/pdf' ? (
            <div style={{ padding: 24, background: '#fff', border: '1px solid #e5e9f2', borderRadius: 8, textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 4 }}>📄</div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{file.name}</div>
            </div>
          ) : file ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt="preview" style={{ width: '100%', maxHeight: 240, objectFit: 'contain', borderRadius: 8, background: '#fff', border: '1px solid #e5e9f2' }} />
          ) : existing?.receiptUrl ? (
            <a href={existing.receiptUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'block', padding: 16, background: '#fff', border: '1px solid #e5e9f2', borderRadius: 8, textAlign: 'center', fontSize: 13, color: '#7b9fe8', textDecoration: 'none' }}>
              기존 영수증 보기 →
            </a>
          ) : null}
          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            <label style={{ padding: '6px 12px', fontSize: 12, background: '#fff', border: '1px solid #d0d6e2', borderRadius: 6, cursor: 'pointer', color: '#555' }}>
              {existing?.receiptUrl && !file ? '영수증 교체' : '다시 선택'}
              <input type="file" accept="image/*,application/pdf" capture="environment" onChange={onFileChange} style={{ display: 'none' }} />
            </label>
          </div>
        </div>
      )}

      {stage === 'ocr' && <p style={{ color: '#7b9fe8', textAlign: 'center', margin: 0 }}>영수증 읽는 중...</p>}

      {ocr && !isEdit && (
        <div style={{ padding: 10, background: '#eef4ff', borderRadius: 8, fontSize: 12, color: '#4a6bc4' }}>
          AI 자동 입력 (신뢰도 {Math.round((ocr.confidence ?? 0) * 100)}%). 값을 확인·수정해주세요.
        </div>
      )}

      <div style={row2}>
        <Field label="구분 *">
          <select value={type} onChange={(e) => setType(e.target.value as RecordType)} style={inputStyle}>
            {RECORD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="카테고리 *">
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} style={inputStyle}>
            {(project.categories ?? []).length === 0 ? (
              <option value="">(카테고리 없음)</option>
            ) : (
              <>
                <option value="">선택</option>
                {(project.categories ?? []).map((c) => <option key={c} value={c}>{c}</option>)}
              </>
            )}
          </select>
        </Field>
      </div>

      <Field label="일자 *">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inputStyle} />
      </Field>

      <div style={row2}>
        <Field label="구매처 *">
          <input value={merchant} onChange={(e) => setMerchant(e.target.value)} style={inputStyle} placeholder="예) 이마트 강남점" />
        </Field>
        <Field label="내용">
          <input value={content} onChange={(e) => setContent(e.target.value)} style={inputStyle} placeholder="예) 식대, 교통비..." />
        </Field>
      </div>

      <Field label="금액 (원) *">
        <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} style={inputStyle} placeholder="0" inputMode="numeric" />
      </Field>

      <div>
        <div style={labelStyle}>결제수단 *</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {PAYMENT_TYPES.map((pt) => (
            <button
              key={pt}
              type="button"
              onClick={() => setPaymentType(pt)}
              style={{
                padding: '8px 14px',
                fontSize: 13,
                border: `1px solid ${paymentType === pt ? '#7b9fe8' : '#d0d6e2'}`,
                background: paymentType === pt ? '#eef4ff' : '#fff',
                color: paymentType === pt ? '#4a6bc4' : '#555',
                borderRadius: 8,
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              {pt}
            </button>
          ))}
        </div>
        {paymentType === '법인카드' && (
          <div style={{ marginTop: 8 }}>
            {(project.paymentCards ?? []).length === 0 ? (
              <p style={{ fontSize: 12, color: '#c33', margin: 0 }}>등록된 법인카드가 없습니다. 프로젝트 상세에서 먼저 등록하세요.</p>
            ) : (
              <select value={paymentCardId} onChange={(e) => setPaymentCardId(e.target.value)} style={inputStyle}>
                <option value="">선택</option>
                {(project.paymentCards ?? []).map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            )}
          </div>
        )}
      </div>

      <div style={row2}>
        <Field label="결제자 *">
          <select value={payerId} onChange={(e) => setPayerId(e.target.value)} style={inputStyle}>
            {project.memberIds.map((uid) => (
              <option key={uid} value={uid}>{(project.memberNames ?? {})[uid] ?? uid}</option>
            ))}
          </select>
        </Field>
        <Field label="이용자 (선택)">
          <input value={userNames} onChange={(e) => setUserNames(e.target.value)} style={inputStyle} placeholder="예) 신유림 외 4명" />
        </Field>
      </div>

      <Field label="메모 (선택)">
        <textarea value={memo} onChange={(e) => setMemo(e.target.value)} style={{ ...inputStyle, minHeight: 60, fontFamily: 'inherit' }} />
      </Field>

      {error && <p style={{ color: '#c33', fontSize: 13, margin: 0 }}>{error}</p>}

      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" onClick={onCancel} style={{ flex: 1, padding: '12px 0', background: '#fff', color: '#555', border: '1px solid #d0d6e2', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
          취소
        </button>
        <button type="submit" disabled={stage === 'saving'} style={{ flex: 2, padding: '12px 0', background: stage === 'saving' ? '#b5c4e8' : '#7b9fe8', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: stage === 'saving' ? 'default' : 'pointer' }}>
          {stage === 'saving' ? '저장 중...' : isEdit ? '수정 저장' : '내역 저장'}
        </button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'grid', gap: 6 }}>
      <span style={labelStyle}>{label}</span>
      {children}
    </label>
  );
}

async function resizeImageForOcr(file: File, maxDim: number): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('image load failed'));
      img.src = url;
    });
    const ratio = Math.min(maxDim / img.width, maxDim / img.height, 1);
    const w = Math.max(1, Math.round(img.width * ratio));
    const h = Math.max(1, Math.round(img.height * ratio));
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas ctx null');
    ctx.drawImage(img, 0, 0, w, h);
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob null'))), 'image/jpeg', 0.85);
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

const inputStyle: React.CSSProperties = {
  padding: '10px 12px',
  fontSize: 14,
  border: '1px solid #d0d6e2',
  borderRadius: 8,
  background: '#fff',
  outline: 'none',
};

const labelStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: '#555',
  marginBottom: 6,
  display: 'block',
};

const row2: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 12,
};

const dropStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 24,
  background: '#fff',
  border: '2px dashed #c5cfe4',
  borderRadius: 12,
  cursor: 'pointer',
  color: '#7b9fe8',
  textAlign: 'center',
};
