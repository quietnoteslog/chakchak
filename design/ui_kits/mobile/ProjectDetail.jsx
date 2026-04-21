const ProjectDetail = ({ project, records, onBack, onAdd, onMembers }) => {
  const [tab, setTab] = React.useState('__all__');
  const visible = tab === '__all__' ? records : records.filter((r) => r.cat === tab);
  const total = visible.reduce((s, r) => s + r.amount, 0);
  const fmt = (n) => n.toLocaleString('ko-KR');

  return (
    <div style={{ background: '#f5f7fb', height: '100%', overflowY: 'auto' }}>
      <ChakHeader back="프로젝트 목록" onBack={onBack} />

      <main style={{ padding: '18px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, gap: 8 }}>
          <div>
            <h1 style={{ fontSize: 19, fontWeight: 700, margin: 0, marginBottom: 4 }}>{project.name}</h1>
            <p style={{ fontSize: 12, color: '#888', margin: 0 }}>{project.dates}</p>
          </div>
          <ChakBadge kind="owner">총괄</ChakBadge>
        </div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
          <button onClick={onMembers} style={metaBtn}><Icon name="users" size={13} /> 멤버 ({project.members})</button>
          <button style={metaBtn}><Icon name="settings" size={13} /> 설정</button>
        </div>

        <div style={{ display: 'flex', gap: 5, marginBottom: 10, flexWrap: 'wrap' }}>
          {[['__all__', `전체 (${records.length})`], ...project.categories.map((c) => [c, `${c} (${records.filter((r) => r.cat === c).length})`])].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} style={{ padding: '7px 12px', fontSize: 12, fontWeight: 600, border: `1px solid ${tab === id ? '#7b9fe8' : '#d0d6e2'}`, background: tab === id ? '#7b9fe8' : '#fff', color: tab === id ? '#fff' : '#555', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit' }}>{label}</button>
          ))}
        </div>

        <div style={{ padding: 14, background: '#fff', borderRadius: 12, border: '1px solid #e5e9f2', marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, color: '#888', marginBottom: 2 }}>{tab === '__all__' ? '전체 지출' : '필터 소계'}</div>
            <div style={{ fontSize: 19, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{fmt(total)}원</div>
          </div>
          <button onClick={onAdd} style={{ padding: '9px 14px', background: '#7b9fe8', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 5 }}><Icon name="plus" size={14} /> 내역 추가</button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h2 style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>내역 ({visible.length})</h2>
          {visible.length > 0 && <div style={{ display: 'flex', gap: 5 }}>
            <button style={exportBtn}><Icon name="file-spreadsheet" size={13} /> 엑셀</button>
            <button style={exportBtn}><Icon name="file-text" size={13} /> PDF</button>
            <button style={exportBtn}><Icon name="package" size={13} /> Zip</button>
          </div>}
        </div>

        {visible.length === 0 ? (
          <ChakEmpty>아직 내역이 없습니다. 영수증을 추가해보세요.</ChakEmpty>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 8 }}>
            {visible.map((r, i) => (
              <li key={r.id} style={{ padding: 12, background: '#fff', borderRadius: 10, border: '1px solid #e5e9f2' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <ChakTag>{r.type}</ChakTag>
                    <span style={{ fontSize: 11, color: '#888' }}>{r.date}</span>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{fmt(r.amount)}원</div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#222', marginBottom: 2 }}>{r.merchant}</div>
                <div style={{ fontSize: 11, color: '#666', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{r.cat} · {r.content}</span>
                  {r.receipt ? <span style={{ color: '#7b9fe8', display: 'inline-flex', alignItems: 'center', gap: 3 }}><Icon name="image" size={12} /> 영수증 보기</span> : <span style={{ color: '#c33', display: 'inline-flex', alignItems: 'center', gap: 3 }}><Icon name="alert-circle" size={12} /> 미제출</span>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
};

const exportBtn = { padding: '5px 10px', fontSize: 11, background: '#fff', border: '1px solid #d0d6e2', borderRadius: 6, cursor: 'pointer', fontWeight: 600, color: '#333', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 4 };
const metaBtn = { padding: '7px 12px', background: '#fff', border: '1px solid #d0d6e2', borderRadius: 8, fontSize: 12, color: '#555', cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 5, fontWeight: 600 };

window.ProjectDetail = ProjectDetail;
