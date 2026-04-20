'use client';

import { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '@/lib/AuthContext';
import { storage } from '@/lib/firebase';
import { getProject, addRecord } from '@/lib/firestore';
import { Project, PAYMENT_METHODS, PaymentMethod, OcrResult } from '@/lib/types';

type Stage = 'pick' | 'ocr' | 'form' | 'saving' | 'done';

export default function NewRecordPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const projectId = params.id;

  const [project, setProject] = useState<Project | null>(null);
  const [stage, setStage] = useState<Stage>('pick');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [ocr, setOcr] = useState<OcrResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // form fields
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [merchant, setMerchant] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('법인카드');
  const [memo, setMemo] = useState('');

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  useEffect(() => {
    if (!user || !projectId) return;
    getProject(projectId).then((p) => {
      if (!p) setError('프로젝트를 찾을 수 없습니다');
      else if (!p.memberIds.includes(user.uid)) setError('접근 권한이 없습니다');
      else setProject(p);
    });
  }, [user, projectId]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  if (loading || !user) return null;

  const onFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const isImage = f.type.startsWith('image/');
    const isPdf = f.type === 'application/pdf';
    if (!isImage && !isPdf) {
      setError('이미지 또는 PDF 파일만 업로드할 수 있습니다');
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setError('10MB 이하 파일만 업로드할 수 있습니다');
      return;
    }
    setError(null);
    setFile(f);
    const url = URL.createObjectURL(f);
    setPreviewUrl(url);
    await runOcr(f);
  };

  const runOcr = async (f: File) => {
    setStage('ocr');
    try {
      const base64 = await fileToBase64(f);
      const res = await fetch('/api/ocr/receipt', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, mimeType: f.type }),
      });
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
    if (!file || !project || !user) return;
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setError('금액을 올바르게 입력해주세요');
      return;
    }
    if (!merchant.trim()) {
      setError('가맹점명을 입력해주세요');
      return;
    }
    setError(null);
    setStage('saving');
    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const rand = Math.random().toString(36).slice(2, 10);
      const filename = `${Date.now()}_${rand}.${ext}`;
      const path = `receipts/${project.id}/${filename}`;
      const ref = storageRef(storage, path);
      const snapshot = await uploadBytes(ref, file, { contentType: file.type });
      const url = await getDownloadURL(snapshot.ref);

      await addRecord(project.id, user.uid, {
        amount: amt,
        date: new Date(date),
        merchant: merchant.trim(),
        paymentMethod,
        memo: memo.trim(),
        receiptUrl: url,
        receiptPath: path,
        createdByName: user.displayName ?? user.email ?? '',
      });
      router.replace(`/projects/${project.id}`);
    } catch (err) {
      console.error(err);
      setError('저장 실패 — 다시 시도해주세요');
      setStage('form');
    }
  };

  return (
    <div className="min-h-screen" style={{ background: '#f5f7fb' }}>
      <header style={{ padding: '16px 20px', background: '#fff', borderBottom: '1px solid #e5e9f2' }}>
        <Link href={`/projects/${projectId}`} style={{ fontSize: 14, color: '#555', textDecoration: 'none' }}>
          ← 프로젝트
        </Link>
      </header>

      <main style={{ maxWidth: 520, margin: '0 auto', padding: '24px 16px' }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, marginTop: 0, marginBottom: 16 }}>영수증 추가</h1>

        {!file && (
          <label
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 40,
              background: '#fff',
              border: '2px dashed #c5cfe4',
              borderRadius: 12,
              cursor: 'pointer',
              color: '#7b9fe8',
              textAlign: 'center',
            }}
          >
            <span style={{ fontSize: 36, marginBottom: 8 }}>📷</span>
            <strong style={{ fontSize: 16, marginBottom: 4, color: '#333' }}>영수증 촬영 또는 선택</strong>
            <span style={{ fontSize: 12, color: '#888' }}>JPG, PNG, PDF 파일 (최대 10MB)</span>
            <input
              type="file"
              accept="image/*,application/pdf"
              capture="environment"
              onChange={onFileChange}
              style={{ display: 'none' }}
            />
          </label>
        )}

        {file && previewUrl && (
          <div style={{ marginBottom: 16 }}>
            {file.type === 'application/pdf' ? (
              <div style={{ padding: 40, background: '#fff', border: '1px solid #e5e9f2', borderRadius: 8, textAlign: 'center' }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>📄</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{file.name}</div>
                <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>{(file.size / 1024).toFixed(0)} KB</div>
              </div>
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={previewUrl}
                alt="영수증 미리보기"
                style={{ width: '100%', maxHeight: 300, objectFit: 'contain', borderRadius: 8, background: '#fff', border: '1px solid #e5e9f2' }}
              />
            )}
            {stage !== 'saving' && (
              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  setPreviewUrl('');
                  setOcr(null);
                  setStage('pick');
                }}
                style={{ marginTop: 8, padding: '6px 12px', fontSize: 12, background: '#fff', border: '1px solid #d0d6e2', borderRadius: 6, color: '#555', cursor: 'pointer' }}
              >
                다시 선택
              </button>
            )}
          </div>
        )}

        {stage === 'ocr' && (
          <p style={{ color: '#7b9fe8', textAlign: 'center', marginTop: 16 }}>영수증 읽는 중…</p>
        )}

        {(stage === 'form' || stage === 'saving') && (
          <form onSubmit={onSubmit} style={{ display: 'grid', gap: 16, marginTop: 16 }}>
            {ocr && (
              <div style={{ padding: 10, background: '#eef4ff', borderRadius: 8, fontSize: 12, color: '#4a6bc4' }}>
                AI 자동 입력 (신뢰도 {Math.round((ocr.confidence ?? 0) * 100)}%). 값을 확인·수정해주세요.
              </div>
            )}

            <Field label="가맹점 *">
              <input value={merchant} onChange={(e) => setMerchant(e.target.value)} style={inputStyle} placeholder="예) 이마트 강남점" />
            </Field>
            <Field label="금액 (원) *">
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} style={inputStyle} placeholder="0" inputMode="numeric" />
            </Field>
            <Field label="일자 *">
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inputStyle} />
            </Field>
            <Field label="결제수단 *">
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)} style={inputStyle}>
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </Field>
            <Field label="메모 (선택)">
              <textarea value={memo} onChange={(e) => setMemo(e.target.value)} style={{ ...inputStyle, minHeight: 60, fontFamily: 'inherit' }} />
            </Field>

            {error && <p style={{ color: '#c33', fontSize: 13, margin: 0 }}>{error}</p>}

            <button
              type="submit"
              disabled={stage === 'saving'}
              style={{
                padding: '12px 0',
                background: stage === 'saving' ? '#b5c4e8' : '#7b9fe8',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                cursor: stage === 'saving' ? 'default' : 'pointer',
              }}
            >
              {stage === 'saving' ? '저장 중...' : '내역 저장'}
            </button>
          </form>
        )}

        {error && stage === 'pick' && <p style={{ color: '#c33', fontSize: 13, marginTop: 12 }}>{error}</p>}
      </main>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'grid', gap: 6 }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: '#555' }}>{label}</span>
      {children}
    </label>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1] ?? '';
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const inputStyle: React.CSSProperties = {
  padding: '10px 12px',
  fontSize: 14,
  border: '1px solid #d0d6e2',
  borderRadius: 8,
  background: '#fff',
  outline: 'none',
};
