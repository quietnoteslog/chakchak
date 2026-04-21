# 착착 Mobile Web UI Kit

375px 모바일 웹앱 재현. 로그인 → 대시보드 → 프로젝트 상세 → 내역 추가 → 멤버 관리 플로우를 클릭으로 순회할 수 있는 프로토타입.

`index.html` 을 열면 iPhone 프레임 안에서 직접 탐색 가능.

## 포함 컴포넌트
- `AppShell.jsx` — iPhone safe-area + 헤더 래퍼
- `LoginScreen.jsx` — 4-stop gradient + glass card
- `Dashboard.jsx` — 프로젝트 목록 + 빈 상태
- `NewProject.jsx` — 프로젝트 생성 폼
- `ProjectDetail.jsx` — 탭 + 요약 박스 + 내역 리스트
- `NewRecord.jsx` — 영수증 업로드 + OCR 결과 + 폼
- `Members.jsx` — 초대 링크 + 멤버 리스트
- `Primitives.jsx` — Button, Field, Chip, Badge, Tag, EmptyBox
