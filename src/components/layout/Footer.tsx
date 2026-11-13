import { Logo } from "@/components/Logo"

export function Footer({ onHome }: { onHome: () => void }) {
  return (
    <footer className="footer no-print">
      <div>
        <Logo onClick={() => onHome()} />
        <p>금융사기 예방을 위한 안전한 연습과 대응 안내</p>
      </div>
      <p>
        어떡하지의 안내는 교육용이며 공식 수사·신고 및 금융회사 상담을
        대신하지 않습니다.
      </p>
    </footer>
  )
}
