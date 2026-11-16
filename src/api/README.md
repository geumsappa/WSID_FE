# api 폴더 사용법

화면(훅)과 백엔드 사이의 연결 통로예요. 화면 코드는 서버 주소나 fetch를 몰라도 되고, 이 폴더의 함수만 부르면 돼요.
**화면은 전부 이 폴더를 통해 서버와 통신해요** (features/*/hooks가 호출). 예전 규칙 기반 데모 함수는 mock 안에서만 쓰여요.
주소와 요청·응답 형식은 **노션 API 명세(2026-11-16 내보내기)** 기준이에요. 노션에 "설계 초안"이라 표시된 곳은 백엔드가 바꿀 수 있어요.

## 파일 역할

| 파일 | 담당 API | 화면에서 쓰는 이름 |
|---|---|---|
| `auth.ts` | AUTH-01~07 회원·인증 | `authApi` |
| `guides.ts` | GUIDE-01~04 사기 유형·대응 카드·기관 | `guidesApi` |
| `trainings.ts` | TRN-01~11 훈련, RPT-01 훈련 직후 결과 | `trainingApi` |
| `reports.ts` | RPT-02~05 저장·목록·상세·PDF | `reportsApi` |
| `solutions.ts` | SOL-01~05 피해 대응 상담 | `solutionApi` |
| `endpoints.ts` | 모든 주소 (한 곳에만 적음) | |
| `types.ts` | 요청·응답 데이터 모양 (노션 예시 그대로) | |
| `client.ts` | 공통 요청 함수 | `errorMessage`, `isStateConflict`, `newRequestId` |
| `config.ts` | 서버 주소, mock 여부, 제한 시간, CSRF 이름 | |
| `mock/` | 서버 없이 쓰는 가짜 응답 (노션 형식, 기존 데모 규칙 재사용) | |

`/internal/ai/*`(AI-01~07)는 Spring이 AI 서버를 부르는 내부 주소라 프론트에는 없어요.

## 꼭 알아야 할 네 가지

1. **로그인은 세션 쿠키 방식이에요.** 토큰을 저장하지 않아요. 서버가 쿠키를 주면 브라우저가 알아서 보내요. 새로고침 후에는 `authApi.session()`으로 로그인 상태를 확인해요.
2. **응답은 `{"success":true,"data":{...}}`로 와요.** `client.ts`가 data만 꺼내 주니까 화면에서는 data만 다루면 돼요.
3. **훈련·상담은 `stateVersion`을 주고받아요.** 응답에 온 `stateVersion`을 다음 요청에 그대로 넣어요. 어긋나면 `isStateConflict(e)`가 true이고, 그때는 `detail()`로 다시 불러와요.
4. **`requestId`는 자동으로 만들어져요.** 네트워크 오류로 같은 요청을 다시 보낼 때만 처음 값을 마지막 인자로 넘겨요.

## mock ↔ 실서버 전환

프로젝트 맨 위의 `.env.example`을 `.env.local`로 복사해서 값을 넣어요. 바꾼 뒤에는 개발 서버를 껐다 켜야 해요.

- `VITE_API_BASE_URL`이 비어 있음 → mock
- `VITE_API_BASE_URL=http://localhost:8080` → 실서버
- 주소가 있어도 `VITE_USE_MOCK=true` → mock

mock 모드에는 메일이 없어서, 회원가입 인증번호를 브라우저 개발자 도구(F12) 콘솔에 찍어 줘요.

## 화면에서 쓰는 법

```ts
import { trainingApi, errorMessage, isStateConflict } from "@/api"

const t = await trainingApi.create()
let version = t.stateVersion
try {
  const res = await trainingApi.discoveryMessage(t.trainingId, { stateVersion: version, content: "중고거래를 했어요" })
  version = res.stateVersion
  if (res.canGenerateScenario) {
    const sc = await trainingApi.scenario(t.trainingId, { stateVersion: version })
    version = sc.stateVersion
  }
} catch (e) {
  if (isStateConflict(e)) { /* trainingApi.detail()로 다시 불러오기 */ }
  setError(errorMessage(e)) // 에러 코드별 한국어 문구
}
```

## 백엔드와 아직 맞춰야 할 것

1. 에러 응답 형식: 노션에 없어서 `{success:false, error:{code,message}}`와 `{code,message}` 둘 다 읽게 해 둠
2. CSRF 토큰 전달 방식: Spring 기본값(쿠키 `XSRF-TOKEN` → 헤더 `X-XSRF-TOKEN`)으로 가정. 다르면 `config.ts`의 `CSRF`만 바꾸면 됨
3. 노션 예시가 빈 배열이라 모양을 모르는 필드: 선택지(`options`, `availableOptions`), `turnFeedback`, 가이드의 `examples`·`warningSignals`·`preventionTips`·`references`, 카드의 `actions`·`requiredMaterials`·`sourceReferences`
4. 모의 페이지 닫기 행동 코드: 노션에 "CLOSE"로만 적혀 있어 `MOCK_PAGE_CLOSE`로 가정
5. CORS: `http://localhost:8443` 허용 + `allowCredentials(true)` (쿠키를 쓰므로 필수)
