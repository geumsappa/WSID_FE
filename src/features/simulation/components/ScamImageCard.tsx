import { useEffect, useState } from "react"
import type React from "react"
import { photoSources, SIM_PHOTOS } from "../data/simPhotos"

/**
 * 사기범이 대화 중에 보내는 '사진·화면' (AI 대사의 [사진:상품|물건|이름] 같은 표시)
 * 물건·상자는 실제 사진(Unsplash 무료 사진), 이체·대출·공문은 실제 앱 화면처럼 HTML로 그려요.
 * 번호·이름은 모두 가려져 있어 실제로 쓸 수 없고, 공문은 실제 문서로 오해되지 않게 큰 '견본' 워터마크를 넣어요.
 */
export type MediaKind = "사진:상품" | "사진:송장" | "사진:입금확인" | "공문" | "대출승인"
export const MEDIA_TOKEN = /(\[(?:사진:(?:상품|송장|입금확인)|공문|대출승인)(?:\|[^\]|\n]*){0,2}\])/
export const MEDIA_TOKEN_G = new RegExp(MEDIA_TOKEN.source, "g")

export function parseMedia(token: string): { kind: MediaKind; a: string; b: string } | null {
  const m = token.match(/^\[(사진:상품|사진:송장|사진:입금확인|공문|대출승인)((?:\|[^\]|\n]*){0,2})\]$/)
  if (!m) return null
  const [a = "", b = ""] = m[2].split("|").slice(1).map((s) => s.trim())
  return { kind: m[1] as MediaKind, a, b }
}

const today = () => {
  const d = new Date()
  return { md: `${d.getMonth() + 1}/${d.getDate()}`, ymd: `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`,
    hm: `${d.getHours() < 12 ? "오전" : "오후"} ${((d.getHours() + 11) % 12) + 1}:${String(d.getMinutes()).padStart(2, "0")}` }
}

/** 물건 이름으로 그림 종류를 골라요 (전자레인지, 노트북, 휴대폰 …) */
export function itemShape(item: string): string {
  const rules: [RegExp, string][] = [
    [/전자레인지|오븐|에어프라이어/, "microwave"], [/노트북|맥북|랩탑|그램/, "laptop"],
    [/폰|아이폰|갤럭시|휴대폰|핸드폰|스마트폰/, "phone"], [/게임기|플스|플레이스테이션|스위치|닌텐도|엑스박스/, "console"],
    [/자전거|킥보드/, "bike"], [/가방|백팩|핸드백|지갑/, "bag"], [/운동화|신발|구두|스니커즈|조던/, "shoes"],
    [/티켓|콘서트|입장권|공연|예매/, "ticket"], [/카메라|렌즈|캠코더/, "camera"], [/티비|TV|모니터|텔레비전/, "tv"],
    [/패드|태블릿|아이패드/, "tablet"], [/시계|워치/, "watch"], [/이어폰|헤드폰|에어팟|버즈/, "earphone"],
  ]
  return rules.find(([re]) => re.test(item))?.[1] ?? "box"
}

