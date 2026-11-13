export function PageIntro({
  kicker,
  title,
  subtitle,
}: {
  kicker: string
  title: string
  subtitle: string
}) {
  return (
    <div className="page-intro">
      <span>{kicker}</span>
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </div>
  )
}
