import { useState } from "react"
import { USE_MOCK } from "@/api"
import { ConfirmModal } from "@/components/ConfirmModal"
import { Icon } from "@/components/Icon"
import { DuoIcon, type DuoIconName } from "@/components/DuoIcon"
import { displayName, type Account } from "@/features/auth/types"
import { ReportSheet } from "@/features/report/components/ReportSheet"
import { TurnReview } from "@/features/report/components/TurnReview"
import { printAsPdf } from "@/lib/print"
import type { SavedReports } from "../hooks/useSavedReports"
import type { SolutionHistory, SolutionRecord } from "../hooks/useSolutionHistory"
import { situationGuides } from "@/features/emergency/data/situationGuides"
import { organizationData } from "@/features/emergency/data/organizations"
import { toTextItems } from "@/lib/normalize"
import { MessageText } from "@/features/emergency/components/EmergencyChat"


/** 리포트 사기 유형: 코드 대신 한글 이름과 아이콘으로 */
const FRAUD: Record<string, { label: string; icon: DuoIconName }> = {
  SECONDHAND_TRADE: { label: "중고거래", icon: "trade" },
  SMISHING: { label: "택배·문자 스미싱", icon: "smishing" },
  LOAN_FRAUD: { label: "대출 사기", icon: "loan" },
  JOB_SCAM: { label: "취업 사기", icon: "idcheck" },
  INSTITUTION_IMPERSONATION: { label: "기관 사칭", icon: "institution" },
  ACQUAINTANCE_IMPERSONATION: { label: "가족·지인 사칭", icon: "acquaintance" },
  INVESTMENT_FRAUD: { label: "투자 사기", icon: "investment" },
}

const stepIcon = (title: string): DuoIconName =>
  /지급정지|입금|송금/.test(title) ? "stop" : /앱|휴대폰|악성/.test(title) ? "appcheck" : /명의|등록된|확인/.test(title) ? "idcheck"
    : /개인정보|노출|비밀번호/.test(title) ? "shield" : /신고|경찰/.test(title) ? "report" : /전화|연락/.test(title) ? "call" : "shield"
const ORG_ICON: Record<string, DuoIconName> = { police: "report", cyber: "report", fss: "institution", kisa: "shield", counterscam: "call", pd: "shield", payinfo: "idcheck", msafer: "idcheck" }

