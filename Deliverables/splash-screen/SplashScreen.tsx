import './splash.css'

type SplashScreenProps = { visible: boolean; label?: string }

/** The host controls readiness. No timer, network requests or business state. */
export function SplashScreen({ visible, label = '正在打开校园空间' }: SplashScreenProps) {
  if (!visible) return null
  return <div className="cc-splash" role="status" aria-live="polite" aria-busy="true">
    <div className="cc-splash__brand">
      <svg className="cc-splash__mark" viewBox="0 0 80 80" fill="none" aria-hidden="true">
        <rect x="1" y="1" width="78" height="78" rx="25" fill="#b84020"/>
        <path d="M23 54V33c0-9 6-15 14-15h6v9h-6c-3 0-5 2-5 6v21Z" fill="#fff9f1"/>
        <path d="M57 26v21c0 9-6 15-14 15h-6v-9h6c3 0 5-2 5-6V26Z" fill="#f2d5c6"/>
        <path d="m28 45 23-15v10L28 55Z" fill="#fff9f1"/>
      </svg>
      <h1 className="cc-splash__name">心伙伴</h1>
      <p className="cc-splash__tagline">你的校园，你的伙伴</p>
      <div className="cc-splash__loader" aria-hidden="true">{[0, 1, 2].map(i => <span key={i} className="cc-splash__dot"/>)}</div>
      <span className="cc-splash__sr-only">{label}</span>
    </div>
    <p className="cc-splash__signature" aria-hidden="true">校园生活 · 随时相伴</p>
  </div>
}
