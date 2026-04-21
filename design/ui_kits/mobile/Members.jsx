const Members = ({ project, onBack }) => {
  const [createdLink, setCreatedLink] = React.useState(null);
  return (
    <div style={{ background: '#f5f7fb', height: '100%', overflowY: 'auto' }}>
      <ChakHeader back="프로젝트" onBack={onBack} />
      <main style={{ padding: '18px 16px' }}>
        <h1 style={{ fontSize: 19, fontWeight: 700, marginTop: 0, marginBottom: 14 }}>멤버 관리</h1>

        <section style={{ marginBottom: 18, padding: 14, background: '#fff', borderRadius: 12, border: '1px solid #e5e9f2' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, gap: 8, flexWrap: 'wrap' }}>
            <h2 style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>초대 링크</h2>
            <button onClick={() => setCreatedLink('https://chakchak.app/invite/abc12345')} style={{ padding: '7px 12px', background: '#7b9fe8', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 5 }}><Icon name="link" size={13} /> 링크 생성 (7일 유효)</button>
          </div>
          <p style={{ fontSize: 11, color: '#888', margin: 0 }}>생성된 링크를 받은 사람은 Google 로그인 후 자동으로 참여됩니다.</p>

          {createdLink && (
            <div style={{ marginTop: 10, padding: 10, background: '#eef4ff', borderRadius: 8 }}>
              <div style={{ fontSize: 10, color: '#4a6bc4', marginBottom: 4, fontWeight: 700 }}>새 링크</div>
              <div style={{ fontSize: 11, color: '#333', wordBreak: 'break-all', marginBottom: 6 }}>{createdLink}</div>
              <button style={{ padding: '5px 10px', background: '#7b9fe8', color: '#fff', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 4 }}><Icon name="copy" size={11} /> 복사</button>
            </div>
          )}
        </section>

        <h2 style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>참여 중 ({project.memberList.length})</h2>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 8 }}>
          {project.memberList.map((m, i) => (
            <li key={i} style={{ padding: 11, background: '#fff', borderRadius: 8, border: '1px solid #e5e9f2', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#222' }}>{m.name}</div>
              <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexWrap: 'wrap' }}>
                {m.role === 'owner' && <ChakBadge kind="owner">총괄</ChakBadge>}
                {m.role === 'editor' && <ChakBadge kind="editor">편집 권한</ChakBadge>}
                {m.role !== 'owner' && <button style={{ padding: '3px 8px', fontSize: 10, background: '#fff', border: '1px solid #d0d6e2', borderRadius: 6, color: '#555', cursor: 'pointer', fontFamily: 'inherit' }}>편집 권한</button>}
                {m.role !== 'owner' && <button style={{ padding: '3px 8px', fontSize: 10, background: '#fff', border: '1px solid #f0c8c8', borderRadius: 6, color: '#c33', cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 3 }}><Icon name="trash-2" size={11} /> 제거</button>}
              </div>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
};

window.Members = Members;
