import type React from "react"

/**
 * 어떡하지 아이콘 세트 (48px 격자, 두 가지 색). 디자인 시안의 아이콘과 같아요.
 * - 사기 유형: institution loan acquaintance smishing trade investment
 * - 할 일·기능: call stop appcheck idcheck report photo shield chat
 * tone으로 색을 바꿔 써요: blue(기본) · gray(비활성) · white(파란 버튼 위)
 */
export type DuoIconName =
  | "institution" | "loan" | "acquaintance" | "smishing" | "trade" | "investment"
  | "call" | "stop" | "appcheck" | "idcheck" | "report" | "photo" | "shield" | "chat"

const TONES = {
  blue: ["#1B64DA", "#A9C6F7", "#FFFFFF"],
  gray: ["#6B7684", "#D1D6DB", "#FFFFFF"],
  white: ["#FFFFFF", "#8DB3F2", "#1B64DA"],
} as const

const ICONS: Record<DuoIconName, (p: string, l: string, w: string) => React.ReactNode> = {
  institution: (p, l, w) => <><path d="M24 5 L43 15 L43 18 L5 18 L5 15 Z" fill={p} /><rect x="9" y="21" width="6" height="14" rx="1.5" fill={l} /><rect x="21" y="21" width="6" height="14" rx="1.5" fill={l} /><rect x="33" y="21" width="6" height="14" rx="1.5" fill={l} /><rect x="5" y="37" width="38" height="6" rx="2" fill={p} /></>,
  loan: (p, l, w) => <><rect x="4" y="11" width="30" height="20" rx="4" fill={l} /><rect x="14" y="18" width="30" height="20" rx="4" fill={p} /><circle cx="29" cy="28" r="5" fill={w} /><path d="M9 35 C9 40 12 43 16 43" stroke={p} strokeWidth="3" fill="none" strokeLinecap="round" /></>,
  acquaintance: (p, l, w) => <><path d="M14 6 H34 A8 8 0 0 1 42 14 V28 A8 8 0 0 1 34 36 H22 L13 43 L14 36 A8 8 0 0 1 6 28 V14 A8 8 0 0 1 14 6 Z" fill={p} /><circle cx="24" cy="17" r="5" fill={w} /><path d="M15 31 C15 25 33 25 33 31 Z" fill={w} /><circle cx="38" cy="10" r="6" fill={l} /></>,
  smishing: (p, l, w) => <><rect x="12" y="3" width="24" height="42" rx="6" fill={p} /><rect x="15.5" y="8" width="17" height="30" rx="2.5" fill={w} /><rect x="18" y="12" width="12" height="9" rx="3" fill={l} /><path d="M21 27 a3.5 3.5 0 0 1 5 0 l1.5 1.5" stroke={p} strokeWidth="2.6" fill="none" strokeLinecap="round" /><path d="M27 33 a3.5 3.5 0 0 1 -5 0 l-1.5 -1.5" stroke={p} strokeWidth="2.6" fill="none" strokeLinecap="round" /></>,
  trade: (p, l, w) => <><rect x="7" y="17" width="34" height="25" rx="3" fill={p} /><path d="M9 8 H39 L43 17 H5 Z" fill={l} /><rect x="20" y="8" width="8" height="15" fill={w} /><rect x="12" y="32" width="10" height="4" rx="2" fill={w} /></>,
  investment: (p, l, w) => <><rect x="7" y="29" width="8" height="13" rx="2" fill={l} /><rect x="20" y="23" width="8" height="19" rx="2" fill={l} /><rect x="33" y="17" width="8" height="25" rx="2" fill={l} /><path d="M7 22 L17 13 L25 18 L39 6" stroke={p} strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" /><path d="M31 6 H40 V15" stroke={p} strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" /></>,
  call: (p, l, w) => <><path d="M14 5 C16.5 5 17.6 6.2 18.6 8.6 L21 14.4 C21.7 16.2 21.2 18 19.8 19.2 L17.4 21.2 C19.6 25.8 22.2 28.4 26.8 30.6 L28.8 28.2 C30 26.8 31.8 26.3 33.6 27 L39.4 29.4 C41.8 30.4 43 31.5 43 34 V37 C43 40.3 40.3 43 37 43 C19.3 43 5 28.7 5 11 C5 7.7 7.7 5 11 5 Z" fill={p} /><path d="M29 6 A13 13 0 0 1 42 19" stroke={l} strokeWidth="3.5" fill="none" strokeLinecap="round" /><path d="M28 13 A6 6 0 0 1 35 20" stroke={l} strokeWidth="3.5" fill="none" strokeLinecap="round" /></>,
  stop: (p, l, w) => <><polygon points="42.5,31.7 31.7,42.5 16.3,42.5 5.5,31.7 5.5,16.3 16.3,5.5 31.7,5.5 42.5,16.3" fill={p} /><polygon points="37.9,29.7 29.7,37.9 18.3,37.9 10.1,29.7 10.1,18.3 18.3,10.1 29.7,10.1 37.9,18.3" fill="none" stroke={l} strokeWidth="2" /><rect x="13" y="21" width="22" height="6" rx="3" fill={w} /></>,
  appcheck: (p, l, w) => <><rect x="8" y="3" width="24" height="42" rx="6" fill={p} /><rect x="11.5" y="8" width="17" height="30" rx="2.5" fill={w} /><rect x="15" y="12" width="5" height="5" rx="1.5" fill={l} /><rect x="21" y="12" width="5" height="5" rx="1.5" fill={l} /><rect x="15" y="19" width="5" height="5" rx="1.5" fill={l} /><circle cx="35" cy="33" r="10" fill={l} /><path d="M30.5 28.5 L39.5 37.5 M39.5 28.5 L30.5 37.5" stroke={p} strokeWidth="3.2" strokeLinecap="round" /></>,
  idcheck: (p, l, w) => <><rect x="4" y="9" width="40" height="28" rx="5" fill={l} /><circle cx="15" cy="20" r="4.5" fill={p} /><path d="M8 31 C8 25 22 25 22 31 Z" fill={p} /><rect x="26" y="16" width="13" height="3.5" rx="1.75" fill={p} /><rect x="26" y="23" width="9" height="3.5" rx="1.75" fill={p} /><circle cx="36" cy="37" r="8" fill={p} /><path d="M32.2 37 L35 39.8 L40 34.6" stroke={w} strokeWidth="2.8" fill="none" strokeLinecap="round" strokeLinejoin="round" /></>,
  report: (p, l, w) => <><path d="M12 35 V25 A12 12 0 0 1 36 25 V35 Z" fill={p} /><rect x="7" y="35" width="34" height="7" rx="2.5" fill={l} /><path d="M18 26 A6 6 0 0 1 24 20" stroke={w} strokeWidth="3" fill="none" strokeLinecap="round" /><path d="M24 3 V8 M8 9 L11.5 12.5 M40 9 L36.5 12.5" stroke={l} strokeWidth="3.5" strokeLinecap="round" /></>,
  photo: (p, l, w) => <><rect x="4" y="9" width="40" height="30" rx="6" fill={l} /><path d="M8 35 L19 22 L27 31 L31 27 L40 35 Z" fill={p} /><circle cx="33" cy="17" r="4" fill={p} /></>,
  shield: (p, l, w) => <><path d="M24 4 L40 10 V22 C40 32 33 40 24 44 C15 40 8 32 8 22 V10 Z" fill={p} /><path d="M24 9 L35 13.2 V22 C35 29 30.5 34.6 24 38 Z" fill={l} opacity="0.45" /><rect x="17.5" y="22" width="13" height="10" rx="2.5" fill={w} /><path d="M20.5 22 V19 A3.5 3.5 0 0 1 27.5 19 V22" stroke={w} strokeWidth="2.8" fill="none" /></>,
  chat: (p, l, w) => <><path d="M12 7 H36 A7 7 0 0 1 43 14 V28 A7 7 0 0 1 36 35 H20 L11 42 L12 35 A7 7 0 0 1 5 28 V14 A7 7 0 0 1 12 7 Z" fill={p} /><circle cx="16" cy="21" r="2.8" fill={w} /><circle cx="24" cy="21" r="2.8" fill={w} /><circle cx="32" cy="21" r="2.8" fill={w} /></>,
}

export function DuoIcon({ name, size = 32, tone = "blue", label }: { name: DuoIconName; size?: number; tone?: keyof typeof TONES; label?: string }) {
  const [p, l, w] = TONES[tone]
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true} style={{ flex: "none", display: "block" }}>
      {ICONS[name](p, l, w)}
    </svg>
  )
}
