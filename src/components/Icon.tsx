import type React from "react"
import type { IconName } from "@/types/common"

export interface IconProps {
  name: IconName
  size?: number
}

export function Icon({ name, size = 24 }: IconProps) {
  const paths: Record<IconName, React.ReactNode> = {
    shield: (
      <>
        <path d="M12 3 4.5 6v5.6c0 4.6 3.1 7.6 7.5 9.4 4.4-1.8 7.5-4.8 7.5-9.4V6L12 3Z" />
        <path d="m8.8 12 2.1 2.1 4.5-4.6" />
      </>
    ),
    chat: (
      <>
        <path d="M5 5.5h14v10H9l-4 3v-13Z" />
        <path d="M9 9h6M9 12h4" />
      </>
    ),
    bell: (
      <>
        <path d="M6.5 16.5h11L16 14V9a4 4 0 0 0-8 0v5l-1.5 2.5Z" />
        <path d="M10 19h4" />
      </>
    ),
    spark: (
      <>
        <path d="m12 3 1.3 4.2L17.5 8.5l-4.2 1.3L12 14l-1.3-4.2-4.2-1.3 4.2-1.3L12 3Z" />
        <path d="m18.5 14 .7 2.3 2.3.7-2.3.7-.7 2.3-.7-2.3-2.3-.7 2.3-.7.7-2.3Z" />
      </>
    ),
    building: (
      <>
        <path d="M4 20h16M6 17h12M7 9v8M11 9v8M15 9v8M19 7H5l7-4 7 4Z" />
      </>
    ),
    send: (
      <>
        <path d="m4 4 17 8-17 8 3-8-3-8Z" />
        <path d="M7 12h14" />
      </>
    ),
    link: (
      <>
        <path d="M9.5 14.5 14.5 9" />
        <path d="M7.5 16.5 6 18a3 3 0 0 1-4-4l3-3a3 3 0 0 1 4 0M16.5 7.5 18 6a3 3 0 0 1 4 4l-3 3a3 3 0 0 1-4 0" />
      </>
    ),
    phone: (
      <path d="M7 3H4.5A1.5 1.5 0 0 0 3 4.5C3 13.6 10.4 21 19.5 21a1.5 1.5 0 0 0 1.5-1.5V17l-4-1-1.2 2.2a14.5 14.5 0 0 1-10-10L8 7 7 3Z" />
    ),
    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c.8-4.1 3.5-6 8-6s7.2 1.9 8 6" />
      </>
    ),
    app: (
      <>
        <rect x="4" y="3" width="16" height="18" rx="3" />
        <path d="M9 7h6M10 17h4" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    lock: (
      <>
        <rect x="5" y="10" width="14" height="11" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" />
      </>
    ),
    search: (
      <>
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m16 16 5 5" />
      </>
    ),
    arrow: (
      <>
        <path d="M5 12h14M14 7l5 5-5 5" />
      </>
    ),
    download: (
      <>
        <path d="M12 3v12M7 10l5 5 5-5M4 21h16" />
      </>
    ),
    refresh: (
      <>
        <path d="M20 7v5h-5M4 17v-5h5" />
        <path d="M6.1 8A7 7 0 0 1 18 6l2 6M17.9 16A7 7 0 0 1 6 18l-2-6" />
      </>
    ),
    alert: (
      <>
        <path d="M12 3 2.5 20h19L12 3Z" />
        <path d="M12 9v5M12 17h.01" />
      </>
    ),
    close: (
      <>
        <path d="m6 6 12 12M18 6 6 18" />
      </>
    ),
    cart: (
      <>
        <path d="M3 4h2l2.2 10.2a2 2 0 0 0 2 1.6h7.9a2 2 0 0 0 2-1.7L20.5 8H6" />
        <circle cx="10" cy="20" r="1" />
        <circle cx="18" cy="20" r="1" />
      </>
    ),
    image: (
      <>
        <rect x="3" y="4" width="18" height="16" rx="3" />
        <circle cx="9" cy="10" r="2" />
        <path d="m5 18 4.5-4.5 3 3 2.5-2.5 4 4" />
      </>
    ),
  }
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  )
}
