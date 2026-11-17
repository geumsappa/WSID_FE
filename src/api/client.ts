// 모든 서버 요청이 지나가는 공통 함수.
// 하는 일: 주소 붙이기 → 세션 쿠키 함께 보내기 → CSRF 헤더 붙이기 → JSON 변환
//          → {success, data}에서 data만 꺼내기 → 시간 초과 처리 → 에러를 ApiError로 통일
// 로그인은 세션 쿠키 방식이라 토큰을 따로 보관하거나 Authorization 헤더를 붙이지 않아요 (노션 AUTH-04).

import { API_BASE_URL, CSRF, TIMEOUT } from "./config"
import type { ApiEnvelope } from "./types"
import { ENDPOINTS } from "./endpoints"

export class ApiError extends Error {
  status: number
  /** 백엔드 에러 코드. 예: STATE_VERSION_CONFLICT, INVALID_CREDENTIALS */
  code?: string
  constructor(status: number, message: string, code?: string) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.code = code
  }
}

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
  body?: unknown
  /** 쿼리 문자열. 값이 undefined·null이면 빠져요 */
  query?: Record<string, string | number | undefined | null>
  timeoutMs?: number
  /** "blob"이면 파일(PDF 등)로 받음 */
  responseType?: "json" | "blob"
  /** true면 요청 전에 GET /api/auth/csrf로 토큰을 받아 헤더에 붙여요 (AUTH-06: 로그아웃·리포트 저장) */
  csrf?: boolean
}

/** 중복 처리 방지용 요청 ID. 같은 요청을 다시 보낼 때는 같은 값을 쓰세요 (노션: requestId) */
export const newRequestId = () => crypto.randomUUID()

function readCookie(name: string) {
  try {
    const hit = document.cookie.split("; ").find((c) => c.startsWith(`${name}=`))
    return hit ? decodeURIComponent(hit.slice(name.length + 1)) : null
  } catch {
    return null
  }
}

/** 백엔드에서 CSRF 토큰을 받아 { [headerName]: token } 형태로 돌려줌 */
async function fetchCsrfHeader(): Promise<Record<string, string>> {
  const { headerName, token } = await request<{ headerName: string; token: string }>(ENDPOINTS.auth.csrf)
  return { [headerName]: token }
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, query, timeoutMs = TIMEOUT.default, responseType = "json" } = options
  const isForm = body instanceof FormData // 이미지 업로드: 브라우저가 Content-Type을 알아서 붙임
  const headers: Record<string, string> = {}
  if (responseType === "json") headers.Accept = "application/json"
  if (body !== undefined && !isForm) headers["Content-Type"] = "application/json"
  if (method !== "GET") {
    const csrf = readCookie(CSRF.cookieName)
    if (csrf) headers[CSRF.headerName] = csrf
  }
  if (options.csrf) Object.assign(headers, await fetchCsrfHeader())
  const qs = query
    ? Object.entries(query).filter(([, v]) => v !== undefined && v !== null).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join("&")
    : ""

  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), timeoutMs)
  let res: Response
  try {
    res = await fetch(`${API_BASE_URL}${path}${qs ? `?${qs}` : ""}`, {
      method,
      headers,
      body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
      credentials: "include", // 세션 쿠키(SESSION/JSESSIONID)를 함께 보냄
      signal: controller.signal,
    })
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw new ApiError(0, "응답이 늦어지고 있어요. 잠시 후 다시 시도해 주세요.", "TIMEOUT")
    throw new ApiError(0, "서버에 연결하지 못했어요. 서버가 켜져 있는지 확인해 주세요.", "NETWORK")
  } finally {
    window.clearTimeout(timer)
  }

  if (!res.ok) throw await toApiError(res)
  if (res.status === 204) return undefined as T
  if (responseType === "blob") return (await res.blob()) as T
  const text = await res.text()
  if (!text) return undefined as T
  const json = JSON.parse(text) as ApiEnvelope<T> | T
  // {"success":true,"data":{...}} → data만 돌려줌
  if (json && typeof json === "object" && "success" in json) {
    const env = json as ApiEnvelope<T>
    if (!env.success) throw new ApiError(res.status, messageFor(env.error?.code, env.error?.message, res.status), env.error?.code)
    return env.data
  }
  return json as T
}

