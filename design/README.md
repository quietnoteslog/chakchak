# 착착 (Chakchak) Design System

**착착 (chakchak)** — 오프라인 행사/프로젝트를 운영하는 소규모 팀을 위한 **행사 경비 정산 앱**.
현장에서 영수증을 촬영하면 AI (Gemini Vision) 가 자동으로 금액·날짜·가맹점을 추출하고,
팀원과 함께 내역을 모아 엑셀·PDF·Zip으로 내보낸다.

> "착착" 은 일이 순서대로 척척 맞아 떨어지는 소리를 그대로 가져온 이름.
> 영수증이 쌓이는 소리이자 정산이 맞아 떨어지는 소리.

## 제품/사용자

- **플랫폼**: 모바일 웹 (PWA, 375px 기준) · Next.js 16 App Router
- **백엔드**: Firebase (Auth / Firestore / Storage / App Hosting)
- **AI**: Gemini API (Vision) — 영수증 OCR
- **주 사용자**: 행사 스태프, 소규모 팀 운영자, 총괄 담당자
- **핵심 흐름**: 프로젝트 생성 → 멤버 초대 → 현장 영수증 촬영 → OCR 자동 입력 → 탭·필터 → 엑셀/PDF/Zip 내보내기

## Sources

이 디자인 시스템은 다음을 근거로 작성됨. 열람 권한이 필요하면 별도 요청.

- **Codebase** (mounted, read-only): `chakchak/`
  - `app/layout.tsx` — 테마 컬러 `#7b9fe8`, 앱 이름 "착착"
  - `app/globals.css` — `--background: #ffffff`, `--foreground: #171717`
  - `app/login/page.tsx` — 로그인 그라디언트·글래스 모프
  - `app/dashboard/page.tsx` — 프로젝트 목록 레이아웃
  - `app/projects/[id]/page.tsx` — 탭·필터·PDF 모달
  - `app/projects/[id]/components/RecordForm.tsx` — 영수증 업로드·OCR UI
  - `app/projects/[id]/members/page.tsx` — 멤버 관리·초대 링크
  - `public/icon.svg` — 아이콘 원본
- **GitHub**: https://github.com/quietnoteslog/chakchak
- **Deployed**: https://chakchak--chakchak-926ac.asia-east1.hosted.app

## Index (manifest)

```
/
├── README.md               # 이 문서
├── SKILL.md                # Claude Code 호환 skill 정의
├── colors_and_type.css     # CSS 변수 (컬러, 타이포, 반경, 그림자, 간격)
├── fonts/                  # Pretendard 9 weights
├── assets/
│   ├── icon-original.svg   # 현재 프로덕션 아이콘 (코드베이스 그대로)
│   ├── icon-gradient.svg   # 로그인 그라디언트를 반영한 변형 제안
│   ├── icon-receipt.svg    # 영수증 + 체크 모티프 제안
│   └── logo-horizontal.svg # 가로형 로고 + 태그라인
├── preview/                # 디자인 시스템 카드 (색/타입/스페이싱/컴포넌트)
└── ui_kits/
    └── mobile/             # 모바일 웹앱 UI 키트 (375px)
```

## Content Fundamentals

한국어 UI. 실용·친근·담백. 행사 스태프가 현장에서 한 손으로 쓴다는 점을 잊지 말 것.

- **어조**: 존대 기본 (`~해주세요`, `~입니다`, `~하세요`). 안내는 담백하게, 지시는 짧게.
  - 에러: `"이메일과 비밀번호를 입력해주세요"`, `"저장 실패 — 다시 시도해주세요"`
  - 확인: `"프로젝트 삭제`, 계속할까요?"`, `"링크가 복사되었습니다"`
- **인칭**: 사용자는 `~님`. 시스템은 1인칭 없음. `"계정이 없으신가요?"` 처럼 질문형을 즐겨 씀.
- **태그라인**: `"행사 경비 정산을 착착"` — 동사 생략·체언 종결로 리드미컬.
- **버튼 라벨**:
  - 주요: `로그인`, `가입하기`, `프로젝트 생성`, `내역 저장`, `+ 내역 추가`, `+ 새 프로젝트`
  - 파괴: `삭제`, `제거`, `권한 회수`, `취소` (링크 무효화)
  - 보조: `뒤로`, `← 프로젝트`, `다시 선택`, `영수증 교체`
- **빈 상태**: `"아직 프로젝트가 없습니다"` + 2번째 줄 `"+ 새 프로젝트로 시작하세요"`. 한 줄 메인 + 한 줄 CTA 힌트.
- **숫자 단위**: 금액은 `1,234원` (원 붙임, ko-KR 로케일). 날짜는 `2026.04.21` (마침표).
- **이모지**:
  - UI 안에서 의미있는 위치에 1개씩만: `✅`(브랜드), `📷`(업로드 드롭존), `📊 엑셀`, `📄 PDF`, `📦 Zip`, `🔍 필터`, `📱`(설치 안내)
  - 장식 금지. 아이콘 대체용으로만.
- **피해야 할 것**: `멋진`, `훌륭한` 같은 감탄 톤, 이모지 범벅, 영문 페르소나 (We/You).

