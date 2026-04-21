'use client';

import { useEffect, useState, FormEvent, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';

type Mode = 'select' | 'signin' | 'signup';

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageInner() {
  const { user, loading, signInWithGoogle, signInWithEmail, signUpWithEmail, sendResetEmail } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/dashboard';
  const [mode, setMode] = useState<Mode>('select');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [isWebView, setIsWebView] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    const webview = /KAKAOTALK|Instagram|NAVER|Line|FB_IAB|FBAN|FBAV|Twitter|Snapchat|Musical|TikTok|LinkedInApp|MicroMessenger|wv\b/.test(ua)
      || (/Android/.test(ua) && /; wv\)/.test(ua));
    setIsWebView(webview);
  }, []);

  useEffect(() => {
    if (!loading && user) {
      // redirect는 내부 경로만 허용 (open redirect 방지)
      const safe = redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : '/dashboard';
      router.replace(safe);
    }
  }, [user, loading, router, redirect]);

  if (loading) return null;

  const openInExternalBrowser = () => {
    const url = window.location.href;
    const ua = navigator.userAgent;
    if (/iPhone|iPad|iPod/i.test(ua)) {
      window.open(url, '_blank');
    } else {
      window.location.href = `intent://${url.replace(/^https?:\/\//, '')}#Intent;scheme=https;action=android.intent.action.VIEW;package=com.android.chrome;end`;
    }
  };

  const onGoogle = async () => {
    setError(null);
    setBusy(true);
    try { await signInWithGoogle(); }
    catch (e) { setError(mapAuthError(e)); }
    finally { setBusy(false); }
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) { setError('이메일과 비밀번호를 입력해주세요'); return; }
    if (mode === 'signup' && !displayName.trim()) { setError('표시 이름을 입력해주세요'); return; }
    if (mode === 'signup' && password.length < 6) { setError('비밀번호는 6자 이상이어야 합니다'); return; }
    setBusy(true);
    try {
      if (mode === 'signin') await signInWithEmail(email.trim(), password);
      else await signUpWithEmail(email.trim(), password, displayName.trim());
    } catch (e) {
      setError(mapAuthError(e));
    } finally {
      setBusy(false);
    }
  };

  const onReset = async () => {
    setError(null);
    if (!email.trim()) { setError('이메일을 먼저 입력해주세요'); return; }
    try {
      await sendResetEmail(email.trim());
      alert('비밀번호 재설정 메일을 보냈습니다. 메일함을 확인해주세요.');
    } catch (e) {
      setError(mapAuthError(e));
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: 'linear-gradient(135deg, #a8c8f8 0%, #7b9fe8 30%, #8b7fd4 60%, #b8d4f8 100%)', padding: 16 }}
    >
      <div style={{ position: 'absolute', width: 300, height: 300, borderRadius: '50%', top: '10%', left: '15%', background: 'rgba(180, 200, 255, 0.4)', filter: 'blur(60px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', width: 250, height: 250, borderRadius: '50%', bottom: '15%', right: '10%', background: 'rgba(150, 130, 220, 0.4)', filter: 'blur(60px)', pointerEvents: 'none' }} />

      <div
        style={{
          background: 'rgba(255, 255, 255, 0.15)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.3)', borderRadius: 24, padding: '44px 36px',
          width: 380, boxShadow: '0 8px 32px rgba(100, 120, 200, 0.2)', position: 'relative', zIndex: 1,
        }}
      >
        {isWebView && (
          <div style={{ background: 'rgba(255,200,100,0.25)', border: '1px solid rgba(255,200,100,0.5)', borderRadius: 12, padding: '12px 14px', marginBottom: 20, color: '#fff', fontSize: 13, lineHeight: 1.5 }}>
            <strong>앱 내 브라우저에서는 Google 로그인이 차단됩니다.</strong><br />
            Chrome 또는 Safari에서 열어주세요.<br />
            <button
              type="button"
              onClick={openInExternalBrowser}
              style={{ marginTop: 8, padding: '6px 12px', fontSize: 12, background: 'rgba(255,255,255,0.25)', border: '1px solid rgba(255,255,255,0.4)', borderRadius: 6, color: '#fff', cursor: 'pointer' }}
            >
              Chrome / Safari에서 열기
            </button>
          </div>
        )}
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 36 }}>✅</span>
        </div>
        <h1 style={{ color: '#fff', fontSize: 28, fontWeight: 700, letterSpacing: '0.12em', textAlign: 'center', marginBottom: 6, textShadow: '0 1px 4px rgba(80,80,160,0.3)' }}>
          착착
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, textAlign: 'center', marginBottom: 32, letterSpacing: '0.02em' }}>
          행사 경비 정산을 착착
        </p>

        {mode === 'select' && (
          <>
            <button onClick={isWebView ? openInExternalBrowser : onGoogle} disabled={busy} style={googleBtn}>
              <GoogleIcon />
              {isWebView ? 'Chrome / Safari에서 열기' : 'Google로 로그인'}
            </button>
            <div style={divider}>
              <span style={dividerLine} />
              <span style={dividerLabel}>또는</span>
              <span style={dividerLine} />
            </div>
            <button onClick={() => { setMode('signin'); setError(null); }} style={emailBtn}>
              이메일로 로그인
            </button>
            <p style={smallHint}>계정이 없으신가요? <button type="button" onClick={() => { setMode('signup'); setError(null); }} style={linkBtn}>회원가입</button></p>
          </>
        )}

        {(mode === 'signin' || mode === 'signup') && (
          <form onSubmit={onSubmit} style={{ display: 'grid', gap: 10 }}>
            {mode === 'signup' && (
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="표시 이름 (예: 신유림)"
                style={inputStyle}
                disabled={busy}
              />
            )}
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="이메일"
              style={inputStyle}
              disabled={busy}
              autoComplete="email"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'signup' ? '비밀번호 (6자 이상)' : '비밀번호'}
              style={inputStyle}
              disabled={busy}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            />
            <button type="submit" disabled={busy} style={submitBtn(busy)}>
              {busy ? '처리 중...' : mode === 'signin' ? '로그인' : '가입하기'}
            </button>
            {mode === 'signin' && (
              <button type="button" onClick={onReset} disabled={busy} style={{ ...linkBtn, fontSize: 12, textAlign: 'right' }}>
                비밀번호를 잊으셨나요?
              </button>
            )}
            <div style={{ textAlign: 'center', marginTop: 4 }}>
              {mode === 'signin' ? (
                <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>
                  계정이 없으신가요?{' '}
                  <button type="button" onClick={() => { setMode('signup'); setError(null); }} style={linkBtn}>회원가입</button>
                </span>
              ) : (
                <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>
                  이미 계정이 있으신가요?{' '}
                  <button type="button" onClick={() => { setMode('signin'); setError(null); }} style={linkBtn}>로그인</button>
                </span>
              )}
            </div>
            <button type="button" onClick={() => { setMode('select'); setError(null); }} disabled={busy} style={{ ...linkBtn, fontSize: 11, marginTop: 4 }}>
              ← 다른 방법
            </button>
          </form>
        )}

        {error && (
          <p style={{ color: '#ffc8c8', fontSize: 12, textAlign: 'center', marginTop: 12, padding: '6px 10px', background: 'rgba(200,60,60,0.25)', borderRadius: 8 }}>
            {error}
          </p>
        )}

        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11, textAlign: 'center', marginTop: 20 }}>
          초대받은 프로젝트에만 접근할 수 있어요
        </p>
      </div>
    </div>
  );
}

