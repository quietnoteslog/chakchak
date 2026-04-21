const LoginScreen = ({ onSignIn }) => {
  const [mode, setMode] = React.useState('select');
  const gradient = 'linear-gradient(135deg, #a8c8f8 0%, #7b9fe8 30%, #8b7fd4 60%, #b8d4f8 100%)';
  return (
    <div style={{ height: '100%', background: gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', width: 220, height: 220, borderRadius: '50%', top: '8%', left: '10%', background: 'rgba(180, 200, 255, 0.45)', filter: 'blur(50px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', width: 200, height: 200, borderRadius: '50%', bottom: '10%', right: '8%', background: 'rgba(150, 130, 220, 0.45)', filter: 'blur(50px)', pointerEvents: 'none' }} />

      <div style={{
        background: 'rgba(255, 255, 255, 0.15)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.3)', borderRadius: 24, padding: '36px 28px',
        width: '100%', maxWidth: 320, boxShadow: '0 8px 32px rgba(100,120,200,0.2)', position: 'relative', zIndex: 1,
      }}>
        <div style={{ textAlign: 'center', marginBottom: 6, color: '#fff' }}>
          <Icon name="check-circle-2" size={34} stroke={2.2} />
        </div>
        <h1 style={{ color: '#fff', fontSize: 26, fontWeight: 700, letterSpacing: '0.12em', textAlign: 'center', margin: 0, marginBottom: 4, textShadow: '0 1px 4px rgba(80,80,160,0.3)' }}>착착</h1>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, textAlign: 'center', marginTop: 0, marginBottom: 24, letterSpacing: '0.02em' }}>행사 경비 정산을 착착</p>

        {mode === 'select' && <>
          <ChakButton variant="pill" onClick={onSignIn}><GoogleIcon />Google로 로그인</ChakButton>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '14px 0' }}>
            <span style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.35)' }} />
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>또는</span>
            <span style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.35)' }} />
          </div>
          <ChakButton variant="pillOutline" onClick={() => setMode('signin')}>이메일로 로그인</ChakButton>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, textAlign: 'center', marginTop: 14, marginBottom: 0 }}>
            계정이 없으신가요? <button onClick={() => setMode('signup')} style={{ background: 'transparent', border: 'none', color: '#fff', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline', padding: 0, fontSize: 12 }}>회원가입</button>
          </p>
        </>}

        {(mode === 'signin' || mode === 'signup') && <form onSubmit={(e) => { e.preventDefault(); onSignIn(); }} style={{ display: 'grid', gap: 10 }}>
          {mode === 'signup' && <input placeholder="표시 이름 (예: 신유림)" style={loginInput} />}
          <input type="email" placeholder="이메일" style={loginInput} defaultValue="yurim@example.com" />
          <input type="password" placeholder={mode === 'signup' ? '비밀번호 (6자 이상)' : '비밀번호'} style={loginInput} defaultValue="password" />
          <button type="submit" style={{ width: '100%', padding: '13px 0', borderRadius: 10, border: 'none', background: '#fff', color: '#4a6bc4', fontSize: 14, fontWeight: 700, cursor: 'pointer', marginTop: 4 }}>
            {mode === 'signin' ? '로그인' : '가입하기'}
          </button>
          <button type="button" onClick={() => setMode('select')} style={{ background: 'transparent', border: 'none', color: '#fff', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline', padding: 0, fontSize: 11, marginTop: 4, display: 'inline-flex', alignItems: 'center', gap: 4, justifySelf: 'center' }}><Icon name="arrow-left" size={12} /> 다른 방법</button>
        </form>}

        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11, textAlign: 'center', marginTop: 18, marginBottom: 0 }}>초대받은 프로젝트에만 접근할 수 있어요</p>
      </div>
    </div>
  );
};

const loginInput = { padding: '11px 14px', fontSize: 14, border: '1px solid rgba(255,255,255,0.4)', borderRadius: 10, background: 'rgba(255,255,255,0.9)', color: '#222', outline: 'none', fontFamily: 'inherit' };

window.LoginScreen = LoginScreen;
