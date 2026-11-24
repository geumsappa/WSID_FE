import type { CSSProperties } from "react"
import type { MockPage } from "@/api"
import type { MockFieldKind, MockTemplate } from "../data/mockPageTemplates"

type Result = "" | "submitted" | "official" | "closed"

/**
 * 문자·메신저 링크를 눌렀을 때 뜨는 사이트 화면. 휴대폰 브라우저로 연 것처럼 주소창과 함께 보여요.
 * 제목·입력칸·색·상태 줄은 template(data/mockPageTemplates.ts)에서 와요.
 * 화면 안(사이트)에는 설명 문구를 넣지 않고, 대화로 돌아가기·대표번호 확인은 사이트 밖 아래 막대에 둬요.
 * 입력값은 어디에도 보내지 않고 "제출했다"는 행동만 기록해요 (TrainingCheckPage).
 */
export function TrainingCheckView({ page, template: t, loading, busy, error, result, onAction }: {
  page: MockPage | null
  template: MockTemplate
  loading: boolean
  busy: boolean
  error: string
  result: Result
  /** submitted 일 때 filled: 값을 채운 칸의 종류 (값은 넘기지 않아요) */
  onAction: (kind: Exclude<Result, "">, filled?: MockFieldKind[]) => void
}) {
  const brand = page?.institutionName || t.title
  const style = { "--ms-theme": t.theme } as CSSProperties
  const year = new Date().getFullYear()

  return <div className="msite" style={style}>
    {/* 휴대폰 브라우저 주소창 */}
    <div className="msite-chrome">
      <div className="msite-urlbar">
        <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M12 2 1 21h22L12 2Zm0 6 1 7h-2l1-7Zm0 9.2a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4Z" /></svg>
        <span className="msite-url">{t.domain}</span>
      </div>
      <button type="button" className="msite-chrome-close" aria-label="닫기" disabled={busy} onClick={() => onAction("closed")}>
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
      </button>
    </div>

    <div className="msite-scroll">
      <header className="msite-header">
        <div className="msite-logo"><span className="msite-logo-mark">{brand.slice(0, 1)}</span><strong>{brand}</strong></div>
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
      </header>

      {loading ? <div className="msite-loading" role="status"><span className="msite-spinner" />페이지를 불러오는 중입니다</div>
      : !page ? <div className="msite-body"><p className="msite-error" role="alert">{error || "페이지를 표시할 수 없습니다."}</p></div>
      : result === "submitted" ? <div className="msite-body msite-done" role="status">
          <span className="msite-done-icon"><svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
          <h2>{t.submitted}</h2>
          <p>담당자 안내에 따라 다음 절차를 진행해 주세요.<br />처리 결과는 문자로 안내됩니다.</p>
          <button type="button" className="msite-submit" disabled={busy} onClick={() => onAction("closed")}>확인</button>
        </div>
      : <>
        <section className="msite-hero">
          <span className={t.alert ? "msite-badge alert" : "msite-badge"}>{t.alert ? "중요 알림" : t.nav}</span>
          <h1>{t.title}</h1>
          <p>{t.lead}</p>
          <dl className="msite-status">
            {t.status.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
          </dl>
        </section>

        <div className="msite-body">
          <h2 className="msite-section">{t.section}</h2>
          <p className="msite-section-desc">{t.sectionDesc}</p>
          <form autoComplete="off" onSubmit={(event) => {
            event.preventDefault()
            // 칸은 비워 둬도 제출돼요. 어떤 칸을 채웠는지(종류)만 모으고 값은 바로 지워요
            const form = new FormData(event.currentTarget)
            const filled = t.fields.filter((f, i) => String(form.get(`f${i}`) ?? "").trim() !== "").map((f) => f.kind)
            event.currentTarget.reset()
            onAction("submitted", filled)
          }}>
            {t.fields.map((f, i) => f.type === "gender"
              ? <div key={f.label} className="msite-field" role="radiogroup" aria-label={f.label}><span>{f.label}</span>
                <div className="msite-choice">{["남성", "여성"].map((g) => <label key={g}>
                  <input type="radio" name={`f${i}`} value={g} disabled={busy} /><span>{g}</span></label>)}</div>
              </div>
              : <label key={f.label} className="msite-field"><span>{f.label}</span>
                <input type="text" name={`f${i}`} inputMode={f.type === "tel" ? "numeric" : undefined} placeholder={f.placeholder}
                  maxLength={f.maxLength ?? 50} disabled={busy} autoComplete="off" /></label>)}

            <label className="msite-agree">
              <input type="checkbox" disabled={busy} />
              <span><b>[필수]</b> 개인정보 수집·이용에 동의합니다</span>
            </label>
            {error && <p className="msite-error" role="alert">{error}</p>}
            <button className="msite-submit" type="submit" disabled={busy}>{busy ? "처리 중..." : t.submit}</button>
          </form>
        </div>
      </>}

      <footer className="msite-footer">
        <nav><span>이용약관</span><span><b>개인정보처리방침</b></span><span>고객센터</span></nav>
        <p>© {year} {brand}. All rights reserved.</p>
      </footer>
    </div>

    {/* 사이트 밖(앱) 막대: 대화로 돌아가기, 사이트를 믿지 않고 대표번호로 확인하기 */}
    <div className="msite-appbar">
      {result === "official"
        ? <span className="msite-appbar-note">대표번호로 직접 확인하기로 했어요</span>
        : <button type="button" disabled={busy || !page} onClick={() => onAction("official")}>대표번호로 직접 확인할래요</button>}
      <button type="button" disabled={busy} onClick={() => onAction("closed")}>대화로 돌아가기</button>
    </div>
  </div>
}
