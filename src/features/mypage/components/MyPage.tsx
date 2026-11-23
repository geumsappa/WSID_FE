import { useState } from "react"
import { USE_MOCK } from "@/api"
import { ConfirmModal } from "@/components/ConfirmModal"
import { Icon } from "@/components/Icon"
import { displayName, type Account } from "@/features/auth/types"
import { ReportSheet } from "@/features/report/components/ReportSheet"
import { TurnReview } from "@/features/report/components/TurnReview"
import { printAsPdf } from "@/lib/print"
import type { SavedReports } from "../hooks/useSavedReports"
import type { SolutionHistory, SolutionRecord } from "../hooks/useSolutionHistory"
import { situationGuides } from "@/features/emergency/data/situationGuides"
import { organizationData } from "@/features/emergency/data/organizations"
import { toTextItems } from "@/lib/normalize"

const bubble = (mine: boolean) => ({ justifySelf: mine ? "end" : "start", maxWidth: "85%", padding: "10px 14px", borderRadius: 14, background: mine ? "#1d6fe0" : "#f3f6fb", color: mine ? "#fff" : "#1f2937", fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap" } as const)

/** 기록 보기에서 대화 사이에 넣는 '그때 안내받은 대응 방법' 말풍선 (유형 고정 안내 또는 서버 대응 카드) */
function PlanBubble({ d }: { d: SolutionRecord }) {
  const g = d.situation ? situationGuides[d.situation] : null
  const groups = g
    ? [{ title: g.title, steps: g.steps.map((s) => ({ title: s.title, body: s.body })) }]
    : d.responseCards.map((c) => {
      const full = d.cardDetails.find((x) => x.code === c.code)
      return { title: full?.title ?? c.title ?? c.code, steps: toTextItems(full?.actions) }
    })
  if (!groups.length) return null
  return <div style={{ ...bubble(false), maxWidth: "100%", width: "100%", background: "#fff", border: "1px solid #dfe5ee", whiteSpace: "normal" }}>
    <small style={{ display: "block", opacity: .75, marginBottom: 6 }}>어떡하지 도우미 · 안내한 대응 방법</small>
    {g && <p style={{ margin: "0 0 10px" }}>{g.intro}</p>}
    {groups.map((grp, gi) => <div key={gi} style={{ marginTop: gi ? 14 : 0 }}>
      <strong style={{ display: "block", marginBottom: 6 }}>{grp.title}</strong>
      <ol style={{ margin: 0, paddingLeft: 20 }}>{grp.steps.map((s, i) => <li key={i} style={{ marginBottom: 6 }}>{s.title && <b>{s.title}: </b>}{s.body}</li>)}</ol>
    </div>)}
    {g && <p style={{ margin: "10px 0 0", fontSize: 13, color: "#526174" }}>연락할 곳: {g.organizations.map((k, i) => {
      const o = organizationData[k]
      return <span key={k}>{i ? " · " : ""}<a href={o.href} target={o.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer">{o.name}</a></span>
    })}</p>}
  </div>
}

const formatDate = (iso: string) => { const d = new Date(iso); return isNaN(d.getTime()) ? iso : d.toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" }) }

export function MyPage({ account, reports, history, onLogout }: { account: Account; reports: SavedReports; history: SolutionHistory; onLogout: () => void }) {
  const r = reports
  const h = history
  // 상세 리포트를 볼 땐 위쪽 프로필·통계를 인쇄에서 빼요 (리포트 종이만 PDF로)
  const np = r.detail ? " no-print" : ""
  const detailItem = r.detail ? r.items.find((i) => i.reportId === r.detail!.reportId) : undefined
  // 삭제 확인 창에 띄울 대상 (리포트 또는 긴급 대응 기록)
  const [pendingDelete, setPendingDelete] = useState<{ kind: "report" | "solution"; id: number; title: string } | null>(null)
  const confirmDelete = () => {
    const target = pendingDelete
    setPendingDelete(null)
    if (!target) return
    void (target.kind === "report" ? r.remove(target.id) : h.remove(target.id))
  }
  const deleteButton = (kind: "report" | "solution", id: number, title: string) =>
    <button type="button" className="record-delete" aria-label={`${title} 삭제`} onClick={() => setPendingDelete({ kind, id, title })}>삭제</button>
  return <section className="subpage mypage"><div className="container mypage-container">
    {pendingDelete && <ConfirmModal
      title={pendingDelete.kind === "report" ? "리포트를 삭제할까요?" : "상담 기록을 삭제할까요?"}
      message={`'${pendingDelete.title}'을(를) 삭제하면 다시 볼 수 없어요.`}
      confirmLabel="삭제하기"
      cancelLabel="취소"
      onConfirm={confirmDelete}
      onCancel={() => setPendingDelete(null)}
    />}
    <div className={`mypage-top${np}`}><div><span className="account-kicker"><Icon name="shield" size={16}/> MY PAGE</span><h1>나의 금융 안전 기록</h1><p>저장한 훈련 리포트와 긴급 대응 상담 기록을 한곳에서 확인해요.</p></div><button className="outline-button logout-button" onClick={onLogout}>로그아웃</button></div>
    <div className={`profile-card${np}`}><div className="profile-avatar"><Icon name="user" size={26}/></div><div><strong>{displayName(account)}님, 안녕하세요!</strong><p>{account.email}</p></div><span className="profile-status"><Icon name="check" size={15}/> 가입 완료</span></div>
    <div className={`mypage-stats${np}`}><div><span>저장한 리포트</span><strong>{r.items.length}{r.nextCursor ? "+" : ""}<small>개</small></strong></div><div><span>긴급 대응 기록</span><strong>{h.items.length}{h.nextCursor ? "+" : ""}<small>개</small></strong></div></div>
    <div className="mypage-records">
      {r.error && <p className="auth-error" role="alert" style={{ margin: 16 }}>{r.error}</p>}
      {r.detail ? <div className="record-detail">
        <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <button className="record-back" onClick={r.close}>← 목록으로</button>
          <div style={{ display: "flex", gap: 8 }}>
            {deleteButton("report", r.detail.reportId, r.detail.title)}
            <button className="outline-button" title="인쇄 창에서 대상을 'PDF로 저장'으로 고르세요" onClick={() => printAsPdf(`어떡하지 리포트 - ${r.detail!.title}`)}><Icon name="download" size={17}/> PDF로 저장</button>
          </div>
        </div>
        <ReportSheet title={r.detail.title} fraudTypeCode={detailItem?.fraudTypeCode} completedAt={detailItem?.completedAt} evaluation={r.detail.evaluation} />
        <TurnReview turnFeedback={r.detail.evaluation.turnFeedback} className="no-print" style={{ maxWidth: 794, margin: "22px auto 0" }} />
      </div>
      : r.detailLoading || (r.loading && !r.items.length) ? <div className="record-empty"><div className="record-empty-icon"><Icon name="refresh" size={30}/></div><h3>불러오는 중...</h3></div>
      : r.items.length ? <>
        <div className="record-list">{r.items.map((item) => <div className="record-row" key={item.reportId}><div className="record-icon"><Icon name="shield" size={22}/></div><div className="record-info"><strong>{item.title}</strong><p>{item.fraudTypeCode} · {formatDate(item.completedAt)}</p></div><div className="record-actions"><button className="record-view" onClick={() => void r.open(item.reportId)}>상세보기</button>{deleteButton("report", item.reportId, item.title)}</div></div>)}</div>
        {r.nextCursor && <button className="outline-button" style={{ margin: "14px auto 0", display: "flex" }} disabled={r.loading} onClick={() => void r.loadMore()}>{r.loading ? "불러오는 중..." : "더 보기"}</button>}
      </>
      : <div className="record-empty"><div className="record-empty-icon"><Icon name="shield" size={30}/></div><h3>아직 저장한 리포트가 없어요</h3><p>시뮬레이션을 마치고 결과 화면에서 리포트를 저장해 보세요.</p></div>}
    </div>
    {!r.detail && <div className="mypage-records no-print" style={{ marginTop: 20 }}>
      <h2 style={{ margin: "18px 20px 4px", fontSize: 18 }}>긴급 대응 기록</h2>
      {h.error && <p className="auth-error" role="alert" style={{ margin: 16 }}>{h.error}</p>}
      {h.detail ? <div className="record-detail">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button className="record-back" onClick={h.close}>← 목록으로</button>
          {deleteButton("solution", h.detail.solutionId, h.detail.title)}
        </div>
        <h3 style={{ margin: "14px 0 4px" }}>{h.detail.title}</h3>
        <p style={{ margin: "0 0 14px", fontSize: 13, color: "#697586" }}>상담 당시 안내받은 대응 방법과 대화예요. 상담은 마쳐서 이어서 대화할 수 없어요.</p>
        <div style={{ display: "grid", gap: 10 }}>
          {h.detail.messages.filter((m) => m.content).map((m, i) => {
            const mine = m.sender === "USER"
            return <div key={m.id ?? i} style={{ display: "contents" }}>
              <div style={bubble(mine)}><small style={{ display: "block", opacity: .75, marginBottom: 2 }}>{mine ? "나" : "어떡하지 도우미"}</small>{m.content}</div>
              {i === 0 && <PlanBubble d={h.detail!} />}
            </div>
          })}
        </div>
      </div>
      : h.detailLoading || (h.loading && !h.items.length) ? <div className="record-empty"><div className="record-empty-icon"><Icon name="refresh" size={30}/></div><h3>불러오는 중...</h3></div>
      : h.items.length ? <>
        <div className="record-list">{h.items.map((item) => <div className="record-row" key={item.solutionId}><div className="record-icon"><Icon name="alert" size={22}/></div><div className="record-info"><strong>{item.title}</strong><p>상담 마침 · {formatDate(item.completedAt ?? item.createdAt)}</p></div><div className="record-actions"><button className="record-view" onClick={() => void h.open(item)}>대화 보기</button>{deleteButton("solution", item.solutionId, item.title)}</div></div>)}</div>
        {h.nextCursor && <button className="outline-button" style={{ margin: "14px auto 0", display: "flex" }} disabled={h.loading} onClick={() => void h.loadMore()}>{h.loading ? "불러오는 중..." : "더 보기"}</button>}
      </>
      : <div className="record-empty"><div className="record-empty-icon"><Icon name="alert" size={30}/></div><h3>아직 저장된 상담 기록이 없어요</h3><p>로그인한 상태로 긴급 대응 상담을 하고 '상담 마치기'를 누르면 여기에 저장돼요.</p></div>}
    </div>}
    {USE_MOCK && <p className={`mypage-warning${np}`}><Icon name="lock" size={15}/> 지금은 서버 없이 동작하는 mock 모드라 기록이 이 브라우저에만 보관돼요.</p>}
  </div></section>
}
