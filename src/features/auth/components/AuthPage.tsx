import { useState } from "react"
import type React from "react"
import { Icon } from "@/components/Icon"
import { readStore } from "@/lib/storage"
import { ACCOUNT_KEY, hashDemoPassword } from "../lib/demoAuth"
import type { DemoAccount } from "../types"

// Front-end preview only: wire these screens to Spring AUTH-001/002/003/004 for production.
export function AuthPage({ mode, onSwitch, onLogin }: { mode: "login" | "signup"; onSwitch: () => void; onLogin: (account: DemoAccount) => void }) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [gender, setGender] = useState("")
  const [sentCode, setSentCode] = useState("")
  const [code, setCode] = useState("")
  const [expires, setExpires] = useState(0)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const signup = mode === "signup"
  const sendCode = () => {
    setError("")
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) { setError("올바른 이메일 주소를 입력해 주세요."); return }
    const accounts = readStore<DemoAccount[]>(ACCOUNT_KEY, [])
    if (accounts.some(a => a.email === email.trim().toLowerCase() && a.verified)) { setError("이미 가입된 이메일입니다. 로그인해 주세요."); return }
    setSentCode(String(Math.floor(100000 + Math.random() * 900000)))
    setExpires(Date.now() + 5 * 60 * 1000)
    setCode("")
  }
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError("")
    const cleanEmail = email.trim().toLowerCase()
    if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) { setError("올바른 이메일을 입력해 주세요."); return }
    if (!password) { setError("비밀번호를 입력해 주세요."); return }
    setBusy(true)
    try {
      const accounts = readStore<DemoAccount[]>(ACCOUNT_KEY, [])
      if (signup) {
        if (!name.trim()) throw Error("이름을 입력해 주세요.")
        if (!gender) throw Error("성별을 선택해 주세요.")
        if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) throw Error("비밀번호는 영문과 숫자를 포함한 8자 이상으로 설정해 주세요.")
        if (password !== confirm) throw Error("비밀번호가 일치하지 않습니다.")
        if (!sentCode) throw Error("이메일 인증 코드를 먼저 발급해 주세요.")
        if (Date.now() > expires) throw Error("인증 코드가 만료됐어요. 재발급해 주세요.")
        if (code !== sentCode) throw Error("인증 코드가 일치하지 않습니다.")
        if (accounts.some(a => a.email === cleanEmail)) throw Error("이미 가입된 이메일입니다. 로그인해 주세요.")
        const salt = crypto.randomUUID()
        const account: DemoAccount = { name: name.trim(), email: cleanEmail, gender, salt, passwordHash: await hashDemoPassword(password, salt), verified: true }
        localStorage.setItem(ACCOUNT_KEY, JSON.stringify([...accounts, account]))
        onLogin(account)
      } else {
        const account = accounts.find(a => a.email === cleanEmail)
        if (!account || account.passwordHash !== await hashDemoPassword(password, account.salt)) throw Error("이메일 또는 비밀번호를 확인해 주세요.")
        if (!account.verified) throw Error("이메일 인증을 완료한 뒤 로그인해 주세요.")
        onLogin(account)
      }
    } catch (err) { setError(err instanceof Error ? err.message : "처리 중 오류가 발생했습니다.") }
    finally { setBusy(false) }
  }
  return <section className="subpage account-page"><div className="account-shell">
    <div className="account-intro"><span className="account-kicker"><Icon name="shield" size={16}/> 안전한 금융생활의 시작</span><h1>{signup ? "회원가입" : "다시 만나 반가워요!"}</h1><p>{signup ? "어떡하지와 함께 사기 대응을 연습하고 나만의 기록을 관리해 보세요." : "로그인하고 저장한 리포트와 긴급대응 대화를 확인하세요."}</p></div>
    <form className="account-card" onSubmit={submit}>
      {signup && <label>이름<input value={name} onChange={e => setName(e.target.value)} placeholder="이름을 입력해 주세요" autoComplete="name" required /></label>}
      <label>이메일 주소<div className="auth-input-line"><input type="email" value={email} onChange={e => { setEmail(e.target.value); setSentCode("") }} placeholder="example@email.com" autoComplete="email" required />{signup && <button type="button" className="auth-code-button" onClick={sendCode}>{sentCode ? "재발급" : "인증하기"}</button>}</div></label>
      {signup && sentCode && <div className="auth-verification"><label>이메일 인증번호<input value={code} onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" maxLength={6} placeholder="6자리 인증번호" required /></label><p className="demo-code-note">화면 시연용 인증번호: <strong>{sentCode}</strong> (5분 유효) — 실제 이메일은 발송되지 않습니다.</p></div>}
      <label>비밀번호<div className="auth-input-line"><input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder={signup ? "영문·숫자 포함 8자 이상" : "비밀번호 입력"} autoComplete={signup ? "new-password" : "current-password"} required /><button className="password-toggle" type="button" onClick={() => setShowPassword(x => !x)}>{showPassword ? "숨기기" : "보기"}</button></div></label>
      {signup && <><label>비밀번호 확인<input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} autoComplete="new-password" placeholder="비밀번호를 다시 입력해 주세요" required /></label><fieldset className="gender-set"><legend>성별</legend><div>{[["female", "여성"], ["male", "남성"], ["other", "기타 / 응답하지 않음"]].map(([v, t]) => <label key={v} className={gender === v ? "selected" : ""}><input type="radio" name="gender" value={v} checked={gender === v} onChange={() => setGender(v)} />{t}</label>)}</div></fieldset></>}
      {error && <p className="auth-error" role="alert">{error}</p>}
      <button className="primary-button auth-submit" type="submit" disabled={busy}>{busy ? "처리 중..." : signup ? "가입 완료하기" : "로그인"} <Icon name="arrow" size={17}/></button>
      <p className="auth-switch">{signup ? "이미 계정이 있으신가요?" : "아직 회원이 아니신가요?"} <button type="button" onClick={onSwitch}>{signup ? "로그인" : "회원가입"}</button></p>
      <p className="auth-prototype">현재 화면은 프런트엔드 데모입니다. 계정은 이 브라우저에만 저장되며 실제 이메일 발송, 서버 인증, 안전한 계정 관리는 구현 전입니다. 실제 개인정보나 사용 중인 비밀번호를 입력하지 마세요.</p>
    </form>
  </div></section>
}