## Visual Foundations

### 팔레트

모두 **페리윙클 블루 계열**. 신선하지도 어둡지도 않은 **하늘+연보라 중간톤**. 로그인 한 곳만 보라 기운이 들어간 그라디언트를 쓰고, 나머지는 전부 단일 블루 + 슬레이트 그레이.

| Token | Hex | 용도 |
|---|---|---|
| `--chak-primary` | `#7b9fe8` | 주 CTA, 선택 탭 배경, PWA theme color |
| `--chak-primary-dark` | `#4a6bc4` | 틴트 위 텍스트, 배지 텍스트, 링크 |
| `--chak-primary-tint` | `#eef4ff` | 선택 탭 칩 배경, 정보 박스 |
| `--chak-primary-tint-2` | `#e8efff` | 총괄 배지 배경 |
| `--chak-primary-disabled` | `#b5c4e8` | busy 상태 버튼 |
| `--chak-bg` | `#f5f7fb` | 앱 캔버스 (슬레이트 틴트 오프화이트) |
| `--chak-surface` | `#ffffff` | 카드, 입력, 헤더 |
| `--chak-border` | `#e5e9f2` | 카드 아웃라인 (슬레이트 블루 1%) |
| `--chak-border-strong` | `#d0d6e2` | 입력 아웃라인 |
| `--chak-danger` | `#c33` | 파괴 버튼 텍스트, 경고 |
| `--chak-success` | `#3a8e5f` / `#2e7d32` | 편집 권한 배지, 설치 완료 |

로그인 페이지만 `linear-gradient(135deg, #a8c8f8 0%, #7b9fe8 30%, #8b7fd4 60%, #b8d4f8 100%)` + backdrop-blur glass. 나머지 화면에는 그라디언트 금지.

### 타이포

- **Pretendard** — 국·영문 모두 이 서체 하나. 코드베이스는 시스템 폰트 fallback 체인 (`-apple-system, 'Apple SD Gothic Neo', 'Malgun Gothic'`) 을 썼으나, 이 디자인 시스템에선 Pretendard 를 채택함 (업로드 받음).
- **Weight 사용**:
  - 400 Regular — 본문, 입력값
  - 500 Medium — 드물게 (한국어는 500이 자연스러움)
  - 600 SemiBold — 라벨, 버튼, 칩, 내역 행의 구매처
  - 700 Bold — 헤더 브랜드, 섹션 제목, 로그인 버튼 폰트, 총 금액
  - 800 ExtraBold — 모달 제목 (`PDF 다운로드`), 로고
  - 900 Black — 로고 블록 (대안)
- **스케일**: 10 · 11 · 12 · 13 · 14 · 16 · 18 · 20 · 22 · 28px. 16·24 는 건너뜀 (16px 는 list item 에만).
- **자간**: 브랜드 `착착` 은 `letter-spacing: 0.12em` 으로 **띄어서** 찍는다. 헤더 brand 는 `0.05em`. 본문은 기본값.
- **숫자**: 금액은 `font-variant-numeric: tabular-nums` 필수 (테이블 정렬).

### 레이아웃 · 간격

- 모바일 폭 상한: `375~420px`. 대시보드는 `max-width: 720px`, 프로젝트 상세는 `1100px` (테이블 때문).
- 모든 간격은 4의 배수. 가장 자주: `6 · 8 · 10 · 12 · 16 · 20 · 24`.
- 카드 내부 패딩: 12 (리스트 아이템) / 16 (카드) / 24 (빈 상태) / 44×36 (로그인 글래스).

### 배경

- 앱 대부분: **슬레이트 오프화이트 단색** (`#f5f7fb`). 이미지·패턴·텍스처 전혀 없음.
- 로그인만: **4-stop diagonal gradient** + 두 개의 `blur(60px)` 구형 블롭 (하늘색 · 보라) → glass card 위에 얹힘.
- 이미지 촬영 결과 (영수증) 외에는 사진 사용 없음.

### 보더 · 반경 · 그림자

- 카드·모달·버튼은 **부드러운 코너**: 6 / 8 / 12 / 16 (용도별). 원형 pill (50px) 은 로그인 버튼 한정.
- **보더 스타일**: 항상 1px solid `#e5e9f2` 또는 `#d0d6e2`. 점선은 업로드 드롭존과 빈 상태 박스에만.
- **그림자 시스템**:
  - 카드 — **그림자 없음** (깨끗한 라인만)
  - 버튼 일반 — 없음
  - 로그인 Google 버튼 — `0 2px 12px rgba(0,0,0,0.12)`
  - 로그인 글래스 카드 — `0 8px 32px rgba(100,120,200,0.2)`
  - 모달 — `0 10px 40px rgba(0,0,0,0.2)`
- 그림자보다 **보더 + 배경 대비** 로 계층을 만든다.

### 상태 · 인터랙션

