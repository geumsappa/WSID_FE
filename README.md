# 어떡하지 (WSID) — 프론트엔드

AI 기반 금융사기 시뮬레이션 및 피해 대응 플랫폼 '어떡하지'의 React 프론트엔드입니다.

- 기술: React 19, TypeScript, Vite, Tailwind CSS v4
- 백엔드: Spring Boot (세션 쿠키 로그인) → AI 서버(FastAPI)

## 로컬 실행 방법

**1. 프로젝트 클론**
```bash
git clone https://github.com/geumsappa/WSID_FE
cd WSID_FE
```

**2. 패키지 설치**
```bash
npm install
```

**3. 개발 서버 실행**
```bash
npm run dev
```

**4. 브라우저 접속**

http://localhost:8443/

> Node.js 20.19+ 또는 22.12+ 필요  
> 모든 명령어는 `package.json`이 있는 폴더에서 실행하세요.

## 백엔드 연결 (mock ↔ 실서버)

서버 없이도 화면을 확인할 수 있도록 mock(가짜 응답) 모드가 기본입니다.
실서버에 붙이려면 `.env.example`을 복사해 `.env.local`을 만들고 주소를 넣으세요.

```bash
copy .env.example .env.local
```

```env
VITE_API_BASE_URL=http://localhost:8080
VITE_USE_MOCK=false
```

| 설정 | 동작 |
|---|---|
| `VITE_API_BASE_URL` 비어 있음 | mock 모드 |
| `VITE_API_BASE_URL` 입력 | 실서버(Spring) 호출 |
| 주소가 있어도 `VITE_USE_MOCK=true` | mock 모드 |

> 값을 바꾼 뒤에는 개발 서버를 껐다 켜야 반영됩니다.  
> `.env.local`은 git에 올라가지 않습니다.  
> Spring에서는 CORS로 `http://localhost:8443`과 `allowCredentials(true)`를 허용해야 합니다.

API 함수 사용법과 백엔드와 맞춰야 할 항목은 [`src/api/README.md`](src/api/README.md)에 있습니다.

## 폴더 구조

```text
src/
├─ main.tsx                    # 앱 시작점
├─ App.tsx                     # 화면 조립 (훅 호출 + 페이지별 렌더링)
├─ index.css                   # 전체 스타일
│
├─ api/                        # 백엔드 연결 (노션 API 명세 기준)
│  ├─ auth.ts                  #   AUTH-01~07 회원·인증
│  ├─ guides.ts                #   GUIDE-01~04 사기 유형·대응 카드·기관
│  ├─ trainings.ts             #   TRN-01~11 훈련, RPT-01 결과 조회
│  ├─ reports.ts               #   RPT-02~05 리포트 저장·목록·PDF
│  ├─ solutions.ts             #   SOL-01~05 피해 대응 상담
│  ├─ endpoints.ts             #   모든 API 주소
│  ├─ types.ts                 #   요청·응답 데이터 모양
│  ├─ client.ts                #   공통 요청 함수 (쿠키·CSRF·에러 처리)
│  ├─ config.ts                #   서버 주소, mock 여부, 제한 시간
│  └─ mock/                    #   서버 없이 쓰는 가짜 응답
│
├─ types/common.ts             # 공용 타입
├─ lib/                        # 공용 순수 함수 (개인정보 가림, 이미지, 저장소, 날짜)
├─ hooks/usePageNavigation.ts  # 페이지 이동·뒤로 가기
│
├─ components/                 # 공용 UI
│  ├─ Icon.tsx, Logo.tsx, ConfirmModal.tsx
│  ├─ EvidenceGallery.tsx, PageIntro.tsx, Typing.tsx
│  └─ layout/                  #   Header, Footer
│
└─ features/                   # 기능별 화면·상태·로직
   ├─ home/                    #   홈
   ├─ simulation/              #   금융사기 시뮬레이션 (훈련)
   ├─ emergency/               #   긴급(피해) 대응
   ├─ report/                  #   결과 리포트
   ├─ auth/                    #   로그인·회원가입
   └─ mypage/                  #   마이페이지
```

각 기능 폴더 안은 같은 규칙으로 나뉩니다.

| 폴더·파일 | 들어가는 것 |
|---|---|
| `components/` | 화면 (JSX) |
| `hooks/` | 상태(useState)와 상태를 바꾸는 함수 |
| `lib/` | React와 무관한 계산·규칙 함수 |
| `data/` | 고정 문구·목록 데이터 |
| `types.ts` | 그 기능의 타입 |

## 현재 상태

- `src/api`는 노션 API 명세에 맞춰 준비돼 있습니다.
- 화면(`features/`)은 아직 규칙 기반 데모 로직을 사용합니다. 화면을 `src/api`에 연결하는 작업이 남아 있습니다.
