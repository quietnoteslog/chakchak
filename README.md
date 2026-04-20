# 착착 (chakchak)

오프라인 프로젝트/행사를 운영하는 소규모 팀을 위한 **행사 경비 정산 앱**.
현장에서 영수증을 촬영하면 AI가 자동으로 금액/날짜/가맹점을 읽어 기입하고,
프로젝트 단위로 팀원과 함께 정산·추출한다.

## MVP 기능

1. **프로젝트(행사) 생성 + 팀원 초대/권한** — 총괄/멤버 구분, 프로젝트별 접근 제어
2. **영수증 사진 → OCR → 자동 입력** — Gemini Vision으로 금액/날짜/가맹점 자동 추출
3. **내역 + 영수증 일괄/개별 다운로드** — 엑셀 리포트 + Zip 묶음

자세한 기획은 [SPEC.md](https://github.com/quietnoteslog/chakchak/blob/main/../../06.%20APP/착착/SPEC.md) 참조 (Life OS 내부 문서).

## 기술 스택

- Next.js 16 (App Router) + TypeScript + Tailwind
- Firebase Auth (Google OAuth) / Firestore / Storage / App Hosting
- Gemini API (Vision) — OCR

## 환경 설정

### 1. Node 버전
```bash
node -v   # v22 권장 (v25+ Turbopack 충돌)
```

### 2. 환경변수 (.env.local)
`.env.local` 파일 생성 (gitignore 대상):
```
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=chakchak-926ac.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=chakchak-926ac
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=chakchak-926ac.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=...
```
동일 값이 `apphosting.yaml`(배포용)에 박혀 있다. 로컬 개발 시 이 파일 필요.

### 3. 의존성 설치
```bash
npm install
```

## 로컬 실행

**주의:** Turbopack + Firebase SDK 조합에서 첫 컴파일이 10분 이상 hang되는 이슈 확인됨.
로컬 테스트보다 **배포 URL로 확인** 권장.

```bash
npm run dev           # Turbopack hang 가능
npm run build && npm start   # 느리지만 안정적
```

## 배포

GitHub `main` 브랜치에 push → Firebase App Hosting 자동 빌드/배포.

- GitHub: https://github.com/quietnoteslog/chakchak
- Firebase: chakchak-926ac (quietnotes.log@gmail.com)
- 배포 URL: https://chakchak--chakchak-926ac.asia-east1.hosted.app

빌드 로그: Firebase Console → App Hosting → 백엔드 `chakchak` → Rollouts.

## 폴더 구조

```
chakchak/
├── app/              # Next.js App Router
│   ├── login/        # Google OAuth 로그인 페이지
│   ├── dashboard/    # 대시보드 (현재 임시)
│   ├── providers.tsx # AuthProvider dynamic import
│   ├── layout.tsx    # 루트 레이아웃
│   └── page.tsx      # / → /login 리다이렉트
├── lib/
│   ├── firebase.ts      # Firebase 초기화
│   └── AuthContext.tsx  # Google 로그인 상태 관리
├── public/
├── .env.local        # (gitignore) 로컬 개발용 환경변수
├── apphosting.yaml   # Firebase App Hosting 런타임 설정
└── package.json
```

## 문서

- SPEC: `Life OS/06. APP/착착/SPEC.md`
- 개발 로그: `Life OS/06. APP/착착/DEVLOG.md`
- 초기 HTML 목업: `git checkout mockup-archive` 브랜치
