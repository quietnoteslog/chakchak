'use client';

import { useEffect, useState } from 'react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function InstallPrompt({ open, onClose }: Props) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [done, setDone] = useState<'installed' | 'dismissed' | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const ua = navigator.userAgent;
    const iOS = /iP(ad|hone|od)/.test(ua) && !/Android/.test(ua);
    setIsIos(iOS);
    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    setIsStandalone(standalone);

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall as EventListener);
    window.addEventListener('appinstalled', () => setDone('installed'));
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall as EventListener);
    };
  }, []);

  if (!open) return null;
  if (isStandalone) return null;

  const onInstall = async () => {
    if (!deferred) return;
    try {
      await deferred.prompt();
      const { outcome } = await deferred.userChoice;
      setDone(outcome === 'accepted' ? 'installed' : 'dismissed');
    } catch (e) {
      console.warn('install prompt failed', e);
    } finally {
      setDeferred(null);
      onClose();
    }
  };

  const canAutoInstall = !!deferred && !isIos;

  return (
    <div style={overlay} onClick={onClose}>
      <div style={modal} onClick={(e) => e.stopPropagation()}>
        <div style={{ textAlign: 'center', marginBottom: 14 }}>
          <span style={{ fontSize: 40 }}>📱</span>
          <h3 style={{ fontSize: 18, fontWeight: 800, margin: '8px 0 4px', color: '#222' }}>
            착착을 바탕화면에 설치
          </h3>
          <p style={{ fontSize: 13, color: '#666', margin: 0 }}>
            앱처럼 빠르게 열 수 있어요
          </p>
        </div>

        {done === 'installed' && (
          <p style={{ textAlign: 'center', color: '#3a8e5f', fontWeight: 600, padding: '10px 0' }}>
            ✓ 설치가 완료되었습니다
          </p>
        )}

        {!done && canAutoInstall && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={onInstall} style={btnPrimary}>
              설치하기
            </button>
            <button type="button" onClick={onClose} style={btnSecondary}>
              나중에
            </button>
          </div>
        )}

        {!done && !canAutoInstall && isIos && (
          <div>
            <p style={{ fontSize: 13, color: '#444', margin: 0, marginBottom: 12, lineHeight: 1.5 }}>
              iPhone / iPad 에서는 Safari 하단의 <strong>공유 버튼</strong> ↑ 을 눌러 <strong>&quot;홈 화면에 추가&quot;</strong>를 선택해주세요.
            </p>
            <ol style={{ fontSize: 12, color: '#666', paddingLeft: 20, margin: 0, marginBottom: 14, lineHeight: 1.7 }}>
              <li>하단 중앙의 공유 아이콘 탭</li>
              <li>목록을 아래로 내려 &quot;홈 화면에 추가&quot; 선택</li>
              <li>오른쪽 상단 &quot;추가&quot; 탭</li>
            </ol>
            <button type="button" onClick={onClose} style={btnSecondary}>
              확인
            </button>
          </div>
        )}

        {!done && !canAutoInstall && !isIos && (
          <div>
            <p style={{ fontSize: 13, color: '#444', margin: 0, marginBottom: 12, lineHeight: 1.5 }}>
              브라우저에서 설치 옵션을 찾을 수 없습니다. 주소창의 설치 아이콘 또는 브라우저 메뉴의 <strong>&quot;앱으로 설치&quot;</strong>를 이용해주세요.
            </p>
            <button type="button" onClick={onClose} style={btnSecondary}>
              확인
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: 16, zIndex: 2000,
};
const modal: React.CSSProperties = {
  background: '#fff', borderRadius: 16, padding: 22, maxWidth: 380, width: '100%',
  boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
};
const btnPrimary: React.CSSProperties = {
  flex: 2, padding: '12px 0', background: '#7b9fe8', color: '#fff', border: 'none',
  borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer',
};
const btnSecondary: React.CSSProperties = {
  flex: 1, padding: '12px 0', background: '#fff', color: '#555',
  border: '1px solid #d0d6e2', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', width: '100%',
};
