// 백엔드 주소 목록. 노션 API 명세(2026-11-16 내보내기) 기준.
// /internal/ai/* (AI-01~07)는 Spring이 AI 서버를 부를 때 쓰는 내부 주소라 프론트에는 없어요.

export const ENDPOINTS = {
  auth: {
    signup: "/api/auth/signup", // AUTH-01 회원가입 + 인증 메일 발송
    resendEmailCode: "/api/auth/email/resend", // AUTH-02 이메일 인증번호 재발송
    verifyEmail: "/api/auth/email/verify", // AUTH-03 이메일 인증 완료
    login: "/api/auth/login", // AUTH-04 로그인 (세션 쿠키 발급)
    session: "/api/auth/session", // AUTH-05 로그인 세션 확인
    logout: "/api/auth/logout", // AUTH-06 로그아웃
    csrf: "/api/auth/csrf", // AUTH-06 CSRF 토큰 발급 (로그아웃·리포트 저장 전에 호출)
    me: "/api/users/me", // AUTH-07 내 회원정보 조회
  },
  guides: {
    fraudTypes: "/api/guides/fraud-types", // GUIDE-01 사기 유형 목록
    fraudType: (code: string) => `/api/guides/fraud-types/${encodeURIComponent(code)}`, // GUIDE-02 사기 유형 상세
    responseCards: "/api/guides/response-cards", // GUIDE-03 피해 대응 카드 (?codes=A,B)
    institutions: "/api/guides/institutions", // GUIDE-04 공식 기관 안내
  },
  trainings: {
    create: "/api/trainings", // TRN-01 새 훈련 생성
    active: "/api/trainings/active", // TRN-02 진행 중 훈련 조회
    detail: (trainingId: number) => `/api/trainings/${trainingId}`, // TRN-03 훈련 상태·대화 복원
    discoveryMessages: (trainingId: number) => `/api/trainings/${trainingId}/discovery/messages`, // TRN-04 상황 파악 AI 대화
    discoveryImages: (trainingId: number) => `/api/trainings/${trainingId}/discovery/images`, // TRN-05 이미지 첨부·OCR
    scenario: (trainingId: number) => `/api/trainings/${trainingId}/scenario`, // TRN-06 개인화 시나리오 생성
    start: (trainingId: number) => `/api/trainings/${trainingId}/start`, // TRN-07 가상 훈련 시작
    messages: (trainingId: number) => `/api/trainings/${trainingId}/messages`, // TRN-08 AI 훈련 메시지
    mockPage: (trainingId: number) => `/api/trainings/${trainingId}/mock-page`, // TRN-09 모의 페이지 조회
    actions: (trainingId: number) => `/api/trainings/${trainingId}/actions`, // TRN-10 모의 페이지 행동 기록
    finish: (trainingId: number) => `/api/trainings/${trainingId}/finish`, // TRN-11 훈련 종료 및 리포트 생성
    report: (trainingId: number) => `/api/trainings/${trainingId}/report`, // RPT-01 훈련 직후 결과 조회
  },
  reports: {
    save: (reportId: number) => `/api/reports/${reportId}/save`, // RPT-02 내 리포트에 저장 ({id}=reportId)
    list: "/api/reports", // RPT-03 저장된 리포트 목록 (?size=10&cursor=)
    detail: (reportId: number) => `/api/reports/${reportId}`, // RPT-04 리포트 상세 조회
    pdf: (reportId: number) => `/api/reports/${reportId}/pdf`, // RPT-05 리포트 PDF 다운로드
  },
  solutions: {
    start: "/api/solutions/sessions", // SOL-01 피해 대응 상담 시작 (POST)
    list: "/api/solutions/sessions", // SOL-06(가안) 내가 마친 상담 목록 (GET, 로그인 필요, ?size=10&cursor=)
    detail: (solutionId: number) => `/api/solutions/sessions/${solutionId}`, // SOL-02 피해 대응 상담 복원
    messages: (solutionId: number) => `/api/solutions/sessions/${solutionId}/messages`, // SOL-03 피해 대응 상담 메시지
    facts: (solutionId: number) => `/api/solutions/sessions/${solutionId}/facts`, // SOL-04 피해 사실 수정 (PATCH)
    complete: (solutionId: number) => `/api/solutions/sessions/${solutionId}/complete`, // SOL-05 피해 대응 상담 종료
    csrf: "/api/solutions/csrf", // 긴급대응용 CSRF 토큰 (비회원도 받을 수 있음. /api/auth/csrf는 로그인 필요)
  },
} as const
