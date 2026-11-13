## 로컬 실행 방법

**1. 프로젝트 클론**
```bash
git clone https://github.com/geumsappa/WSID_FE
cd WSID_FE-main
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

## 파일구조
src/
├─ main.tsx                         # (그대로) 앱 시작점
├─ index.css                        # (그대로) 전체 스타일
├─ App.tsx                          # 화면 조립: 훅 5개 호출 + 페이지별 렌더링 + 로그인 팝업·로그아웃
│
├─ types/
│  └─ common.ts                     # Page, IconName, UploadedImage
│
├─ lib/                             # 여러 기능이 같이 쓰는 순수 함수
│  ├─ storage.ts                    # readStore (localStorage 읽기)
│  ├─ date.ts                       # formatDate
│  ├─ privacy.ts                    # 개인정보 정규식, scrubPersonalInfo, maskSensitive
│  └─ image.ts                      # 사진 첨부 제한 상수, loadEvidence
│
├─ hooks/
│  └─ usePageNavigation.ts          # page 상태, go(), 뒤로 가기 처리, 모바일 메뉴
│
├─ components/                      # 공용 UI
│  ├─ Icon.tsx                      # SVG 아이콘 20종
│  ├─ Logo.tsx
│  ├─ ConfirmModal.tsx              # 확인/취소 팝업
│  ├─ EvidenceGallery.tsx           # 첨부 사진 썸네일 + 확대 보기
│  ├─ PageIntro.tsx                 # 페이지 상단 제목 영역
│  ├─ Typing.tsx                    # "입력 중" 점 3개
│  └─ layout/
│     ├─ Header.tsx                 # 상단 내비게이션
│     └─ Footer.tsx
│
└─ features/
   ├─ home/
   │  └─ HomePage.tsx               # 홈 화면 (시작 버튼 2개 + 이어서 하기)
   │
   ├─ simulation/
   │  ├─ types.ts                   # SimStage, Scenario, SimulationMessage, SimProgress, SimulationProps 등
   │  ├─ components/
   │  │  ├─ SimulationPage.tsx      # 훈련 방법 선택 → 카테고리 선택 → 상황 3가지 선택
   │  │  ├─ ExperienceInterview.tsx # "내 경험으로 훈련하기" 3문항 인터뷰
   │  │  └─ SimulationChat.tsx      # 가상 대화 화면
   │  ├─ data/
   │  │  └─ scenarios.ts            # situations, scenarios, everydayCategories, everydayTemplates
   │  ├─ lib/
   │  │  ├─ scenarioFactory.ts      # 시나리오 추천 규칙, interviewQuestion  ← AI 교체 대상
   │  │  ├─ demoReply.ts            # createDemoReply, hasSafeEnding          ← AI 교체 대상
   │  │  ├─ progressStorage.ts      # 이어하기 저장·복구·삭제, countImages
   │  │  └─ constants.ts            # OCR_DEMO_NOTICE 문구
   │  └─ hooks/
   │     └─ useSimulation.ts        # 시뮬레이션 상태 전부 + 시나리오 생성·대화 전송·초기화·이어하기
   │
   ├─ emergency/
   │  ├─ types.ts                   # EmergencyKey, AssistantMessage, OrganizationKey
   │  ├─ components/
   │  │  ├─ EmergencyPage.tsx       # 상황 카드 6개 + 직접 입력·사진 첨부
   │  │  └─ EmergencyChat.tsx       # 분석 결과 카드, 계좌·전화 조회, 대응 단계, 기관 목록, 후속 대화
   │  ├─ data/
   │  │  ├─ emergencyData.ts        # 상황 7종의 제목·안내문·대응 단계
   │  │  └─ organizations.ts        # 112, 사이버범죄 신고, 금감원, KISA 118
   │  ├─ lib/
   │  │  └─ detectEmergency.ts      # 입력 글에서 상황 분류하는 규칙        ← AI 교체 대상
   │  └─ hooks/
   │     └─ useEmergency.ts         # 긴급 대응 상태 + 분석·채팅 열기·메시지 전송
   │
   ├─ report/
   │  ├─ types.ts                   # ConversationAnalysis
   │  ├─ components/
   │  │  └─ ReportPage.tsx          # 점수, 잘한/주의/놓친 항목, 예방 안내
   │  └─ lib/
   │     └─ analyzeConversation.ts  # 대화 점수 계산 규칙                    ← AI 교체 대상
   │
   ├─ auth/
   │  ├─ types.ts                   # DemoAccount
   │  ├─ components/
   │  │  ├─ AuthPage.tsx            # 로그인·회원가입 폼
   │  │  └─ AuthGate.tsx            # "로그인이 필요해요" 안내 화면
   │  ├─ lib/
   │  │  └─ demoAuth.ts             # 계정 저장 키, hashDemoPassword         ← Spring AUTH 교체 대상
   │  └─ hooks/
   │     └─ useAuth.ts              # 로그인 계정, 로그인/로그아웃, 로그인 후 돌아갈 페이지
   │
   └─ mypage/
      ├─ types.ts                   # SavedReport, SavedConversation
      ├─ components/
      │  └─ MyPage.tsx              # 프로필, 저장한 리포트·대화 목록과 상세
      └─ hooks/
         └─ useSavedRecords.ts      # 리포트·긴급대응 대화 저장/삭제       ← 백엔드 교체 대상
