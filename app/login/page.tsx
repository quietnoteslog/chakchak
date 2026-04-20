'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';

export default function LoginPage() {
  const { user, loading, signInWithGoogle } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.replace('/dashboard');
  }, [user, loading, router]);

  if (loading) return null;

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{
        background: 'linear-gradient(135deg, #a8c8f8 0%, #7b9fe8 30%, #8b7fd4 60%, #b8d4f8 100%)',
      }}
    >
      {/* Floating blobs */}
      <div
        style={{
          position: 'absolute', width: 300, height: 300,
          borderRadius: '50%', top: '10%', left: '15%',
          background: 'rgba(180, 200, 255, 0.4)',
          filter: 'blur(60px)', pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute', width: 250, height: 250,
          borderRadius: '50%', bottom: '15%', right: '10%',
          background: 'rgba(150, 130, 220, 0.4)',
          filter: 'blur(60px)', pointerEvents: 'none',
        }}
      />

      {/* Glass card */}
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.15)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          borderRadius: 24,
          padding: '56px 48px',
          width: 360,
          boxShadow: '0 8px 32px rgba(100, 120, 200, 0.2)',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 36 }}>✅</span>
        </div>

        {/* Title */}
        <h1
          style={{
            color: '#fff',
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: '0.12em',
            textAlign: 'center',
            marginBottom: 8,
            textShadow: '0 1px 4px rgba(80,80,160,0.3)',
          }}
        >
          착착
        </h1>
        <p
          style={{
            color: 'rgba(255,255,255,0.75)',
            fontSize: 13,
            textAlign: 'center',
            marginBottom: 40,
            letterSpacing: '0.02em',
          }}
        >
          행사 경비 정산을 착착
        </p>

        {/* Google 로그인 버튼 */}
        <button
          onClick={signInWithGoogle}
          style={{
            width: '100%',
            padding: '14px 0',
            borderRadius: 50,
            border: 'none',
            background: '#fff',
            color: '#444',
            fontSize: 14,
            fontWeight: 600,
            letterSpacing: '0.04em',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
            transition: 'transform 0.15s, box-shadow 0.15s',
          }}
          onMouseOver={e => {
            (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
            (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 20px rgba(0,0,0,0.18)';
          }}
          onMouseOut={e => {
            (e.currentTarget as HTMLButtonElement).style.transform = '';
            (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 2px 12px rgba(0,0,0,0.12)';
          }}
        >
          <GoogleIcon />
          Google로 로그인
        </button>

        <p
          style={{
            color: 'rgba(255,255,255,0.55)',
            fontSize: 11,
            textAlign: 'center',
            marginTop: 24,
          }}
        >
          초대받은 프로젝트에만 접근할 수 있어요
        </p>
      </div>
    </div>
  );
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
