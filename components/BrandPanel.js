import Link from 'next/link'
import { Check } from 'lucide-react'
import { Logo, LogoMark } from './ui'
import { TiltSurface } from './motion'

export default function BrandPanel() {
  return (
    <aside className="auth-story">
      <Link href="/" className="self-start"><Logo /></Link>
      <h2>Good work.<br /><span>Shared fairly.</span></h2>
      <p>A shared board, thoughtful reviews, and a clear record of everyone’s contribution. Group projects feel better here.</p>
      <div className="auth-mascot-stage"><TiltSurface><div className="animate-float"><LogoMark className="auth-mascot" /></div></TiltSurface></div>
      <div className="auth-story-foot"><Check size={14} /><span>2–5 teammates. One shared workspace.</span></div>
    </aside>
  )
}
