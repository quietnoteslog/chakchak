'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { getInviteTokenByProject, acceptInviteByToken, getProject } from '@/lib/firestore';
import { InviteToken, Project } from '@/lib/types';
import InstallPrompt from '@/app/components/InstallPrompt';

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
  const [showInstall, setShowInstall] = useState(false);
  const [isWebView, setIsWebView] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    const webview = /KAKAOTALK|Instagram|NAVER|Line|FB_IAB|FBAN|FBAV|Twitter|Snapchat|Musical|TikTok|LinkedInApp|MicroMessenger|wv\b/.test(ua)
      || (/Android/.test(ua) && /; wv\)/.test(ua));
    setIsWebView(webview);
  }, []);

  const openInExternalBrowser = () => {
    const url = window.location.href;
    const ua = navigator.userAgent;
    if (/iPhone|iPad|iPod/i.test(ua)) {
      window.open(url, '_blank');
    } else {
      window.location.href = `intent://${url.replace(/^https?:\/\//, '')}#Intent;scheme=https;action=android.intent.action.VIEW;package=com.android.chrome;end`;
    }
  };

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
            setShowInstall(true);
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
      if (result === 'ok') {
        setStatus('done');
        setShowInstall(true);
        // 자동 리다이렉트는 제거 — 설치 프롬프트 닫힐 때 이동
      } else if (result === 'revoked') setStatus('revoked');
      else if (result === 'expired') setStatus('expired');
      else setStatus('invalid');
    } catch (e) {
      console.error('accept invite failed', e);
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      setStatus('inputName');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#a8c8f8 0%,#7b9fe8 50%,#b8d4f8 100%)' }}>
      <div style={{ width: 380, padding: 32, background: 'rgba(255,255,255,0.92)', borderRadius: 20, boxShadow: '0 8px 32px rgba(100,120,200,0.2)' }}>
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <span style={{ fontSize: 32 }}>✅</span>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: '6px 0 0 0', color: '#222' }}>착착 초대</h1>
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
            <p style={{ textAlign: 'center', fontSize: 13, color: '#555', marginBottom: 16 }}>
              프로젝트에 참여하려면 로그인이 필요합니다.
            </p>
            {isWebView && (
              <div style={{ background: 'rgba(255,200,100,0.15)', border: '1px solid rgba(200,160,0,0.3)', borderRadius: 10, padding: '10px 12px', marginBottom: 12, fontSize: 12, color: '#666', lineHeight: 1.5 }}>
                앱 내 브라우저에서는 Google 로그인이 차단됩니다.<br />Chrome 또는 Safari에서 열어주세요.
              </div>
            )}
            <button
              onClick={isWebView ? openInExternalBrowser : signInWithGoogle}
              style={{ width: '100%', padding: '12px 0', borderRadius: 10, border: '1px solid #d0d6e2', background: '#fff', color: '#444', fontSize: 14, fontWeight: 600, cursor: 'pointer', marginBottom: 10 }}
            >
              {isWebView ? 'Chrome / Safari에서 열기' : 'Google로 로그인'}
            </button>
            <a
              href={`/login?redirect=/invite/${projectId}/${token}`}
              style={{ display: 'block', width: '100%', padding: '12px 0', borderRadius: 10, background: '#7b9fe8', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', textAlign: 'center', textDecoration: 'none' }}
            >
              이메일로 로그인 / 가입
            </a>
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
              style={{ width: '100%', padding: '10px 12px', fontSize: 14, color: '#222', background: '#fff', border: '1px solid #d0d6e2', borderRadius: 8, outline: 'none', marginBottom: 12 }}
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

        {(status === 'done' || status === 'alreadyMember') && !showInstall && (
          <p style={{ textAlign: 'center', color: '#3a8e5f' }}>
            참여 완료! 프로젝트로 이동합니다...
          </p>
        )}

        {(status === 'done' || status === 'alreadyMember') && showInstall && (
          <p style={{ textAlign: 'center', color: '#3a8e5f', fontWeight: 600 }}>
            ✓ 참여 완료
          </p>
        )}
      </div>

      <InstallPrompt
        open={showInstall}
        onClose={() => {
          setShowInstall(false);
          router.replace(`/projects/${projectId}`);
        }}
      />
    </div>
  );
}
