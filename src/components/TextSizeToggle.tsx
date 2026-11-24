import { useEffect, useState } from "react"

const KEY = "wsid.text-large"
const read = () => {
  try { return localStorage.getItem(KEY) === "1" } catch { return false }
}

/** 글자 크게 보기 (어르신용). 화면 전체를 조금 키워요. 고른 값은 이 브라우저에 기억해요 */
export function TextSizeToggle() {
  const [large, setLarge] = useState(read)
  useEffect(() => {
    document.documentElement.classList.toggle("text-large", large)
    try { localStorage.setItem(KEY, large ? "1" : "0") } catch { /* 저장 못 해도 동작은 해요 */ }
  }, [large])
  return (
    <button type="button" className="v2-text-size" aria-pressed={large} onClick={() => setLarge((v) => !v)}
      title={large ? "글자 원래 크기로" : "글자 크게 보기"}>
      <span aria-hidden="true" style={{ fontSize: 14 }}>가</span><span aria-hidden="true" style={{ fontSize: 20 }}>가</span>
      <span className="v2-sr">{large ? "글자 원래 크기로" : "글자 크게 보기"}</span>
    </button>
  )
}