/** 물건 그림. (cx, cy) 가운데, s 크기 배율 */
export function ItemDrawing({ shape, cx, cy, s = 1 }: { shape: string; cx: number; cy: number; s?: number }) {
  const t = `translate(${cx} ${cy}) scale(${s})`
  const body = "#e9edf2", dark = "#3b4452", mid = "#9aa4b2", line = "#6b7584"
  const g: Record<string, React.ReactNode> = {
    microwave: <>
      <rect x="-62" y="-38" width="124" height="76" rx="8" fill={body} stroke={line} strokeWidth="2" />
      <rect x="-52" y="-28" width="78" height="56" rx="4" fill={dark} />
      <rect x="-48" y="-24" width="30" height="48" rx="3" fill="#56606f" opacity=".6" />
      <circle cx="44" cy="-14" r="7" fill={mid} /><circle cx="44" cy="6" r="7" fill={mid} />
      <rect x="36" y="20" width="16" height="6" rx="2" fill={mid} />
      <rect x="-56" y="38" width="12" height="4" fill={line} /><rect x="44" y="38" width="12" height="4" fill={line} />
    </>,
    laptop: <>
      <rect x="-50" y="-44" width="100" height="64" rx="5" fill={dark} />
      <rect x="-44" y="-38" width="88" height="52" rx="2" fill="#7f9bc4" />
      <path d="M-64 22h128l-8 12h-112z" fill={body} stroke={line} strokeWidth="2" />
    </>,
    phone: <>
      <rect x="-26" y="-50" width="52" height="100" rx="10" fill={dark} />
      <rect x="-22" y="-44" width="44" height="86" rx="6" fill="#7f9bc4" />
      <rect x="-8" y="-47" width="16" height="3" rx="1.5" fill="#222" />
    </>,
    tablet: <>
      <rect x="-42" y="-54" width="84" height="108" rx="9" fill={dark} />
      <rect x="-37" y="-48" width="74" height="96" rx="4" fill="#7f9bc4" />
    </>,
    console: <>
      <rect x="-58" y="-24" width="116" height="48" rx="22" fill={body} stroke={line} strokeWidth="2" />
      <circle cx="-34" cy="-2" r="9" fill={dark} /><circle cx="34" cy="-8" r="5" fill={dark} /><circle cx="44" cy="2" r="5" fill={dark} />
      <rect x="-12" y="-6" width="24" height="10" rx="3" fill={mid} />
    </>,
    bike: <>
      <circle cx="-38" cy="16" r="24" fill="none" stroke={dark} strokeWidth="5" /><circle cx="38" cy="16" r="24" fill="none" stroke={dark} strokeWidth="5" />
      <path d="M-38 16l22-34h36l18 34M-16-18l20 34h-42M20-18l-6-14h-10" fill="none" stroke="#c0392b" strokeWidth="5" strokeLinejoin="round" />
    </>,
    bag: <>
      <path d="M-30-14q0-30 30-30t30 30" fill="none" stroke="#6d4c33" strokeWidth="5" />
      <path d="M-48-16h96l-8 64h-80z" fill="#8b5e3c" /><rect x="-10" y="0" width="20" height="10" rx="2" fill="#d4af37" />
    </>,
    shoes: <>
      <path d="M-62 18q0-22 14-34l18 6q10 10 30 12t42 8q14 4 14 16v6h-118z" fill={body} stroke={line} strokeWidth="2" />
      <path d="M-62 26h118v8h-118z" fill={dark} /><path d="M-30-6l8 10M-20-4l8 10M-10-2l8 10" stroke={line} strokeWidth="2" />
    </>,
    ticket: <>
      <path d="M-64-30h128v20a10 10 0 0 0 0 20v20h-128v-20a10 10 0 0 0 0-20z" fill="#f6e7c1" stroke="#c9a85a" strokeWidth="2" />
      <path d="M24-28v56" stroke="#c9a85a" strokeDasharray="4 4" />
      <rect x="-52" y="-16" width="60" height="8" rx="3" fill="#c9a85a" /><rect x="-52" y="0" width="44" height="6" rx="3" fill="#d9c08a" />
    </>,
    camera: <>
      <rect x="-56" y="-30" width="112" height="70" rx="10" fill={dark} /><rect x="-30" y="-42" width="34" height="14" rx="4" fill={dark} />
      <circle cx="0" cy="6" r="26" fill="#56606f" /><circle cx="0" cy="6" r="16" fill="#1f2630" /><circle cx="6" cy="0" r="4" fill="#8aa" />
    </>,
    tv: <>
      <rect x="-64" y="-42" width="128" height="76" rx="5" fill={dark} /><rect x="-58" y="-36" width="116" height="64" rx="2" fill="#7f9bc4" />
      <path d="M-20 34h40l6 12h-52z" fill={line} />
    </>,
    watch: <>
      <rect x="-14" y="-56" width="28" height="112" rx="8" fill={line} />
      <rect x="-28" y="-30" width="56" height="60" rx="14" fill={dark} /><rect x="-22" y="-24" width="44" height="48" rx="10" fill="#7f9bc4" />
    </>,
    earphone: <>
      <rect x="-40" y="-20" width="80" height="52" rx="24" fill="#f8fafc" stroke={line} strokeWidth="2" />
      <path d="M-40 4h80" stroke={line} strokeWidth="1.5" /><circle cx="0" cy="18" r="3" fill="#7ac47a" />
    </>,
    box: <>
      <path d="M-56-20l56-20 56 20v52l-56 20-56-20z" fill="#d7b98e" stroke="#a9875b" strokeWidth="2" />
      <path d="M-56-20l56 20 56-20M0 0v52" fill="none" stroke="#a9875b" strokeWidth="2" />
      <path d="M-28-30l56 20" stroke="#efe0c4" strokeWidth="8" />
    </>,
  }
  return <g transform={t}>{g[shape] ?? g.box}</g>
}

// ───────── 실제 사진·실제 앱 화면처럼 보이게 (사진은 Unsplash 무료 사진, 화면은 HTML로 그려요) ─────────

