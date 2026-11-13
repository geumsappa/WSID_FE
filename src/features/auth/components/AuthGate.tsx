import { Icon } from "@/components/Icon"

export function AuthGate({ onLogin, message = "마이페이지와 저장한 기록은 로그인 후 확인할 수 있어요." }: { onLogin: () => void; message?: string }) { return <section className="subpage account-page"><div className="account-card gate-card"><div className="account-icon"><Icon name="lock" size={28} /></div><h1>로그인이 필요해요</h1><p>{message}</p><button className="primary-button" onClick={onLogin}>로그인하러 가기 <Icon name="arrow"/></button></div></section> }
