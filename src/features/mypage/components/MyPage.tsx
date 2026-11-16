import { USE_MOCK } from "@/api"
import { Icon } from "@/components/Icon"
import { displayName, type Account } from "@/features/auth/types"
import { EvaluationView } from "@/features/report/components/EvaluationView"
import type { SavedReports } from "../hooks/useSavedReports"

const formatDate = (iso: string) => { const d = new Date(iso); return isNaN(d.getTime()) ? iso : d.toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" }) }

export function MyPage({ account, reports, onLogout }: { account: Account; reports: SavedReports; onLogout: () => void }) {
  const r = reports
  return <section className="subpage mypage"><div className="container mypage-container">
    <div className="mypage-top"><div><span className="account-kicker"><Icon name="shield" size={16}/> MY PAGE</span><h1>나의 금융 안전 기록</h1><p>저장한 훈련 리포트를 한곳에서 확인해요.</p></div><button className="outline-button logout-button" onClick={onLogout}>로그아웃</button></div>
    <div className="profile-card"><div className="profile-avatar"><Icon name="user" size={26}/></div><div><strong>{displayName(account)}님, 안녕하세요!</strong><p>{account.email}</p></div><span className="profile-status"><Icon name="check" size={15}/> 가입 완료</span></div>
    <div className="mypage-stats"><div><span>저장한 리포트</span><strong>{r.items.length}{r.nextCursor ? "+" : ""}<small>개</small></strong></div></div>
    <div className="mypage-records">
      {r.error && <p className="auth-error" role="alert" style={{ margin: 16 }}>{r.error}</p>}
      {r.detail ? <div className="record-detail">
        <button className="record-back" onClick={r.close}>← 목록으로</button>
        <h2>{r.detail.title}</h2>
        <h3 style={{ margin: "10px 0 18px" }}>{r.detail.evaluation.overallFeedback}</h3>
        <EvaluationView evaluation={r.detail.evaluation} compact />
        <button className="outline-button" style={{ marginTop: 18 }} onClick={() => void r.downloadPdf(r.detail!.reportId)}><Icon name="download" size={17}/> PDF로 받기</button>
      </div>
      : r.detailLoading || (r.loading && !r.items.length) ? <div className="record-empty"><div className="record-empty-icon"><Icon name="refresh" size={30}/></div><h3>불러오는 중...</h3></div>
      : r.items.length ? <>
        <div className="record-list">{r.items.map((item) => <div className="record-row" key={item.reportId}><div className="record-icon"><Icon name="shield" size={22}/></div><div className="record-info"><strong>{item.title}</strong><p>{item.fraudTypeCode} · {formatDate(item.completedAt)}</p></div><button className="record-view" onClick={() => void r.open(item.reportId)}>상세보기</button></div>)}</div>
        {r.nextCursor && <button className="outline-button" style={{ margin: "14px auto 0", display: "flex" }} disabled={r.loading} onClick={() => void r.loadMore()}>{r.loading ? "불러오는 중..." : "더 보기"}</button>}
      </>
      : <div className="record-empty"><div className="record-empty-icon"><Icon name="shield" size={30}/></div><h3>아직 저장한 리포트가 없어요</h3><p>시뮬레이션을 마치고 결과 화면에서 리포트를 저장해 보세요.</p></div>}
    </div>
    {USE_MOCK && <p className="mypage-warning"><Icon name="lock" size={15}/> 지금은 서버 없이 동작하는 mock 모드라 기록이 이 브라우저에만 보관돼요.</p>}
  </div></section>
}
