export function Logo({ onClick }: { onClick: () => void }) {
  return (
    <button
      className="logo"
      onClick={onClick}
      aria-label="어떡하지 홈으로 이동"
    >
      <img className="logo-wordmark" src="/logo-wordmark.png" alt="어떡하지" />
    </button>
  )
}
