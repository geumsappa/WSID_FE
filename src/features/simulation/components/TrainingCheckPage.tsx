import { useEffect, useRef, useState } from "react"
import { errorMessage, trainingApi } from "@/api"
import type { MockPage } from "@/api"
import { TrainingCheckView } from "./TrainingCheckView"
import { recordPageAction } from "../lib/mockPageSession"
import { resolveMockTemplate } from "../data/mockPageTemplates"

/**
 * Standalone, authenticated local page. It never accepts or transmits credentials or files.
 * 대화 화면 위 창(모달)으로 열 때는 trainingId와 onClose를 넘겨요. 없으면 예전처럼 별도 탭 주소에서 번호를 읽어요.
 */
export function TrainingCheckPage({ trainingId: givenId, onClose }: { trainingId?: number; onClose?: () => void } = {}) {
  const embedded = givenId !== undefined
  const [page, setPage] = useState<MockPage | null>(null)
  const [scenarioTitle, setScenarioTitle] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [result, setResult] = useState<"" | "submitted" | "official" | "closed">("")
  const openRequest = useRef(crypto.randomUUID())
  const submitRequest = useRef(crypto.randomUUID())
  const officialRequest = useRef(crypto.randomUUID())
  const closeRequest = useRef(crypto.randomUUID())
  const trainingId = givenId ?? Number(new URLSearchParams(window.location.search).get("trainingId"))
  const validId = Number.isSafeInteger(trainingId) && trainingId > 0
  // templateCode(없으면 기관 이름·시나리오 제목)로 화면 종류를 골라요
  const template = resolveMockTemplate(page, scenarioTitle)
  const title = template.title

  useEffect(() => {
    let cancelled = false
    if (!validId) { setError("잘못된 접근입니다."); setLoading(false); return }
    void (async () => {
      try {
        const info = await trainingApi.mockPage(trainingId)
        if (!info.isSimulation) throw new Error("페이지를 찾을 수 없습니다.")
        await recordPageAction(trainingId, "MOCK_PAGE_OPEN", info, openRequest.current)
        const detail = await trainingApi.detail(trainingId)
        if (!cancelled) {
          setPage(info)
          setScenarioTitle(detail.scenario?.title ?? null)
          if (detail.mockPageSubmitted) setResult("submitted")
        }
      } catch (cause) { if (!cancelled) setError(errorMessage(cause)) }
      finally { if (!cancelled) setLoading(false) }
    })()
    return () => { cancelled = true }
  }, [trainingId, validId])

  useEffect(() => {
    if (embedded) return // 창으로 열 때는 대화 화면의 탭 제목을 바꾸지 않아요
    document.title = `${page?.institutionName ? page.institutionName + " | " : ""}${title} · 어떡하지`
    const meta = document.createElement("meta")
    meta.name = "robots"; meta.content = "noindex,nofollow"
    document.head.appendChild(meta)
    return () => { meta.remove() }
  }, [page, title, embedded])

  const act = async (kind: "submitted" | "official" | "closed", filled: string[] = []) => {
    if (busy) return
    if (!page) { if (kind === "closed") { if (onClose) onClose(); else window.close() } return }
    setBusy(true); setError("")
    try {
      const code = kind === "submitted" ? "MOCK_LOGIN_ATTEMPT" : kind === "official" ? "OFFICIAL_CHANNEL_CHECK" : "MOCK_PAGE_CLOSE"
      const requestId = kind === "submitted" ? submitRequest.current : kind === "official" ? officialRequest.current : closeRequest.current
      await recordPageAction(trainingId, code, page, requestId, kind === "submitted" ? filled : undefined)
      setResult(kind)
      if (kind === "closed") { if (onClose) onClose(); else window.close() }
    } catch (cause) { setError(errorMessage(cause)) }
    finally { setBusy(false) }
  }

  const view = <TrainingCheckView page={page} template={template} loading={loading} busy={busy} error={error} result={result}
    onAction={(kind, filled) => void act(kind, filled)} />
  return embedded ? view : <div className="msite-standalone">{view}</div>
}
