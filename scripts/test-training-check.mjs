import assert from "node:assert/strict"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { createServer } from "vite"

const server = await createServer({ server: { middlewareMode: true }, appType: "custom" })
try {
  const api = await server.ssrLoadModule("/src/api/index.ts")
  const { openTrainingCheck, recordPageAction } = await server.ssrLoadModule("/src/features/simulation/lib/mockPageSession.ts")
  const { TrainingCheckView } = await server.ssrLoadModule("/src/features/simulation/components/TrainingCheckView.tsx")
  const opened = []
  globalThis.window = { location: { origin: "http://localhost:8443" }, open: (...args) => opened.push(args) }
  openTrainingCheck(42)
  const [address, target, features] = opened[0]
  const url = new URL(address)
  assert.equal(url.origin, "http://localhost:8443")
  assert.equal(url.searchParams.get("trainingId"), "42")
  assert.equal(url.searchParams.get("view"), "training-check")
  assert.equal(target, "_blank")
  assert.equal(features, "noopener,noreferrer")

  const page = { templateCode: "BANK_NOTICE", title: "지원자 본인 확인", institutionName: "기업은행", screenCode: "LOGIN_CHECK", isSimulation: true }
  const html = renderToStaticMarkup(createElement(TrainingCheckView, { page, loading: false, busy: false, error: "", result: "", onAction() {} }))
  assert.match(html, /기업은행/)
  assert.match(html, /지원자 확인/)
  assert.match(html, /실제 기관과 무관합니다/)
  assert.doesNotMatch(html, /readOnly|readonly/)
  assert.equal((html.match(/<input/g) || []).length, 3)
  assert.equal((html.match(/required=""/g) || []).length, 3)
  assert.doesNotMatch(html, /type="file"|<img|<image|action="https?:/)
  assert.match(html, /이름을 입력해 주세요/)
  assert.match(html, /지원자 번호를 입력해 주세요/)
  assert.match(html, /확인 비밀번호를 입력해 주세요/)
  const order = []
  const tree = TrainingCheckView({ page, loading: false, busy: false, error: "", result: "", onAction: (kind) => order.push(kind) })
  function findForm(node) {
    if (!node || typeof node !== "object") return null
    if (node.type === "form") return node
    for (const child of [node.props?.children].flat(Infinity)) { const form = findForm(child); if (form) return form }
    return null
  }
  const form = findForm(tree)
  assert.ok(form)
  form.props.onSubmit({ preventDefault: () => order.push("prevented"), currentTarget: {
    reset: () => order.push("cleared"),
    get elements() { throw new Error("Input values must not be read for transmission") },
  } })
  assert.deepEqual(order, ["prevented", "cleared", "submitted"])

  const submittedHtml = renderToStaticMarkup(createElement(TrainingCheckView, { page, loading: false, busy: false, error: "", result: "submitted", onAction() {} }))
  assert.match(submittedHtml, /확인 요청이 접수되었습니다/)
  assert.doesNotMatch(submittedHtml, /<form|<input/)

  let version = 0
  const calls = []
  api.trainingApi.detail = async () => ({ phase: "SIMULATION", status: "ACTIVE", stateVersion: ++version })
  api.trainingApi.action = async (...args) => {
    calls.push(args)
    if (calls.length === 1) throw new api.ApiError(409, "conflict", "STATE_VERSION_CONFLICT")
    return { recorded: true, stateVersion: 3 }
  }
  const requestId = "11111111-1111-4111-8111-111111111111"
  await recordPageAction(42, "MOCK_LOGIN_ATTEMPT", page, requestId)
  assert.equal(calls.length, 2)
  assert.equal(calls[0][2], calls[1][2])
  assert.deepEqual(calls[1][1], { stateVersion: 2, actionCode: "MOCK_LOGIN_ATTEMPT", actionMeta: { templateCode: "BANK_NOTICE", screenCode: "LOGIN_CHECK" } })
  assert.doesNotMatch(JSON.stringify(calls), /password|지원자 이름|TRAINING-APPLICANT/)

  api.trainingApi.detail = async () => ({ phase: "SIMULATION", status: "ACTIVE", stateVersion: 4, mockPageSubmitted: true })
  let repeated = false
  api.trainingApi.action = async () => { repeated = true }
  await recordPageAction(42, "MOCK_LOGIN_ATTEMPT", page, requestId)
  assert.equal(repeated, false)
  api.trainingApi.action = async () => { throw new api.ApiError(409, "duplicate", "DUPLICATE_REQUEST") }
  await recordPageAction(42, "MOCK_PAGE_OPEN", page, requestId)
  api.trainingApi.detail = async () => ({ phase: "RESULT", status: "COMPLETED", stateVersion: 5 })
  let called = false
  api.trainingApi.action = async () => { called = true }
  await assert.rejects(() => recordPageAction(42, "MOCK_LOGIN_ATTEMPT", page, requestId))
  assert.equal(called, false)
  console.log("PASS: same-origin new tab, applicant UI, no credential/file upload, version conflict retry, duplicate open, completed session rejection")
} finally {
  delete globalThis.window
  await server.close()
}