- **Hover**: 정의된 hover 상태가 거의 없음 (터치 우선). 데스크탑에선 transition 없이 즉시 색 반전.
- **Selected 탭/칩**: `background: #7b9fe8` + `color: #fff` + `border: 1px solid #7b9fe8`. 비선택은 `#fff` + `#d0d6e2` 보더 + `#555` 텍스트.
- **Busy / disabled**: 배경을 `#b5c4e8` 로 옅게, `cursor: default`. 텍스트는 그대로.
- **Press**: 별도 애니메이션 없음.
- **Focus**: `outline: none` + 테두리 강조 의존. (실제 운영 시 a11y 보완 필요 — 아래 CAVEAT 참조.)
- **Transition**: 드롭존만 `background 0.15s, border-color 0.15s`. 나머지는 즉시.
- **Animations**: 로딩은 텍스트 `"로딩 중..."`. 스피너·스켈레톤 없음.

### Blur / 투명

- **로그인 전용**: `backdrop-filter: blur(20px)` + `background: rgba(255,255,255,0.15)` + `border: 1px solid rgba(255,255,255,0.3)` → 전형적 glassmorphism.
- 나머지 화면에는 투명·블러 사용 없음.

### 이미지·일러스트

- 일러스트 없음. 장식적 SVG 없음.
- 유일한 이미지 소스는 사용자가 업로드한 **영수증 사진** (OCR 대상). `object-fit: contain`, `max-height: 240px`, 흰 배경 카드 위.
- Grain·texture·patterns 사용 안 함.

### Protection gradients / Capsules

- 선택된 탭이 **capsule (pill)** 이 아님 — 8px radius 의 직사각형. pill 은 로그인 원형 버튼과 배지 한정.
- 보호 그라디언트 (이미지 위 텍스트 가독성용) 사용 안 함.

## Iconography

브랜드 자체가 **한글 글자 기반**. 아이콘은 얇고 목적 지향적으로.

- **앱 아이콘**: `착착` 글자를 흰색 ExtraBold 로 `#7b9fe8` 정사각에 얹음 (rx 96 / 512). letter-spacing `-8` (붙여쓰기).
- **앱 내 아이콘 세트 — Lucide (채택)**
  - 라이브러리: **Lucide** — stroke 2px, rounded, 단색. `color: currentColor` 로 자리한 텍스트 색을 따라간다.
  - 사용법: `assets/icons.js` 가 필요한 이름만 path 로 미리 담고 있음 (CDN 의존 없음). HTML 에는 `<span data-chak-icon="camera" data-size="20"></span>`, React 에는 `<Icon name="camera" size={20} />` (Primitives).
  - **기능 매핑** (기존 이모지 → Lucide 이름):
    - `✅` → `check-circle-2` (브랜드 체크)
    - `📷` → `camera` (영수증 촬영)
    - `📊` → `file-spreadsheet` (엑셀)
    - `📄` → `file-text` (PDF)
    - `📦` → `package` (Zip)
    - `🔍` → `sliders-horizontal` (필터)
    - `📱` → `smartphone` (앱 설치)
  - **내비게이션** (유니코드 → Lucide):
    - `←` → `arrow-left`, `→` → `arrow-right`, `↑` → `arrow-up`, `↓` → `arrow-down`
    - `×` → `x`, `+` → `plus`, 체크 → `check`, 상세 진입 → `chevron-right`
  - **도메인 보조**: `users`, `user-plus`, `link`, `copy`, `calendar`, `folder`, `receipt`, `image`, `download`, `share`, `log-out`, `settings`, `alert-circle`, `info`, `loader-2`, `pencil`, `trash-2`, `search`
  - **크기**: 라벨 옆 16 · 버튼·칩 20 (기본) · 섹션 헤더 24 · 빈 상태/모달 32.
  - **색**: `currentColor` 전제. 주요 CTA 안에서는 흰색, 보조 버튼에선 `#555`, 파괴 버튼에선 `#c33`, 칩·정보 박스에선 `#4a6bc4`.
- **SVG 인라인 예외**: Google 로그인 로고는 공식 4-색 로고 그대로 둠.
- **이모지**: 프로덕션 UI 에선 기본적으로 쓰지 않음. 단, 이메일/카피 문구, 축하 상태(예: 초대 완료 토스트) 등 장식 성격이 분명한 곳에만 선택적으로.

## UI Kits

- [`ui_kits/mobile`](./ui_kits/mobile) — 모바일 웹앱 (375px). 로그인, 대시보드, 프로젝트 상세, 내역 추가(OCR), 멤버 관리의 핵심 흐름을 클릭 가능한 프로토타입으로 재현.

## Caveats / Known gaps

- **Focus ring 미정의** — 코드베이스가 `outline: none` 를 광범위하게 쓰고 대체 포커스 스타일이 없음. a11y 관점에서 보강 권장.
- **다크모드 미지원** — `color-scheme: light` 고정. 본 디자인 시스템도 라이트만.
- **Lucide 채택** — 프로덕션 코드베이스는 여전히 이모지/유니코드를 사용 중. 본 디자인 시스템부터 Lucide 로 전환 (2026.04). 코드베이스 마이그레이션은 단계적.
- **로고 대안** (`icon-gradient.svg`, `icon-receipt.svg`, `logo-horizontal.svg`) 은 제안. 프로덕션 채택 여부는 사용자 확인 필요.