/** 손글씨 글꼴 (인증샷 메모). 인터넷이 없으면 기본 글꼴로 보여요 */
let handFontAdded = false
function useHandFont() {
  useEffect(() => {
    if (handFontAdded || typeof document === "undefined") return
    handFontAdded = true
    const link = document.createElement("link")
    link.rel = "stylesheet"
    link.href = "https://fonts.googleapis.com/css2?family=Nanum+Pen+Script&display=swap"
    document.head.appendChild(link)
  }, [])
}

/** 로컬 사본 → Unsplash 원본 → 그림 순서로 보여 주는 사진 */
function PhotoImg({ photo, alt, fallback }: { photo: string; alt: string; fallback: React.ReactNode }) {
  const sources = photoSources(photo)
  const [index, setIndex] = useState(0)
  if (index >= sources.length) return <>{fallback}</>
  return <img className="scam-photo-img" src={sources[index]} alt={alt} loading="lazy" draggable={false}
    onError={() => setIndex((i) => i + 1)} />
}

/** "35만원" → "350,000원" (못 알아보면 그대로) */
export function wonText(raw: string): string {
  const t = raw.replace(/\s/g, "")
  const man = t.match(/^(\d+(?:\.\d+)?)만(?:(\d)천)?원?$/)
  if (man) return `${Math.round(Number(man[1]) * 10000 + Number(man[2] ?? 0) * 1000).toLocaleString("ko-KR")}원`
  const plain = t.match(/^(\d[\d,]*)원?$/)
  if (plain) return `${Number(plain[1].replace(/,/g, "")).toLocaleString("ko-KR")}원`
  return raw
}

/** 실명 가운데를 가린 모양 (실제 송장·이체 화면처럼): 김민수 → 김*수 */
const maskName = (name: string) => name.length >= 3 ? `${name[0]}${"*".repeat(name.length - 2)}${name[name.length - 1]}` : name.length === 2 ? `${name[0]}*` : name

function ProductPhoto({ item, name }: { item: string; name: string }) {
  useHandFont()
  const { md } = today()
  const shape = itemShape(item)
  return <figure className="scam-image scam-photo" aria-label={`${item || "물건"} 실물 사진, 판매자 메모: ${name || "판매자"} ${md}`}>
    <PhotoImg photo={SIM_PHOTOS[shape] ? shape : "box"} alt={`${item || "물건"} 사진`}
      fallback={<svg viewBox="0 0 280 210" className="scam-photo-img"><rect width="280" height="210" fill="#e9e3d8" /><ItemDrawing shape={shape} cx={120} cy={100} s={1} /></svg>} />
    {/* 이름·날짜를 적은 메모 (실제 사기범이 '인증샷'으로 보내는 모양) */}
    <div className="scam-memo"><b>{(name || "판매자").slice(0, 6)}</b><span>{md} 판매</span></div>
  </figure>
}

function Waybill({ courier, item, sender }: { courier: string; item: string; sender: string }) {
  const { ymd } = today()
  return <figure className="scam-image scam-photo scam-waybill" aria-label={`${courier || "택배"} 송장 사진 (운송장 번호 가려짐)`}>
    <PhotoImg photo="cardboard" alt="택배 상자" fallback={<div className="scam-photo-img scam-cardboard" />} />
    <div className="waybill-label">
      <div className="waybill-head"><b>{courier || "한결택배"}</b><span>{ymd} 접수</span></div>
      <div className="waybill-no"><small>운송장번호</small><strong>5012-●●●●-●●●●</strong></div>
      <div className="waybill-barcode" aria-hidden="true" />
      <dl>
        <dt>받는 분</dt><dd>구*자 님 · 010-****-****</dd>
        <dt>주소</dt><dd>●●시 ●●구 ●●로 ●● (상세주소 생략)</dd>
        <dt>보내는 분</dt><dd>{maskName(sender || "판매자")}</dd>
        <dt>품명</dt><dd>{item || "물건"} 1</dd>
      </dl>
    </div>
  </figure>
}

function StatusBar() {
  const { hm } = today()
  return <div className="phone-status"><b>{hm.replace(/^(오전|오후) /, "")}</b><span aria-hidden="true">▂▄▆█ 5G ▭</span></div>
}

