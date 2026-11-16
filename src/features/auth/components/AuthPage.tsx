import { useState } from "react"
import type React from "react"
import { ApiError, authApi, errorMessage, USE_MOCK } from "@/api"
import type { Gender } from "@/api"
import { Icon } from "@/components/Icon"

// 회원가입(AUTH-01) → 이메일 인증(AUTH-02·03) → 로그인(AUTH-04) 순서로 백엔드와 통신합니다.
export function AuthPage({ mode, onSwitch, onLogin }: {
  mode: "login" | "signup"
  onSwitch: () => void
  /** 로그인 요청. 실패하면 에러를 던집니다 */
  onLogin: (email: string, password: string) => Promise<void>
}) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [gender, setGender] = useState<Gender | "NONE" | "">("")
  const [code, setCode] = useState("")
  /** verify: 인증번호 입력 단계 (가입 직후, 또는 미인증 계정으로 로그인했을 때) */
  const [step, setStep] = useState<"form" | "verify">("form")
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [busy, setBusy] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const signup = mode === "signup"
  const cleanEmail = email.trim().toLowerCase()
  const devCode = step === "verify" ? authApi.devVerificationCode(cleanEmail) : undefined

  const run = async (work: () => Promise<void>) => {
    setError("")
    setBusy(true)
    try { await work() } catch (err) { setError(err instanceof Error && !(err instanceof ApiError) ? err.message : errorMessage(err)) } finally { setBusy(false) }
  }
  const submitForm = (e: React.FormEvent) => {
    e.preventDefault()
    setNotice("")
    void run(async () => {
      if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) throw Error("올바른 이메일 주소를 입력해 주세요.")
      if (!password) throw Error("비밀번호를 입력해 주세요.")
      if (signup) {
        if (!gender) throw Error("성별을 선택해 주세요.")
        if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) throw Error("비밀번호는 영문과 숫자를 포함한 8자 이상으로 설정해 주세요.")
        if (password !== confirm) throw Error("비밀번호가 일치하지 않습니다.")
        await authApi.signup({ email: cleanEmail, password, gender: gender === "NONE" ? null : gender })
        setCode("")
        setStep("verify")
        setNotice("입력하신 이메일로 인증번호를 보냈어요.")
      } else {
        try {
          await onLogin(cleanEmail, password)
        } catch (err) {
          // 가입은 했지만 이메일 인증을 마치지 않은 계정 → 인증 단계로 안내
          if (err instanceof ApiError && err.code === "EMAIL_NOT_VERIFIED") {
            setCode("")
            setStep("verify")
            setNotice("이메일 인증을 먼저 완료해 주세요. 인증번호가 없으면 재발송을 눌러 주세요.")
            return
          }
          throw err
        }
      }
    })
  }
  const submitCode = (e: React.FormEvent) => {
    e.preventDefault()
    setNotice("")
    void run(async () => {
      if (code.length < 4) throw Error("인증번호를 입력해 주세요.")
      await authApi.verifyEmail({ email: cleanEmail, code })
      await onLogin(cleanEmail, password) // 인증이 끝나면 바로 로그인
    })
  }
  const resend = () =>
    void run(async () => {
      const res = await authApi.resendEmailCode(cleanEmail)
      setCode("")
      setNotice(res?.message || "인증번호를 다시 보냈어요.")
    })

  return <section className="subpage account-page"><div className="account-shell">
    <div className="account-intro"><span className="account-kicker"><Icon name="shield" size={16}/> 안전한 금융생활의 시작</span><h1>{step === "verify" ? "이메일 인증" : signup ? "회원가입" : "다시 만나 반가워요!"}</h1><p>{step === "verify" ? "메일로 받은 인증번호를 입력하면 가입이 완료돼요." : signup ? "어떡하지와 함께 사기 대응을 연습하고 나만의 기록을 관리해 보세요." : "로그인하고 훈련을 이어 가거나 저장한 리포트를 확인하세요."}</p></div>
    {step === "form" ? <form className="account-card" onSubmit={submitForm}>
      <label>이메일 주소<input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="example@email.com" autoComplete="email" required /></label>
      <label>비밀번호<div className="auth-input-line"><input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder={signup ? "영문·숫자 포함 8자 이상" : "비밀번호 입력"} autoComplete={signup ? "new-password" : "current-password"} required /><button className="password-toggle" type="button" onClick={() => setShowPassword(x => !x)}>{showPassword ? "숨기기" : "보기"}</button></div></label>
      {signup && <><label>비밀번호 확인<input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} autoComplete="new-password" placeholder="비밀번호를 다시 입력해 주세요" required /></label><fieldset className="gender-set"><legend>성별</legend><div>{([["FEMALE", "여성"], ["MALE", "남성"], ["NONE", "선택 안 함"]] as const).map(([v, t]) => <label key={v} className={gender === v ? "selected" : ""}><input type="radio" name="gender" value={v} checked={gender === v} onChange={() => setGender(v)} />{t}</label>)}</div></fieldset></>}
      {notice && <p className="demo-code-note" role="status">{notice}</p>}
      {error && <p className="auth-error" role="alert">{error}</p>}
      <button className="primary-button auth-submit" type="submit" disabled={busy}>{busy ? "처리 중..." : signup ? "인증 메일 받기" : "로그인"} <Icon name="arrow" size={17}/></button>
      <p className="auth-switch">{signup ? "이미 계정이 있으신가요?" : "아직 회원이 아니신가요?"} <button type="button" onClick={onSwitch}>{signup ? "로그인" : "회원가입"}</button></p>
      {USE_MOCK && <p className="auth-prototype">지금은 서버 없이 동작하는 mock 모드입니다. 계정은 이 브라우저에만 저장되고 실제 메일은 발송되지 않아요. 사용 중인 비밀번호를 입력하지 마세요.</p>}
    </form> : <form className="account-card" onSubmit={submitCode}>
      <label>이메일 주소<input type="email" value={cleanEmail} readOnly /></label>
      <div className="auth-verification"><label>이메일 인증번호<div className="auth-input-line"><input value={code} onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" maxLength={6} placeholder="6자리 인증번호" autoFocus required /><button type="button" className="auth-code-button" onClick={resend} disabled={busy}>재발송</button></div></label>
        {devCode && <p className="demo-code-note">mock 모드 인증번호: <strong>{devCode}</strong> — 실제 서버에서는 메일로 발송됩니다.</p>}
      </div>
      {notice && <p className="demo-code-note" role="status">{notice}</p>}
      {error && <p className="auth-error" role="alert">{error}</p>}
      <button className="primary-button auth-submit" type="submit" disabled={busy}>{busy ? "확인 중..." : "인증하고 시작하기"} <Icon name="arrow" size={17}/></button>
      <p className="auth-switch">이메일을 잘못 입력하셨나요? <button type="button" onClick={() => { setStep("form"); setError(""); setNotice("") }}>다시 입력</button></p>
    </form>}
  </div></section>
}
