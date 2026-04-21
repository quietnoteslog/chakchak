'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { createProject } from '@/lib/firestore';

export default function NewProjectPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  if (loading || !user) return null;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !startDate) {
      setError('프로젝트명과 시작일은 필수입니다');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const id = await createProject(
        user.uid,
        user.email ?? '',
        user.displayName ?? user.email?.split('@')[0] ?? '',
        {
          name: name.trim(),
          startDate: new Date(startDate),
          endDate: endDate ? new Date(endDate) : null,
        }
      );
      router.replace(`/projects/${id}`);
    } catch (err) {
      console.error(err);
      setError('생성 실패. 다시 시도해주세요.');
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: '#f5f7fb' }}>
      <header style={{ padding: '16px 20px', background: '#fff', borderBottom: '1px solid #e5e9f2' }}>
        <button
          onClick={() => router.back()}
          style={{ background: 'none', border: 'none', fontSize: 14, color: '#555', cursor: 'pointer' }}
        >
          <ArrowLeft size={16} style={{ marginRight: 4, verticalAlign: 'middle' }} />뒤로
        </button>
      </header>

      <main style={{ maxWidth: 520, margin: '0 auto', padding: '24px 16px' }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>새 프로젝트</h1>

        <form onSubmit={onSubmit} style={{ display: 'grid', gap: 16 }}>
          <Field label="프로젝트명 *">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예) 2026 상반기 워크샵"
              style={inputStyle}
            />
          </Field>

          <Field label="시작일 *">
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={inputStyle} />
          </Field>

          <Field label="종료일 (선택)">
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={inputStyle} />
          </Field>

          {error && <p style={{ color: '#c33', fontSize: 13, margin: 0 }}>{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            style={{
              padding: '12px 0',
              background: submitting ? '#b5c4e8' : '#7b9fe8',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: submitting ? 'default' : 'pointer',
            }}
          >
            {submitting ? '생성 중...' : '프로젝트 생성'}
          </button>
        </form>
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

const inputStyle: React.CSSProperties = {
  padding: '10px 12px',
  fontSize: 14,
  border: '1px solid #d0d6e2',
  borderRadius: 8,
  background: '#fff',
  outline: 'none',
};
