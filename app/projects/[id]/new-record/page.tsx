'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';
import { getProject } from '@/lib/firestore';
import { Project } from '@/lib/types';
import RecordForm from '../components/RecordForm';

export default function NewRecordPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const projectId = params.id;
  const [project, setProject] = useState<Project | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  if (loading || !user) return null;
  if (error) return <p style={{ padding: 24, color: '#c33' }}>{error}</p>;
  if (!project) return null;

  const currentName = project.memberNames?.[user.uid] ?? user.displayName ?? '';

  return (
    <div className="min-h-screen" style={{ background: '#f5f7fb' }}>
      <header style={{ padding: '16px 20px', background: '#fff', borderBottom: '1px solid #e5e9f2' }}>
        <Link href={`/projects/${projectId}`} style={{ fontSize: 14, color: '#555', textDecoration: 'none' }}>
          ← 프로젝트
        </Link>
      </header>
      <main style={{ maxWidth: 560, margin: '0 auto', padding: '24px 16px', overflowX: 'hidden' }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, marginTop: 0, marginBottom: 20 }}>내역 추가</h1>
        <RecordForm
          project={project}
          currentUid={user.uid}
          currentName={currentName}
          onSaved={() => router.replace(`/projects/${projectId}`)}
          onCancel={() => router.back()}
        />
      </main>
    </div>
  );
}
