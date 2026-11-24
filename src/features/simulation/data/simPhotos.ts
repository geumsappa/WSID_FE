/**
 * 사기범이 보내는 '물건 인증샷'·'송장 사진'에 쓰는 실제 사진 (Unsplash License: 무료, 상업 이용 가능, 출처 표기 의무 없음)
 * - 먼저 public/sim-photos/<이름>.jpg (scripts/download-sim-photos.ps1 로 받아 두는 로컬 사본)를 쓰고,
 *   없으면 Unsplash 원본 주소, 그것도 안 되면 앱이 그린 그림으로 보여 줘요.
 * - 사진을 바꾸려면 여기 id·초점(fp)과 다운로드 스크립트의 주소를 같이 바꿔요. 출처는 public/sim-photos/CREDITS.md
 */
export type SimPhoto = { id: string; fx: number; fy: number; zoom: number; credit: string }

export const SIM_PHOTOS: Record<string, SimPhoto> = {
  microwave: { id: "photo-1630699293875-e56c25151c4b", fx: 0.52, fy: 0.33, zoom: 2.6, credit: "Point3D Commercial Imaging Ltd." },
  laptop: { id: "photo-1654267288787-a571aecf0505", fx: 0.5, fy: 0.5, zoom: 1, credit: "Rui Silvestre" },
  phone: { id: "photo-1709722321440-e03db4ab9eca", fx: 0.45, fy: 0.45, zoom: 1.2, credit: "David Švihovec" },
  console: { id: "photo-1755589614356-bf6d276f5ca5", fx: 0.4, fy: 0.5, zoom: 1, credit: "User_Pascal" },
  bike: { id: "photo-1692152004188-df5b3c9447fe", fx: 0.5, fy: 0.55, zoom: 1, credit: "Chewool Kim" },
  bag: { id: "photo-1612902456551-333ac5afa26e", fx: 0.5, fy: 0.5, zoom: 1, credit: "Farah Samy" },
  shoes: { id: "photo-1634671494478-18ae96453241", fx: 0.5, fy: 0.55, zoom: 1.2, credit: "Kimia Zarifi" },
  camera: { id: "photo-1698502453332-03fa2ddceb71", fx: 0.55, fy: 0.5, zoom: 1, credit: "Indra Projects" },
  // 사진이 없는 물건은 포장해 둔 상자 사진으로 보여 줘요 ("포장까지 해 뒀어요")
  box: { id: "photo-1631010231931-d2c396b444ec", fx: 0.5, fy: 0.5, zoom: 1, credit: "Mediamodifier" },
  // 송장 사진 배경: 같은 상자의 골판지 면을 가까이 (라벨을 그 위에 붙여 보여 줘요)
  cardboard: { id: "photo-1631010231931-d2c396b444ec", fx: 0.5, fy: 0.3, zoom: 2.6, credit: "Mediamodifier" },
}

const BASE = (import.meta.env.BASE_URL || "/").replace(/\/?$/, "/")

/** [로컬 사본, Unsplash 원본] 순서로 시도할 주소 */
export function photoSources(key: string): string[] {
  const p = SIM_PHOTOS[key] ?? SIM_PHOTOS.box
  const name = SIM_PHOTOS[key] ? key : "box"
  return [
    `${BASE}sim-photos/${name}.jpg`,
    `https://images.unsplash.com/${p.id}?w=900&h=675&fit=crop&crop=focalpoint&fp-x=${p.fx}&fp-y=${p.fy}&fp-z=${p.zoom}&q=72&fm=jpg`,
  ]
}
