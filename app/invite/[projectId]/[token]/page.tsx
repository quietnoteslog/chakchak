'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { getInviteTokenByProject, acceptInviteByToken, getProject } from '@/lib/firestore';
import { InviteToken, Project } from '@/lib/types';

type Status = 'checking' | 'needLogin' | 'invalid' | 'expired' | 'revoked' | 'inputName' | 'joining' | 'done' | 'alreadyMember';

export default function InviteAcceptPage() {
  const params = useParams<{ projectId: string; token: string }>();
  const projectId = params.projectId;
  const token = params.token;
  const router = useRouter();
  const { user, loading, signInWithGoogle } = useAuth();

  const [status, setStatus] = useState<Status>('checking');
  const [project, setProject] = useState<Project | null>(null);
  const [tokenData, setTokenData] = useState<InviteToken | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return; // 인증 상태 확정까지 대기
    if (!projectId || !token) return;

    // 미로그인: 토큰 조회 시도하지 않고 로그인 유도
    if (!user) {
      setStatus('needLogin');
      return;
    }

    (async () => {
      try {
        const t = await getInviteTokenByProject(projectId, token);
        if (!t) {
          console.warn('invite token not found', { projectId, token });
          setError(`토큰을 찾을 수 없습니다 (projectId=${projectId.slice(0, 6)}..., token=${token.slice(0, 6)}...)`);
          setStatus('invalid');
          return;
        }
        setTokenData(t);
        if (t.revoked) {
          setStatus('revoked');
          return;
        }
        if (t.expiresAt.toDate().getTime() < Date.now()) {
          setStatus('expired');
          return;
        }
        const p = await getProject(projectId).catch(() => null);
        if (p) {
          setProject(p);
          if (p.memberIds.includes(user.uid)) {
            setStatus('alreadyMember');
            setTimeout(() => router.replace(`/projects/${projectId}`), 800);
            return;
          }
        }
        setDisplayName(user.displayName ?? user.email?.split('@')[0] ?? '');
        setStatus('inputName');
      } catch (e) {
        console.error('invite check failed', e);
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
        setStatus('invalid');
      }
    })();
  }, [projectId, token, user, loading, router]);

  const onAccept = async () => {
    if (!user || !projectId || !token) return;
    const name = displayName.trim();
    if (!name) {
      setError('이름을 입력해주세요');
      return;
    }
    setError(null);
    setStatus('joining');
    try {
      const result = await acceptInviteByToken(projectId, token, user.uid, name);
      if (result === 'ok' || result === 'already-member') {
        setStatus('done');
        setTimeout(() => router.replace(`/projects/${projectId}`), 1200);
      } else if (result === 'revoked') setStatus('revoked');
      else if (result === 'expired') setStatus('expired');
      else setStatus('invalid');
    } catch (e) {
      console.error(e);
      setError('참여 실패. 잠시 후 다시 시도해주세요');
      setStatus('inputName');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#a8c8f8 0%,#7b9fe8 50%,#b8d4f8 100%)' }}>
      <div style={{ width: 380, padding: 32, background: 'rgba(255,255,255,0.92)', borderRadius: 20, boxShadow: '0 8px 32px rgba(100,120,200,0.2)' }}>
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <span style={{ fontSize: 32 }}>✅</span>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: '6px 0 0 0' }}>착착 초대</h1>
        </div>

        {status === 'checking' && <p style={{ textAlign: 'center', color: '#888' }}>초대 확인 중...</p>}

        {status === 'invalid' && (
          <>
            <p style={{ color: '#c33', textAlign: 'center' }}>
              유효하지 않은 초대 링크입니다.
            </p>
            {error && (
              <p style={{ color: '#888', fontSize: 11, textAlign: 'center', marginTop: 8, wordBreak: 'break-all' }}>
                {error}
              </p>
            )}
          </>
        )}

        {status === 'revoked' && (
          <p style={{ color: '#c33', textAlign: 'center' }}>
            취소된 초대입니다. Owner에게 새 링크를 요청하세요.
          </p>
        )}

        {status === 'expired' && (
          <p style={{ color: '#c33', textAlign: 'center' }}>
            만료된 초대 링크입니다. Owner에게 새 링크를 요청하세요.
          </p>
        )}

        {status === 'needLogin' && (
          <>
            <p style={{ textAlign: 'center', fontSize: 13, color: '#555', marginBottom: 20 }}>
              프로젝트에 참여하려면 Google 로그인이 필요합니다.
            </p>
            <button
              onClick={signInWithGoogle}
              style={{ width: '100%', padding: '12px 0', borderRadius: 10, border: 'none', background: '#fff', color: '#444', fontSize: 14, fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}
            >
              Google로 로그인
            </button>
          </>
        )}

        {status === 'inputName' && (
          <>
            <p style={{ fontSize: 13, color: '#555', marginBottom: 4 }}>
              {project ? `"${project.name}"` : '프로젝트'}에 참여합니다.
            </p>
            <p style={{ fontSize: 12, color: '#888', marginBottom: 16 }}>
              이 프로젝트 내에서 표시될 이름을 입력하세요. 나중에 수정할 수 있습니다.
            </p>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="예: 김유림"
              style={{ width: '100%', padding: '10px 12px', fontSize: 14, border: '1px solid #d0d6e2', borderRadius: 8, outline: 'none', marginBottom: 12 }}
            />
            {error && <p style={{ color: '#c33', fontSize: 12, margin: 0, marginBottom: 8 }}>{error}</p>}
            <button
              onClick={onAccept}
              style={{ width: '100%', padding: '12px 0', background: '#7b9fe8', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
            >
              참여하기
            </button>
          </>
        )}

        {status === 'joining' && <p style={{ textAlign: 'center', color: '#7b9fe8' }}>참여 중...</p>}

        {(status === 'done' || status === 'alreadyMember') && (
          <p style={{ textAlign: 'center', color: '#3a8e5f' }}>
            참여 완료! 프로젝트로 이동합니다...
          </p>
        )}
      </div>
    </div>
  );
}
