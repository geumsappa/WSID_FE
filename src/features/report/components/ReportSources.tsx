import type { ReportSource } from "@/api"

function safeLink(value: string): string | undefined {
  try {
    const url = new URL(value)
    if (url.protocol !== "https:" || url.username || url.password) return undefined
    return url.href
  } catch { return undefined }
}

/** Both the immediate result and saved report use the persisted credits. */
export function ReportSources({ sources }: { sources?: ReportSource[] }) {
  const seen = new Set<string>()
  const credits = (sources ?? []).filter(source => {
    if (source.license !== "KOGL-1" || !source.title?.trim() || !source.issuer?.trim() || !source.sourceUrl || seen.has(source.sourceUrl)) return false
    seen.add(source.sourceUrl)
    return true
  })
  if (!credits.length) return null
  return <section className="guide-card" style={{ marginTop: 20 }} aria-label="참고한 실제 사기 수법">
    <div className="section-heading left"><span>훈련 시나리오 참고 자료</span><h2>참고한 실제 사기 수법</h2></div>
    <ul className="space-y-5" style={{ listStyle: "none", padding: 0 }}>
      {credits.map(source => {
        const href = safeLink(source.sourceUrl)
        return <li key={source.sourceUrl} style={{ overflowWrap: "anywhere" }}>
          <p className="text-sm text-slate-500">{source.issuer}{source.author && <> · 작성자 {source.author}</>}{source.publishedDate && <> · {source.publishedDate.replace(/-/g, ".")}</>}</p>
          <p className="font-semibold" style={{ marginTop: 5 }}>{source.title}</p>
          {href && <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700" style={{ marginTop: 7 }}>원문 보기 <span aria-hidden="true">↗</span><span className="sr-only"> (새 탭)</span></a>}
        </li>
      })}
    </ul>
    <p className="text-sm text-slate-500" style={{ marginTop: 20, lineHeight: 1.8 }}>공공누리 제1유형 자료의 수법을 참고해 요약·재구성했으며, 원기관이 제작·후원한 자료가 아닙니다.</p>
  </section>
}
