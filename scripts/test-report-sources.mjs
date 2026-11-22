import assert from "node:assert/strict"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { createServer } from "vite"

const server = await createServer({ server: { middlewareMode: true }, appType: "custom" })
try {
  const { ReportSources } = await server.ssrLoadModule("/src/features/report/components/ReportSources.tsx")
  const { EvaluationView } = await server.ssrLoadModule("/src/features/report/components/EvaluationView.tsx")
  const source = { title: "테스트용 사기 예방 자료", issuer: "자료 발행기관", author: "작성자", publishedDate: "2025-05-22", sourceUrl: "https://www.korea.kr/news/policyNewsView.do?newsId=123", license: "KOGL-1" }
  const render = sources => renderToStaticMarkup(createElement(ReportSources, { sources }))
  assert.equal(render(undefined), "")
  assert.equal(render([]), "")
  const html = render([source, source])
  assert.equal((html.match(/<li /g) ?? []).length, 1)
  assert.match(html, /자료 발행기관/)
  assert.match(html, /작성자/)
  assert.match(html, /2025.05.22/)
  assert.match(html, /공공누리 제1유형/)
  assert.match(html, /요약·재구성/)
  assert.match(html, /원기관이 제작·후원한 훈련이 아닙니다/)
  assert.match(html, /target="_blank" rel="noopener noreferrer"/)
  const unsafe = render([{ ...source, sourceUrl: "javascript:alert(1)", title: "<script>example</script>" }])
  assert.doesNotMatch(unsafe, /href=|<script>/)
  assert.match(unsafe, /&lt;script&gt;/)
  assert.equal(render([{ ...source, license: "KOGL-4" }]), "")
  const evaluation = { overallFeedback: "테스트 평가", recommendations: [], turnFeedback: [], sources: [source] }
  for (const compact of [false, true]) {
    const view = renderToStaticMarkup(createElement(EvaluationView, { evaluation, compact }))
    assert.match(view, /참고한 실제 사기 수법/)
    assert.match(view, /원문 보기/)
  }
  const { ReportSheet } = await server.ssrLoadModule("/src/features/report/components/ReportSheet.tsx")
  const sheet = renderToStaticMarkup(createElement(ReportSheet, { title: "결과 리포트", evaluation, completedAt: "2026-11-22" }))
  assert.match(sheet, /참고한 실제 사기 수법/)
  assert.match(sheet, /report-sheet--sources/)
  assert.match(sheet, /원문 보기/)
  console.log("PASS: actual credits, immediate/saved report, legacy empty state, deduplication, safe links, escaped text")
} finally { await server.close() }
