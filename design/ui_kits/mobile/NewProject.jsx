const NewProject = ({ onCreate, onBack }) => {
  const [name, setName] = React.useState('');
  const [start, setStart] = React.useState('2026-05-01');
  const [end, setEnd] = React.useState('2026-05-20');
  return (
    <div style={{ background: '#f5f7fb', height: '100%', overflowY: 'auto' }}>
      <ChakHeader back="뒤로" onBack={onBack} />
      <main style={{ padding: '20px 16px' }}>
        <h1 style={{ fontSize: 19, fontWeight: 700, marginTop: 0, marginBottom: 18 }}>새 프로젝트</h1>
        <form onSubmit={(e) => { e.preventDefault(); if (name.trim()) onCreate({ name, start, end }); }} style={{ display: 'grid', gap: 14 }}>
          <ChakField label="프로젝트명 *"><ChakInput value={name} onChange={(e) => setName(e.target.value)} placeholder="예) 2026 상반기 워크샵" /></ChakField>
          <ChakField label="시작일 *"><ChakInput type="date" value={start} onChange={(e) => setStart(e.target.value)} /></ChakField>
          <ChakField label="종료일 (선택)"><ChakInput type="date" value={end} onChange={(e) => setEnd(e.target.value)} /></ChakField>
          <ChakButton variant="primary" disabled={!name.trim()}>프로젝트 생성</ChakButton>
        </form>
      </main>
    </div>
  );
};

window.NewProject = NewProject;
