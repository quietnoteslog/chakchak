/* ============================================================
   착착 (Chakchak) · Lucide Icon Set
   ------------------------------------------------------------
   착착의 기능 라벨 이모지를 대체하는 Lucide 아이콘 매핑.
   stroke: 2px, rounded, 단색. (color="currentColor")
   기본 사용: <span data-chak-icon="camera" data-size="20"></span>
              window.ChakIcon.mount()  또는  window.ChakIcon.render(name, size)
   ============================================================ */
(function () {
  const ns = 'http://www.w3.org/2000/svg';

  // Lucide 원본 path 데이터 (stroke="currentColor" 전제, 2px, round-cap, round-join).
  // 출처: lucide.dev (ISC License). 필요한 아이콘만 발췌.
  const PATHS = {
    // 착착 기능 매핑
    'check-circle-2':    ['<path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10Z"/>', '<path d="m9 12 2 2 4-4"/>'],
    'camera':            ['<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z"/>', '<circle cx="12" cy="13" r="3"/>'],
    'file-spreadsheet':  ['<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>', '<path d="M14 2v4a2 2 0 0 0 2 2h4"/>', '<path d="M8 13h2"/>', '<path d="M14 13h2"/>', '<path d="M8 17h2"/>', '<path d="M14 17h2"/>'],
    'file-text':         ['<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/>', '<path d="M14 2v4a2 2 0 0 0 2 2h4"/>', '<path d="M10 9H8"/>', '<path d="M16 13H8"/>', '<path d="M16 17H8"/>'],
    'package':           ['<path d="M16.5 9.4 7.55 4.24"/>', '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>', '<path d="M3.27 6.96 12 12.01l8.73-5.05"/>', '<path d="M12 22.08V12"/>'],
    'sliders-horizontal':['<line x1="21" x2="14" y1="4" y2="4"/>', '<line x1="10" x2="3" y1="4" y2="4"/>', '<line x1="21" x2="12" y1="12" y2="12"/>', '<line x1="8" x2="3" y1="12" y2="12"/>', '<line x1="21" x2="16" y1="20" y2="20"/>', '<line x1="12" x2="3" y1="20" y2="20"/>', '<line x1="14" x2="14" y1="2" y2="6"/>', '<line x1="8" x2="8" y1="10" y2="14"/>', '<line x1="16" x2="16" y1="18" y2="22"/>'],
    'smartphone':        ['<rect width="14" height="20" x="5" y="2" rx="2" ry="2"/>', '<path d="M12 18h.01"/>'],

    // 보조 · 내비게이션
    'arrow-left':        ['<path d="m12 19-7-7 7-7"/>', '<path d="M19 12H5"/>'],
    'arrow-right':       ['<path d="M5 12h14"/>', '<path d="m12 5 7 7-7 7"/>'],
    'arrow-up':          ['<path d="m5 12 7-7 7 7"/>', '<path d="M12 19V5"/>'],
    'arrow-down':        ['<path d="M12 5v14"/>', '<path d="m19 12-7 7-7-7"/>'],
    'chevron-left':      ['<path d="m15 18-6-6 6-6"/>'],
    'chevron-right':     ['<path d="m9 18 6-6-6-6"/>'],
    'x':                 ['<path d="M18 6 6 18"/>', '<path d="m6 6 12 12"/>'],
    'plus':              ['<path d="M5 12h14"/>', '<path d="M12 5v14"/>'],
    'check':             ['<path d="M20 6 9 17l-5-5"/>'],

    // 상세 화면에서 쓰이는 것들
    'users':             ['<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>', '<circle cx="9" cy="7" r="4"/>', '<path d="M22 21v-2a4 4 0 0 0-3-3.87"/>', '<path d="M16 3.13a4 4 0 0 1 0 7.75"/>'],
    'user-plus':         ['<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>', '<circle cx="9" cy="7" r="4"/>', '<line x1="19" x2="19" y1="8" y2="14"/>', '<line x1="22" x2="16" y1="11" y2="11"/>'],
    'link':              ['<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>', '<path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>'],
    'copy':              ['<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>', '<path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>'],
    'calendar':          ['<rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>', '<line x1="16" x2="16" y1="2" y2="6"/>', '<line x1="8" x2="8" y1="2" y2="6"/>', '<line x1="3" x2="21" y1="10" y2="10"/>'],
    'log-out':           ['<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>', '<polyline points="16 17 21 12 16 7"/>', '<line x1="21" x2="9" y1="12" y2="12"/>'],
    'trash-2':           ['<path d="M3 6h18"/>', '<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>', '<path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>', '<line x1="10" x2="10" y1="11" y2="17"/>', '<line x1="14" x2="14" y1="11" y2="17"/>'],
    'pencil':            ['<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>'],
    'search':            ['<circle cx="11" cy="11" r="8"/>', '<path d="m21 21-4.3-4.3"/>'],
    'settings':          ['<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>', '<circle cx="12" cy="12" r="3"/>'],
    'image':             ['<rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>', '<circle cx="9" cy="9" r="2"/>', '<path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>'],
    'download':          ['<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>', '<polyline points="7 10 12 15 17 10"/>', '<line x1="12" x2="12" y1="15" y2="3"/>'],
    'share':             ['<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>', '<polyline points="16 6 12 2 8 6"/>', '<line x1="12" x2="12" y1="2" y2="15"/>'],
    'folder':            ['<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>'],
    'receipt':           ['<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/>', '<path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/>', '<path d="M12 17.5v-11"/>'],
    'alert-circle':      ['<circle cx="12" cy="12" r="10"/>', '<line x1="12" x2="12" y1="8" y2="12"/>', '<line x1="12" x2="12.01" y1="16" y2="16"/>'],
    'info':              ['<circle cx="12" cy="12" r="10"/>', '<path d="M12 16v-4"/>', '<path d="M12 8h.01"/>'],
    'loader-2':          ['<path d="M21 12a9 9 0 1 1-6.219-8.56"/>'],
  };

  function svgMarkup(name, size = 20, stroke = 2) {
    const paths = PATHS[name];
    if (!paths) return '';
    return `<svg xmlns="${ns}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths.join('')}</svg>`;
  }

  function element(name, size, stroke) {
    const tmp = document.createElement('div');
    tmp.innerHTML = svgMarkup(name, size, stroke);
    return tmp.firstElementChild;
  }

  function mount(root = document) {
    const nodes = root.querySelectorAll('[data-chak-icon]');
    nodes.forEach((el) => {
      const name = el.getAttribute('data-chak-icon');
      const size = parseInt(el.getAttribute('data-size') || '20', 10);
      const stroke = parseFloat(el.getAttribute('data-stroke') || '2');
      el.innerHTML = svgMarkup(name, size, stroke);
      el.style.display = el.style.display || 'inline-flex';
      el.style.verticalAlign = 'middle';
    });
  }

  window.ChakIcon = {
    svg: svgMarkup,
    el: element,
    mount,
    names: Object.keys(PATHS),
  };

  if (document.readyState !== 'loading') mount();
  else document.addEventListener('DOMContentLoaded', () => mount());
})();
