const NewRecord = ({ project, onSave, onBack }) => {
  const [stage, setStage] = React.useState('empty'); // empty | ocr | ready
  const [type, setType] = React.useState('영수증');
  const [cat, setCat] = React.useState(project.categories[0] ?? '');
  const [date, setDate] = React.useState('2026-04-21');
  const [merchant, setMerchant] = React.useState('');
  const [amount, setAmount] = React.useState('');
  const [payType, setPayType] = React.useState('법인카드');

  const simulateUpload = () => {
    setStage('ocr');
    setTimeout(() => {
      setMerchant('이마트 강남점');
      setAmount('124500');
      setDate('2026-04-21');
      setStage('ready');
    }, 1400);
  };

  return (
    <div style={{ background: '#f5f7fb', height: '100%', overflowY: 'auto' }}>
      <ChakHeader back="프로젝트" onBack={onBack} />
      <main style={{ padding: '18px 16px' }}>
        <h1 style={{ fontSize: 19, fontWeight: 700, marginTop: 0, marginBottom: 16 }}>내역 추가</h1>

        <form onSubmit={(e) => { e.preventDefault(); onSave(); }} style={{ display: 'grid', gap: 14 }}>
          {stage === 'empty' && (
            <button type="button" onClick={simulateUpload} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 22, background: '#fff', border: '2px dashed #c5cfe4', borderRadius: 12, cursor: 'pointer', color: '#7b9fe8', textAlign: 'center', fontFamily: 'inherit', gap: 6 }}>
              <Icon name="camera" size={30} stroke={1.8} />
              <strong style={{ fontSize: 13, color: '#333' }}>영수증 촬영·선택·드래그 (선택)</strong>
              <span style={{ fontSize: 11, color: '#888' }}>이미지/PDF, 최대 10MB · OCR 자동 입력</span>
            </button>
          )}
          {stage !== 'empty' && (
            <div style={{ padding: 12, background: '#fff', border: '1px solid #e5e9f2', borderRadius: 10, textAlign: 'center' }}>
              <div style={{ width: 140, height: 170, margin: '0 auto', background: '#f7f5ed', border: '1px solid #e5e1cf', borderRadius: 6, display: 'flex', flexDirection: 'column', padding: '12px 10px', gap: 6, boxShadow: '0 1px 4px rgba(0,0,0,.05)' }}>
                <div style={{ fontSize: 9, color: '#444', fontWeight: 700, textAlign: 'center', letterSpacing: '.3em' }}>RECEIPT</div>
                <div style={{ height: 1, background: '#d7d2c0' }} />
                {[1,2,3,4].map(i => <div key={i} style={{ height: 3, background: '#d7d2c0', width: `${90 - i * 10}%` }} />)}
                <div style={{ height: 1, background: '#d7d2c0', marginTop: 'auto' }} />
                <div style={{ height: 4, background: '#8a8570', width: '60%' }} />
              </div>
            </div>
          )}
          {stage === 'ocr' && <p style={{ color: '#7b9fe8', textAlign: 'center', margin: 0, fontSize: 13, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6 }}><Icon name="loader-2" size={14} /> 영수증 읽는 중...</p>}
          {stage === 'ready' && <div style={{ padding: 10, background: '#eef4ff', borderRadius: 8, fontSize: 12, color: '#4a6bc4', display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="info" size={14} /> AI 자동 입력 (신뢰도 94%). 값을 확인·수정해주세요.</div>}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <ChakField label="구분 *">
              <ChakSelect value={type} onChange={(e) => setType(e.target.value)}>
                {['영수증', '세금계산서', '간이영수증', '견적서'].map((t) => <option key={t}>{t}</option>)}
              </ChakSelect>
            </ChakField>
            <ChakField label="카테고리1 *">
              <ChakSelect value={cat} onChange={(e) => setCat(e.target.value)}>
                {project.categories.map((c) => <option key={c}>{c}</option>)}
              </ChakSelect>
            </ChakField>
          </div>

          <ChakField label="일자 *"><ChakInput type="date" value={date} onChange={(e) => setDate(e.target.value)} /></ChakField>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <ChakField label="구매처 *"><ChakInput value={merchant} onChange={(e) => setMerchant(e.target.value)} placeholder="예) 이마트 강남점" /></ChakField>
            <ChakField label="내용"><ChakInput placeholder="예) 식대" /></ChakField>
          </div>

          <ChakField label="금액 (원) *"><ChakInput type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" inputMode="numeric" /></ChakField>

          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#555', marginBottom: 6 }}>결제수단 *</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {['법인카드', '개인카드', '현금'].map((pt) => (
                <button key={pt} type="button" onClick={() => setPayType(pt)} style={{ padding: '8px 12px', fontSize: 12, border: `1px solid ${payType === pt ? '#7b9fe8' : '#d0d6e2'}`, background: payType === pt ? '#eef4ff' : '#fff', color: payType === pt ? '#4a6bc4' : '#555', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit' }}>{pt}</button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={onBack} style={{ flex: 1, padding: '11px 0', background: '#fff', color: '#555', border: '1px solid #d0d6e2', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>취소</button>
            <button type="submit" disabled={!merchant || !amount} style={{ flex: 2, padding: '11px 0', background: (!merchant || !amount) ? '#b5c4e8' : '#7b9fe8', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: (!merchant || !amount) ? 'default' : 'pointer', fontFamily: 'inherit' }}>내역 저장</button>
          </div>
        </form>
      </main>
    </div>
  );
};

window.NewRecord = NewRecord;