function TransferCapture({ amount, name }: { amount: string; name: string }) {
  const { ymd, hm } = today()
  const won = amount ? wonText(amount) : ""
  return <figure className="scam-image scam-screen" aria-label={`이체 완료 화면 캡처${won ? ` (${won})` : ""}`}>
    <StatusBar />
    <div className="bank-nav"><span aria-hidden="true">‹</span><b>이체 결과</b><span aria-hidden="true">✕</span></div>
    <div className="bank-done">
      <span className="bank-check" aria-hidden="true" />
      <p className="bank-to">●●● 님에게</p>
      <p className="bank-amount">{won || "이체"}</p>
      <p className="bank-sub">보내기 완료</p>
    </div>
    <dl className="bank-rows">
      <dt>받는 계좌</dt><dd>한빛 ●●●●-●●-●●●●</dd>
      <dt>보낸 분</dt><dd>{maskName(name || "보낸 분")}</dd>
      <dt>이체 일시</dt><dd>{ymd} {hm.replace(/^(오전|오후) /, "")}</dd>
      <dt>수수료</dt><dd>면제</dd>
    </dl>
    <div className="bank-button">확인</div>
  </figure>
}

function CaseDocument({ org, title }: { org: string; title: string }) {
  const rows: [string, string][] = [["사건번호", "2026형제●●●●●호"], ["대상", "명의인 본인"], ["죄명", "전자금융거래법 위반(명의 도용)"], ["조치", "출석 요구 · 자산 보호 조치"], ["담당", `${org || "수사기관"} 수사관`]]
  return <figure className="scam-image scam-pdf" aria-label={`${org || "수사기관"} ${title || "사건 조회 결과"} 문서 견본 (실제 문서 아님)`}>
    <div className="pdf-bar"><span>사건조회결과.pdf</span><span>1 / 1</span></div>
    <div className="pdf-page">
      <p className="pdf-org">{org || "수사기관"}</p>
      <p className="pdf-title">{(title || "사건 조회 결과").slice(0, 14)}</p>
      <table><tbody>{rows.map(([k, v]) => <tr key={k}><th>{k}</th><td>{v}</td></tr>)}</tbody></table>
      <p className="pdf-text">위 사건과 관련하여 본인 확인 및 수사 협조를 요청하오니, 담당 수사관의 안내에 따라 주시기 바랍니다.</p>
      <p className="pdf-sign">{org || "수사기관"}</p>
      {/* 실제 공문으로 쓰이지 않게 크게 '견본' 표시 */}
      <div className="pdf-watermark" aria-hidden="true"><b>견본</b><span>실제 문서 아님</span></div>
    </div>
  </figure>
}

function LoanApproval({ org, limit }: { org: string; limit: string }) {
  return <figure className="scam-image scam-screen scam-loan" aria-label={`${org || "금융사"} 대출 승인 안내 화면`}>
    <StatusBar />
    <div className="bank-nav"><span aria-hidden="true">‹</span><b>{org || "금융사"}</b><span /></div>
    <div className="loan-head"><span className="loan-badge">승인 완료</span><p>고객님의 대출이<br />승인되었습니다</p></div>
    <div className="loan-limit"><small>승인 한도</small><strong>{limit || "최대 3천만원"}</strong></div>
    <dl className="bank-rows">
      <dt>금리</dt><dd>연 3.9% (고정)</dd>
      <dt>기간</dt><dd>최대 60개월</dd>
      <dt>상태</dt><dd>실행 대기</dd>
    </dl>
    <p className="loan-note">기존 대출 상환 확인 후 실행됩니다.</p>
    <div className="bank-button">대출 실행 신청</div>
  </figure>
}

/** 대사 속 사진 표시 하나를 그림 카드로 */
export function ScamImageCard({ token, sender }: { token: string; sender?: string }) {
  const media = parseMedia(token)
  if (!media) return null
  const { kind, a, b } = media
  return kind === "사진:상품" ? <ProductPhoto item={a} name={b || sender || ""} />
    : kind === "사진:송장" ? <Waybill courier={a} item={b} sender={sender || ""} />
    : kind === "사진:입금확인" ? <TransferCapture amount={a} name={b || sender || ""} />
    : kind === "공문" ? <CaseDocument org={a} title={b} />
    : <LoanApproval org={a} limit={b} />
}

/** 중고거래 화면 위 상품 카드의 작은 사진 */
export function ItemThumb({ item }: { item: string }) {
  const shape = itemShape(item)
  return <PhotoImg photo={SIM_PHOTOS[shape] ? shape : "box"} alt=""
    fallback={<svg viewBox="-80 -60 160 120"><ItemDrawing shape={shape} cx={0} cy={0} s={0.8} /></svg>} />
}
