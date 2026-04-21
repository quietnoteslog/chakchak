// Shared primitive components for 착착 mobile UI kit

// Lucide icon primitive — wraps window.ChakIcon.svg (loaded from assets/icons.js).
const Icon = ({ name, size = 18, stroke = 2, style }) => {
  const markup = (window.ChakIcon && window.ChakIcon.svg(name, size, stroke)) || '';
  return (
    <span
      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', verticalAlign: 'middle', flexShrink: 0, lineHeight: 0, ...style }}
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
};

const ChakButton = ({ variant = 'primary', children, onClick, disabled, style, ...rest }) => {
  const base = {
    primary: { padding: '12px 0', background: disabled ? '#b5c4e8' : '#7b9fe8', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: disabled ? 'default' : 'pointer', width: '100%' },
    secondary: { padding: '10px 14px', background: '#fff', border: '1px solid #d0d6e2', borderRadius: 8, fontSize: 13, color: '#555', cursor: 'pointer', fontWeight: 600 },
    danger: { padding: '8px 14px', background: '#fff', border: '1px solid #f0c8c8', borderRadius: 8, fontSize: 13, color: '#c33', cursor: 'pointer', fontWeight: 600 },
    small: { padding: '6px 12px', fontSize: 12, background: '#fff', border: '1px solid #d0d6e2', borderRadius: 6, cursor: 'pointer', fontWeight: 600, color: '#333' },
    mini: { padding: '4px 10px', fontSize: 11, background: '#fff', border: '1px solid #d0d6e2', borderRadius: 6, color: '#555', cursor: 'pointer' },
    pill: { width: '100%', padding: '14px 0', borderRadius: 50, border: 'none', background: '#fff', color: '#444', fontSize: 14, fontWeight: 600, letterSpacing: '0.04em', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, boxShadow: '0 2px 12px rgba(0,0,0,0.12)' },
    pillOutline: { width: '100%', padding: '13px 0', borderRadius: 50, border: '1px solid rgba(255,255,255,0.5)', background: 'transparent', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  };
  return <button onClick={onClick} disabled={disabled} style={{ ...base[variant], ...style }} {...rest}>{children}</button>;
};

const ChakField = ({ label, children }) => (
  <label style={{ display: 'grid', gap: 6 }}>
    <span style={{ fontSize: 13, fontWeight: 600, color: '#555' }}>{label}</span>
    {children}
  </label>
);

const ChakInput = ({ style, ...rest }) => (
  <input style={{ padding: '10px 12px', fontSize: 14, border: '1px solid #d0d6e2', borderRadius: 8, background: '#fff', outline: 'none', color: '#222', fontFamily: 'inherit', ...style }} {...rest} />
);

const ChakSelect = ({ style, children, ...rest }) => (
  <select style={{ padding: '10px 12px', fontSize: 14, border: '1px solid #d0d6e2', borderRadius: 8, background: '#fff', outline: 'none', color: '#222', fontFamily: 'inherit', ...style }} {...rest}>{children}</select>
);

const ChakChip = ({ children, onRemove }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', background: '#eef4ff', color: '#4a6bc4', borderRadius: 14, fontSize: 12, fontWeight: 600 }}>
    {children}
    {onRemove && <button onClick={onRemove} style={{ background: 'transparent', border: 'none', color: '#4a6bc4', cursor: 'pointer', padding: 0, display: 'inline-flex', alignItems: 'center' }}><Icon name="x" size={12} /></button>}
  </span>
);

const ChakBadge = ({ kind = 'owner', children }) => {
  const s = kind === 'owner'
    ? { background: '#e8efff', color: '#4a6bc4' }
    : { background: '#e8f5e9', color: '#2e7d32' };
  return <span style={{ fontSize: 10, padding: '3px 10px', borderRadius: 10, fontWeight: 600, ...s }}>{children}</span>;
};

const ChakTag = ({ children }) => (
  <span style={{ fontSize: 10, padding: '2px 6px', background: '#f0f2f8', color: '#555', borderRadius: 4, fontWeight: 600 }}>{children}</span>
);

const ChakEmpty = ({ children }) => (
  <div style={{ padding: 24, background: '#fff', border: '1px dashed #d0d6e2', borderRadius: 12, textAlign: 'center', color: '#888', fontSize: 13 }}>{children}</div>
);

const ChakHeader = ({ back, onBack, right, children }) => (
  <header style={{ padding: '14px 16px', background: '#fff', borderBottom: '1px solid #e5e9f2', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
    {back ? (
      <button onClick={onBack} style={{ background: 'none', border: 'none', fontSize: 13, color: '#555', cursor: 'pointer', padding: 0, display: 'inline-flex', alignItems: 'center', gap: 4 }}><Icon name="arrow-left" size={14} /> {back}</button>
    ) : (
      <div style={{ fontWeight: 700, fontSize: 16, letterSpacing: '0.05em' }}>{children}</div>
    )}
    {right}
  </header>
);

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" style={{ flexShrink: 0 }}>
    <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
    <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
    <path fill="#FBBC05" d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"/>
    <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z"/>
  </svg>
);

Object.assign(window, { Icon, ChakButton, ChakField, ChakInput, ChakSelect, ChakChip, ChakBadge, ChakTag, ChakEmpty, ChakHeader, GoogleIcon });
