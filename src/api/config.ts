// API 연결 설정. 값은 프로젝트 맨 위 폴더의 .env.local 파일에서 바꿉니다(.env.example 참고).
// Vite에서는 VITE_ 로 시작하는 환경변수만 프론트 코드에서 읽을 수 있어요.

/** 백엔드 주소. 예: http://localhost:8080 (Spring). 비어 있으면 mock 모드로 동작합니다. */
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "")

/** true면 서버를 부르지 않고 api/mock 의 데모 응답을 돌려줍니다. 주소가 없으면 자동으로 true. */
export const USE_MOCK = import.meta.env.VITE_USE_MOCK === "true" || !API_BASE_URL

/** 요청별 제한 시간(ms). 구조 문서 7장: AI 대화 25초, 시나리오 생성 60초 */
export const TIMEOUT = {
  default: 15_000,
  aiTurn: 25_000,
  scenario: 60_000,
}

/**
 * CSRF 토큰 전달 방식 (노션 명세: "상태 변경 API는 CSRF 보호 필수, 토큰 전달 방식은 팀 합의").
 * 아래는 Spring Security 기본값(CookieCsrfTokenRepository)에 맞춘 가안이에요.
 * 이 쿠키가 있으면 GET이 아닌 요청에 같은 값을 헤더로 붙여 보내요. 팀에서 다르게 정하면 이름만 바꾸면 돼요.
 */
export const CSRF = {
  cookieName: "XSRF-TOKEN",
  headerName: "X-XSRF-TOKEN",
}