function mapAuthError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (msg.includes('email-already-in-use')) return '이미 가입된 이메일입니다';
  if (msg.includes('invalid-email')) return '이메일 형식이 올바르지 않습니다';
  if (msg.includes('weak-password')) return '비밀번호가 너무 약합니다 (6자 이상)';
  if (msg.includes('user-not-found') || msg.includes('wrong-password') || msg.includes('invalid-credential')) return '이메일 또는 비밀번호가 올바르지 않습니다';
  if (msg.includes('too-many-requests')) return '요청이 너무 많습니다. 잠시 후 다시 시도해주세요';
  if (msg.includes('popup-closed-by-user')) return '로그인이 취소되었습니다';
  if (msg.includes('network')) return '네트워크 오류가 발생했습니다';
  return msg;
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
      <path fill="#FBBC05" d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"/>
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z"/>
    </svg>
  );
}

const googleBtn: React.CSSProperties = {
  width: '100%', padding: '14px 0', borderRadius: 50, border: 'none', background: '#fff', color: '#444',
  fontSize: 14, fontWeight: 600, letterSpacing: '0.04em', cursor: 'pointer', display: 'flex',
  alignItems: 'center', justifyContent: 'center', gap: 10, boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
};
const emailBtn: React.CSSProperties = {
  width: '100%', padding: '13px 0', borderRadius: 50, border: '1px solid rgba(255,255,255,0.5)',
  background: 'transparent', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
};
const submitBtn = (busy: boolean): React.CSSProperties => ({
  width: '100%', padding: '13px 0', borderRadius: 10, border: 'none',
  background: busy ? 'rgba(255,255,255,0.4)' : '#fff', color: '#4a6bc4',
  fontSize: 14, fontWeight: 700, cursor: busy ? 'default' : 'pointer', marginTop: 4,
});
const inputStyle: React.CSSProperties = {
  padding: '12px 14px', fontSize: 14, border: '1px solid rgba(255,255,255,0.4)',
  borderRadius: 10, background: 'rgba(255,255,255,0.9)', color: '#222', outline: 'none',
};
const divider: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, margin: '16px 0' };
const dividerLine: React.CSSProperties = { flex: 1, height: 1, background: 'rgba(255,255,255,0.35)' };
const dividerLabel: React.CSSProperties = { color: 'rgba(255,255,255,0.7)', fontSize: 11 };
const smallHint: React.CSSProperties = { color: 'rgba(255,255,255,0.7)', fontSize: 12, textAlign: 'center', marginTop: 14, margin: 0 };
const linkBtn: React.CSSProperties = {
  background: 'transparent', border: 'none', color: '#fff', fontWeight: 700, cursor: 'pointer',
  textDecoration: 'underline', padding: 0, fontSize: 12,
};
