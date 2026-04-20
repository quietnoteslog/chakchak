'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';
import { getProject, deleteProject } from '@/lib/firestore';
import { Project } from '@/lib/types';

export default function ProjectDetailPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const projectId = params.id;
  const [project, setProject] = useState<Project | null>(null);
  const [loadingProject, setLoadingProject] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  useEffect(() => {
    if (!user || !projectId) return;
    setLoadingProject(true);
    getProject(projectId)
      .then((p) => {
        if (!p) setError('프로젝트를 찾을 수 없습니다');
        else if (!p.memberIds.includes(user.uid)) setError('접근 권한이 없습니다');
        else setProject(p);
      })
      .catch(() => setError('불러오기 실패'))
      .finally(() => setLoadingProject(false));
  }, [user, projectId]);

  if (loading || !user) return null;

  const isOwner = project?.ownerId === user.uid;

  const onDelete = async () => {
    if (!project || !isOwner) return;
    if (!confirm(`"${project.name}" 프로젝트를 삭제합니다. 계속할까요?`)) return;
    try {
      await deleteProject(project.id);
      router.replace('/dashboard');
    } catch {
      alert('삭제 실패');
    }
  };

  return (
    <div className="min-h-screen" style={{ background: '#f5f7fb' }}>
      <header style={{ padding: '16px 20px', background: '#fff', borderBottom: '1px solid #e5e9f2', display: 'flex', justifyContent: 'space-between' }}>
        <Link href="/dashboard" style={{ background: 'none', border: 'none', fontSize: 14, color: '#555', textDecoration: 'none' }}>
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

            <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
              <Link
                href={`/projects/${project.id}/members`}
                style={{ padding: '8px 14px', background: '#fff', border: '1px solid #d0d6e2', borderRadius: 8, fontSize: 13, color: '#555', textDecoration: 'none' }}
              >
                멤버 관리 ({project.memberIds.length})
              </Link>
              {isOwner && (
                <button
                  onClick={onDelete}
                  style={{ padding: '8px 14px', background: '#fff', border: '1px solid #f0c8c8', borderRadius: 8, fontSize: 13, color: '#c33', cursor: 'pointer' }}
                >
                  프로젝트 삭제
                </button>
              )}
            </div>

            <section style={{ padding: 24, background: '#fff', borderRadius: 12, border: '1px solid #e5e9f2', textAlign: 'center', color: '#888' }}>
              <p style={{ margin: 0, marginBottom: 8, fontSize: 14 }}>경비 내역 기능은 다음 업데이트에서 추가됩니다</p>
              <p style={{ margin: 0, fontSize: 12 }}>영수증 촬영 → AI 자동 입력 → 엑셀/Zip 다운로드</p>
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