/** 기록 보기의 '그때 안내받은 대응 방법'과 '도움받을 곳' (긴급 대응 화면과 같은 모양) */
function RecordPlan({ d }: { d: SolutionRecord }) {
  const g = d.situation ? situationGuides[d.situation] : null
  const groups = g
    ? [{ title: g.title, steps: g.steps.map((s) => ({ title: s.title, body: s.body })) }]
    : d.responseCards.map((c) => {
      const full = d.cardDetails.find((x) => x.code === c.code)
      return { title: full?.title ?? c.title ?? c.code, steps: toTextItems(full?.actions) }
    })
  if (!groups.length) return null
  return <>
    <section className="v2-record-section">
      <h4 className="v2-section-title">안내받은 대응 방법</h4>
      {g && <p className="v2-record-intro">{g.intro}</p>}
      {groups.map((grp, gi) => <div key={gi}>
        {!g && <h5 className="v2-record-group">{grp.title}</h5>}
        <div className="action-steps v2-steps">{grp.steps.map((st, i) => <div key={i}><DuoIcon name={stepIcon(st.title ?? st.body)} size={44} /><div><small>{i + 1}단계</small>{st.title && <h4>{st.title}</h4>}<p>{st.body}</p></div></div>)}</div>
      </div>)}
    </section>
    {g && <div className="chat-organizations">
      <h3>도움받을 곳</h3>
      <div className="organization-grid">{g.organizations.map((k) => {
        const o = organizationData[k]
        const tel = o.href.startsWith("tel:")
        const Tag = tel ? "div" : "a"
        return <Tag key={k} href={tel ? undefined : o.href} target={tel ? undefined : "_blank"} rel={tel ? undefined : "noreferrer"}>
          <span className="org-mark"><DuoIcon name={ORG_ICON[k] ?? "shield"} size={32} /></span>
          <div><h4>{o.name}</h4><p>{o.desc}</p></div>
          {!tel && <strong>바로가기 <Icon name="arrow" size={16} /></strong>}
        </Tag>
      })}</div>
    </div>}
  </>
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
    <div className={`mypage-top${np}`}><div><h1>나의 금융 안전 기록</h1><p>저장한 훈련 리포트와 긴급 대응 상담 기록을 한곳에서 확인해요.</p></div><button className="outline-button logout-button" onClick={onLogout}>로그아웃</button></div>
    <div className={`profile-card${np}`}><div className="profile-avatar"><img src="/mascot.png" alt="" width={44} /></div><div><strong>{displayName(account)}님, 안녕하세요!</strong><p>{account.email}</p></div><span className="profile-status"><Icon name="check" size={15}/> 가입 완료</span></div>
    <div className={`mypage-stats${np}`}><div><span>저장한 리포트</span><strong>{r.items.length}{r.nextCursor ? "+" : ""}<small>개</small></strong></div><div><span>긴급 대응 기록</span><strong>{h.items.length}{h.nextCursor ? "+" : ""}<small>개</small></strong></div></div>
    <div className="mypage-records">
      {!r.detail && <h2 className="v2-mypage-h2">저장한 훈련 리포트</h2>}
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
        <div className="record-list">{r.items.map((item) => <div className="record-row" key={item.reportId}><div className="record-icon"><DuoIcon name={FRAUD[item.fraudTypeCode ?? ""]?.icon ?? "shield"} size={30}/></div><div className="record-info"><strong>{item.title}</strong><p>{FRAUD[item.fraudTypeCode ?? ""]?.label ?? "금융사기"} · {formatDate(item.completedAt)}</p></div><div className="record-actions"><button className="record-view" onClick={() => void r.open(item.reportId)}>상세보기</button>{deleteButton("report", item.reportId, item.title)}</div></div>)}</div>
        {r.nextCursor && <button className="outline-button" style={{ margin: "14px auto 0", display: "flex" }} disabled={r.loading} onClick={() => void r.loadMore()}>{r.loading ? "불러오는 중..." : "더 보기"}</button>}
      </>
      : <div className="record-empty"><div className="record-empty-icon"><Icon name="shield" size={30}/></div><h3>아직 저장한 리포트가 없어요</h3><p>시뮬레이션을 마치고 결과 화면에서 리포트를 저장해 보세요.</p></div>}
    </div>
    {!r.detail && <div className="mypage-records no-print" style={{ marginTop: 20 }}>
      <h2 className="v2-mypage-h2">긴급 대응 기록</h2>
      {h.error && <p className="auth-error" role="alert" style={{ margin: 16 }}>{h.error}</p>}
      {h.detail ? <div className="record-detail v2-record">
        <div className="v2-record-top">
          <button className="record-back" onClick={h.close}>← 목록으로</button>
          {deleteButton("solution", h.detail.solutionId, h.detail.title)}
        </div>
        <div className="v2-record-head">
          <DuoIcon name={h.detail.situation ?? "shield"} size={56} />
          <div>
            <h3>{h.detail.situation ? `${situationGuides[h.detail.situation].title} 상담 기록` : h.detail.title}</h3>
            <p>{(() => { const it = h.items.find((x) => x.solutionId === h.detail!.solutionId); return it ? `${formatDate(it.completedAt ?? it.createdAt)} · ` : "" })()}마친 상담이라 이어서 대화할 수 없어요</p>
          </div>
        </div>
        <RecordPlan d={h.detail} />
        <section className="v2-record-section">
          <h4 className="v2-section-title">대화 내용</h4>
          <div className="v2-record-chat">
            {h.detail.messages.filter((m) => m.content).map((m, i) => {
              const mine = m.sender === "USER"
              return <div key={m.id ?? i} className={`prep-message ${mine ? "user" : "assistant"}`}>
                {!mine && <span className="v2-avatar"><img className="v2-helper-avatar" src="/mascot.png" alt="" width={36} /></span>}
                <div><small>{mine ? "나" : "어떡하지 도우미"}</small>{mine ? <p>{m.content}</p> : <MessageText text={m.content} structured={/(^|\s)1[.)]\s/.test(m.content)} />}</div>
              </div>
            })}
          </div>
        </section>
      </div>
      : h.detailLoading || (h.loading && !h.items.length) ? <div className="record-empty"><div className="record-empty-icon"><Icon name="refresh" size={30}/></div><h3>불러오는 중...</h3></div>
      : h.items.length ? <>
        <div className="record-list">{h.items.map((item) => <div className="record-row" key={item.solutionId}><div className="record-icon"><DuoIcon name="report" size={30}/></div><div className="record-info"><strong>{item.title}</strong><p>상담 마침 · {formatDate(item.completedAt ?? item.createdAt)}</p></div><div className="record-actions"><button className="record-view" onClick={() => void h.open(item)}>대화 보기</button>{deleteButton("solution", item.solutionId, item.title)}</div></div>)}</div>
        {h.nextCursor && <button className="outline-button" style={{ margin: "14px auto 0", display: "flex" }} disabled={h.loading} onClick={() => void h.loadMore()}>{h.loading ? "불러오는 중..." : "더 보기"}</button>}
      </>
      : <div className="record-empty"><div className="record-empty-icon"><Icon name="alert" size={30}/></div><h3>아직 저장된 상담 기록이 없어요</h3><p>로그인한 상태로 긴급 대응 상담을 하고 '상담 마치기'를 누르면 여기에 저장돼요.</p></div>}
    </div>}
    {USE_MOCK && <p className={`mypage-warning${np}`}><Icon name="lock" size={15}/> 지금은 서버 없이 동작하는 mock 모드라 기록이 이 브라우저에만 보관돼요.</p>}
  </div></section>
}
