import { useEffect, useRef, useState } from "react"
import { errorMessage, trainingApi } from "@/api"
import type { MockPage } from "@/api"
import { TrainingCheckView } from "./TrainingCheckView"
import { recordPageAction } from "../lib/mockPageSession"

/** Standalone, authenticated local page. It never accepts or transmits credentials or files. */
export function TrainingCheckPage() {
  const [page, setPage] = useState<MockPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [result, setResult] = useState<"" | "submitted" | "official" | "closed">("")
  const openRequest = useRef(crypto.randomUUID())
  const submitRequest = useRef(crypto.randomUUID())
  const officialRequest = useRef(crypto.randomUUID())
  const closeRequest = useRef(crypto.randomUUID())
  const trainingId = Number(new URLSearchParams(window.location.search).get("trainingId"))
  const validId = Number.isSafeInteger(trainingId) && trainingId > 0
  const title = "지원자 확인"

  useEffect(() => {
    let cancelled = false
    if (!validId) { setError("훈련 링크가 올바르지 않습니다."); setLoading(false); return }
    void (async () => {
      try {
        const info = await trainingApi.mockPage(trainingId)
        if (!info.isSimulation) throw new Error("훈련용 화면만 열 수 있습니다.")
        await recordPageAction(trainingId, "MOCK_PAGE_OPEN", info, openRequest.current)
        const detail = await trainingApi.detail(trainingId)
        if (!cancelled) {
          setPage(info)
          if (detail.mockPageSubmitted) setResult("submitted")
        }
      } catch (cause) { if (!cancelled) setError(errorMessage(cause)) }
      finally { if (!cancelled) setLoading(false) }
    })()
    return () => { cancelled = true }
  }, [trainingId, validId])

  useEffect(() => {
    document.title = `${page?.institutionName ? page.institutionName + " | " : ""}${title} · 훈련용`
    const meta = document.createElement("meta")
    meta.name = "robots"; meta.content = "noindex,nofollow"
    document.head.appendChild(meta)
    return () => { meta.remove() }
  }, [page, title])

  const act = async (kind: "submitted" | "official" | "closed") => {
    if (!page || busy) return
    setBusy(true); setError("")
    try {
      const code = kind === "submitted" ? "MOCK_LOGIN_ATTEMPT" : kind === "official" ? "OFFICIAL_CHANNEL_CHECK" : "MOCK_PAGE_CLOSE"
      const requestId = kind === "submitted" ? submitRequest.current : kind === "official" ? officialRequest.current : closeRequest.current
      await recordPageAction(trainingId, code, page, requestId)
      setResult(kind)
      if (kind === "closed") window.close()
    } catch (cause) { setError(errorMessage(cause)) }
    finally { setBusy(false) }
  }

  return <TrainingCheckView page={page} loading={loading} busy={busy} error={error} result={result}
    onAction={(kind) => void act(kind)} />
}
