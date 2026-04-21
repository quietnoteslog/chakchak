const Dashboard = ({ projects, onOpen, onNew, onLogout, userName }) => (
  <div style={{ background: '#f5f7fb', height: '100%', overflowY: 'auto' }}>
    <ChakHeader right={<div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
      <span style={{ fontSize: 12, color: '#555' }}>{userName}</span>
      <button onClick={onLogout} style={{ padding: '5px 10px', fontSize: 11, background: '#fff', border: '1px solid #d0d6e2', borderRadius: 6, cursor: 'pointer', color: '#555', display: 'inline-flex', alignItems: 'center', gap: 4 }}><Icon name="log-out" size={12} /> 로그아웃</button>
    </div>}>착착</ChakHeader>

    <main style={{ padding: '20px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>내 프로젝트</h1>
        <button onClick={onNew} style={{ padding: '8px 14px', background: '#7b9fe8', color: '#fff', borderRadius: 8, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}><Icon name="plus" size={14} /> 새 프로젝트</button>
      </div>

      {projects.length === 0 ? (
        <ChakEmpty>
          <div style={{ color: '#b5c4e8', marginBottom: 8 }}><Icon name="folder" size={32} stroke={1.5} /></div>
          <p style={{ margin: 0, marginBottom: 4, color: '#555', fontWeight: 600 }}>아직 프로젝트가 없습니다</p>
          <p style={{ margin: 0, fontSize: 12 }}>+ 새 프로젝트로 시작하세요</p>
        </ChakEmpty>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 10 }}>
          {projects.map((p) => (
            <li key={p.id}>
              <button onClick={() => onOpen(p.id)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: 14, background: '#fff', borderRadius: 12, border: '1px solid #e5e9f2', color: '#333', cursor: 'pointer', fontFamily: 'inherit' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, gap: 6 }}>
                  <strong style={{ fontSize: 15, fontWeight: 700, color: '#222' }}>{p.name}</strong>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {p.owner && <ChakBadge kind="owner">총괄</ChakBadge>}
                    <span style={{ color: '#b5c4e8', display: 'inline-flex' }}><Icon name="chevron-right" size={16} /></span>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: '#888', display: 'inline-flex', alignItems: 'center', gap: 5 }}><Icon name="calendar" size={12} /> {p.dates} <span>· 멤버 {p.members}명</span></div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  </div>
);

window.Dashboard = Dashboard;