/** 노션 명세에 나온 에러 코드별 화면 문구. 백엔드가 message를 주면 그걸 먼저 써요. */
const CODE_MESSAGES: Record<string, string> = {
  EMAIL_ALREADY_EXISTS: "이미 가입된 이메일이에요. 로그인해 주세요.",
  RATE_LIMIT_EXCEEDED: "요청이 너무 많아요. 잠시 후 다시 시도해 주세요.",
  VERIFICATION_CODE_EXPIRED: "인증번호가 만료됐어요. 다시 받아 주세요.",
  INVALID_VERIFICATION_CODE: "인증번호가 일치하지 않아요.",
  INVALID_CREDENTIALS: "이메일 또는 비밀번호를 확인해 주세요.",
  EMAIL_NOT_VERIFIED: "이메일 인증을 완료한 뒤 로그인해 주세요.",
  GUIDE_NOT_FOUND: "사기 유형 정보를 찾을 수 없어요.",
  TRAINING_NOT_FOUND: "훈련을 찾을 수 없어요. 처음부터 다시 시작해 주세요.",
  SENSITIVE_DATA_DETECTED: "개인정보가 포함되어 있어요. 해당 부분을 빼고 다시 입력해 주세요.",
  STATE_VERSION_CONFLICT: "다른 화면에서 진행 상태가 바뀌었어요. 새로고침 후 다시 시도해 주세요.",
  FILE_TOO_LARGE: "사진 한 장은 5MB 이하여야 해요.",
  OCR_FAILED: "사진 속 글자를 읽지 못했어요. 내용을 직접 입력해 주세요.",
  INVALID_TRAINING_PHASE: "지금 단계에서는 할 수 없는 요청이에요.",
  AI_SERVICE_UNAVAILABLE: "AI 응답을 받지 못했어요. 잠시 후 다시 시도해 주세요.",
  AI_RATE_LIMIT_EXCEEDED: "AI 요청이 많아요. 잠시 후 다시 시도해 주세요.",
  REPORT_NOT_FOUND: "리포트를 찾을 수 없어요.",
  SOLUTION_NOT_FOUND: "상담 기록을 찾을 수 없어요. 새로 시작해 주세요.",
  TOKEN_EXPIRED: "로그인이 만료됐어요. 다시 로그인해 주세요.",
}
const STATUS_MESSAGES: Record<number, string> = {
  400: "입력한 내용을 다시 확인해 주세요.",
  401: "로그인이 필요해요.",
  403: "접근 권한이 없어요.",
  404: "요청한 정보를 찾을 수 없어요.",
  409: "이미 처리됐거나 상태가 바뀐 요청이에요. 새로고침 후 다시 시도해 주세요.",
  413: "파일이 너무 커요.",
  429: "요청이 너무 많아요. 잠시 후 다시 시도해 주세요.",
}
function messageFor(code: string | undefined, message: string | undefined, status: number) {
  return message || (code && CODE_MESSAGES[code]) || STATUS_MESSAGES[status] || "잠시 후 다시 시도해 주세요."
}

/** 에러 응답 형식이 노션에 없어서 {success:false,error:{code,message}}와 {code,message} 둘 다 읽어요 */
async function toApiError(res: Response): Promise<ApiError> {
  let body: { code?: string; message?: string; error?: { code?: string; message?: string } } = {}
  try { body = await res.json() } catch { /* JSON이 아닌 에러 응답 */ }
  const code = body.error?.code ?? body.code
  return new ApiError(res.status, messageFor(code, body.error?.message ?? body.message, res.status), code)
}

/** 화면에 보여 줄 에러 문구 꺼내기: catch (e) { setError(errorMessage(e)) } */
export function errorMessage(err: unknown) {
  return err instanceof ApiError ? err.message : "알 수 없는 오류가 발생했어요."
}

/** stateVersion이 어긋났는지 (다른 탭에서 진행됐을 때). true면 detail로 다시 불러오세요 */
export const isStateConflict = (err: unknown) => err instanceof ApiError && err.code === "STATE_VERSION_CONFLICT"

/** 에러 코드로 ApiError 만들기 (mock에서 서버 에러를 흉내 낼 때 사용) */
export const errorFromCode = (status: number, code: string) => new ApiError(status, messageFor(code, undefined, status), code)