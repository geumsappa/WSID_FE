import { useEffect, useState } from "react"
import type { MockPage } from "@/api"
import { Icon } from "@/components/Icon"

// 훈련 중 사기범이 보낸 링크를 눌렀을 때 뜨는 "가짜 기관 페이지" (TRN-09·10).
// 여기서 한 행동(로그인 시도, 공식 채널 확인, 닫기)이 결과 리포트에 반영돼요. 입력값은 어디에도 보내지 않아요.
export function MockPageModal({ page, onAction, onClose }: {
  page: MockPage
  onAction: (code: "MOCK_LOGIN_ATTEMPT" | "OFFICIAL_CHANNEL_CHECK") => void
  onClose: () => void
}) {
  const [id, setId] = useState("")
  const [pw, setPw] = useState("")
  const [result, setResult] = useState<"" | "login" | "official">("")
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])
  const tryLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setId(""); setPw("") // 입력값은 즉시 버림
    setResult("login")
    onAction("MOCK_LOGIN_ATTEMPT")
  }
  const checkOfficial = () => {
    setResult("official")
    onAction("OFFICIAL_CHANNEL_CHECK")
  }
  return (
    <div role="dialog" aria-modal="true" aria-label="모의 페이지" onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.55)", display: "grid", placeItems: "center", zIndex: 1000, padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 20, width: "100%", maxWidth: 440, overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,.25)" }}>
        <div style={{ background: "#172b4d", color: "#fff", padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <strong style={{ fontSize: 15 }}>{page.institutionName}</strong>
          <button type="button" onClick={onClose} aria-label="닫기" style={{ color: "#fff", background: "transparent", border: 0, cursor: "pointer" }}><Icon name="close" size={18} /></button>
        </div>
        <div style={{ padding: 24 }}>
          <h2 style={{ margin: "0 0 6px", fontSize: 20, color: "#172b4d" }}>{page.title}</h2>
          <p style={{ margin: "0 0 18px", fontSize: 13, color: "#697586", lineHeight: 1.6 }}>본인 확인을 위해 아래 정보를 입력해 주세요.</p>
          {result === "" && <form onSubmit={tryLogin} style={{ display: "grid", gap: 10 }}>
            <input value={id} onChange={(e) => setId(e.target.value)} placeholder="아이디" autoComplete="off" style={{ height: 46, border: "1px solid #dbe5f1", borderRadius: 10, padding: "0 14px" }} />
            <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="비밀번호" autoComplete="off" style={{ height: 46, border: "1px solid #dbe5f1", borderRadius: 10, padding: "0 14px" }} />
            <button type="submit" className="primary-button" style={{ marginTop: 6 }}>로그인</button>
            <button type="button" className="outline-button" onClick={checkOfficial}><Icon name="search" size={16} /> 이 기관이 진짜인지 공식 채널로 확인하기</button>
          </form>}
          {result === "login" && <div className="auth-error" role="alert" style={{ lineHeight: 1.7 }}>
            <strong>이 페이지는 훈련용 가짜 화면이에요.</strong><br />실제 사기 페이지였다면 방금 입력한 아이디와 비밀번호가 사기범에게 전달됐을 거예요. 입력한 값은 어디에도 저장하지 않았어요. 이 행동은 결과 리포트에 반영돼요.
          </div>}
          {result === "official" && <div className="demo-code-note" role="status" style={{ lineHeight: 1.7 }}>
            <strong>잘하셨어요.</strong> 링크 속 페이지가 아니라 공식 앱이나 대표번호로 직접 확인하는 것이 가장 안전한 대응이에요. 이 행동은 결과 리포트에 반영돼요.
          </div>}
          {result !== "" && <button type="button" className="outline-button" style={{ width: "100%", marginTop: 12 }} onClick={onClose}>대화로 돌아가기</button>}
          <p style={{ margin: "14px 0 0", fontSize: 11, color: "#9aa5b4" }}>{page.isSimulation ? "교육용 모의 페이지 · 실제 기관과 무관합니다" : ""}</p>
        </div>
      </div>
    </div>
  )
}
