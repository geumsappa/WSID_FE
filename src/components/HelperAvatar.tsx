/** 어떡하지 도우미 얼굴 (로고의 경찰 캐릭터). 긴급 대응 채팅·시뮬레이션 상황 이야기에서 써요 */
export function HelperAvatar({ size = 40 }: { size?: number }) {
  return <img className="v2-helper-avatar" src="/mascot.png" alt="" width={size} height={Math.round(size * 0.89)} />
}
