'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, KeyRound, Lock, Mail, User } from 'lucide-react'
import { Auth } from '@/lib/api'
import { safeRedirect } from '@/lib/auth-redirect'
import { useToast } from '@/components/ToastProvider'
import {
  Button,
  Card,
  Field,
  GoogleIcon,
  Input,
  Logo,
  PageLoader,
  Segmented,
} from '@/components/ui'
import { ScrollReveal } from '@/components/motion'
import BrandPanel from '@/components/BrandPanel'

const DEMO_ACCOUNTS = [
  { email: 'a@test.com', role: 'Leader', name: 'Demo A' },
  { email: 'b@test.com', role: 'Member', name: 'Demo B' },
  { email: 'c@test.com', role: 'External', name: 'Demo C' },
]

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const toast = useToast()

  const initialMode = searchParams.get('mode') === 'signup' ? 'signup' : 'signin'
  const redirectTarget = safeRedirect(searchParams.get('redirect'))

  const [mode, setMode] = useState(initialMode)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleEnabled, setGoogleEnabled] = useState(null)
  const [googleLoading, setGoogleLoading] = useState(false)

  useEffect(() => {
    let active = true
    const checkProvider = (force = false) => {
      Auth.providers({ force }).then((providers) => {
        if (active) setGoogleEnabled(providers.google === true)
      }).catch(() => { if (active) setGoogleEnabled(false) })
    }
    checkProvider()
    // Recheck when returning from provider setup or another browser tab.
    const onFocus = () => checkProvider(true)
    window.addEventListener('focus', onFocus)
    return () => {
      active = false
      window.removeEventListener('focus', onFocus)
    }
  }, [])

  useEffect(() => { router.prefetch(redirectTarget) }, [router, redirectTarget])

  useEffect(() => {
    Auth.userSaatIni()
      .then((u) => {
        if (u) router.replace(redirectTarget)
      })
      .catch(() => {})
  }, [router, redirectTarget])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (mode === 'signup') {
        const displayName = name.trim() || email.split('@')[0]
        const result = await Auth.daftar(email.trim(), password, displayName)
        if (result.session) {
          toast.success('Account created')
          router.push(redirectTarget)
        } else {
          toast.info('Check your email to confirm your account before signing in.')
          setMode('signin')
        }
      } else {
        await Auth.masuk(email.trim(), password)
        toast.success('Signed in')
        router.push(redirectTarget)
      }
    } catch (err) {
      toast.error(err.message || 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    if (!googleEnabled || googleLoading || loading) return
    setGoogleLoading(true)
    try {
      const { error } = await Auth.masukGoogle(redirectTarget)
      if (error) throw new Error(error.message)
    } catch (err) {
      setGoogleLoading(false)
      toast.error(err.message || 'Could not sign in with Google')
    }
  }

  const signInDemo = async (demoEmail, label) => {
    setMode('signin')
    setEmail(demoEmail)
    setPassword('12345678')
    setLoading(true)
    try {
      await Auth.masuk(demoEmail, '12345678')
      toast.success(`Signed in as ${label}`)
      router.push(redirectTarget)
    } catch (err) {
      toast.error(err.message)
      setLoading(false)
    }
  }

  return (
    <div className="auth-layout page-wash">
      <BrandPanel />
      <div className="auth-mobile-logo"><Link href="/"><Logo /></Link></div>
      <div className="auth-form-side">
      <ScrollReveal variant="pop">
        <div className="auth-form-heading">
          <h1>
            {mode === 'signin' ? 'Sign in to GoTaks' : 'Create your account'}
          </h1>
          <p>
            {mode === 'signin'
              ? 'Manage your group tasks and contribution reports.'
              : 'Start organizing coursework with your team.'}
          </p>
        </div>

        <Card className="p-6 sm:p-7">
          <Button
            variant="secondary"
            size="lg"
            onClick={handleGoogle}
            loading={googleLoading || googleEnabled === null}
            disabled={!googleEnabled || loading}
            aria-describedby="google-signin-hint"
            className="w-full"
          >
            {!googleLoading && googleEnabled !== null && <GoogleIcon />}
            <span>Continue with Google</span>
          </Button>
          <p id="google-signin-hint" className="mt-2.5 text-center text-xs leading-relaxed text-ink-3" role="status">
            {googleEnabled === null ? 'Checking Google sign-in…' : googleEnabled
              ? 'Choose your Google account. No separate registration needed.'
              : 'Google sign-in is not available yet. You can continue with email below.'}
          </p>
          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-line" />
            <span className="text-xs text-ink-3">or use email</span>
            <div className="h-px flex-1 bg-line" />
          </div>
          <div className="mb-5 flex justify-center">
            <Segmented
              value={mode}
              onChange={setMode}
              options={[
                { value: 'signin', label: 'Sign in' },
                { value: 'signup', label: 'Create account' },
              ]}
            />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div className="stagger-item">
                <Field
                  label="Display name"
                  optional
                  hint="Defaults to the name part of your email if left blank."
                >
                  <Input
                    icon={User}
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Alex Rivera"
                  />
                </Field>
              </div>
            )}

            <Field label="Email address">
              <Input
                icon={Mail}
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@university.edu"
              />
            </Field>

            <Field label="Password">
              <Input
                icon={Lock}
                type="password"
                required
                minLength={mode === 'signup' ? 8 : 1}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'signup' ? 'At least 8 characters' : 'Your password'}
              />
            </Field>

            <Button
              type="submit"
              loading={loading}
              iconRight={ArrowRight}
              className="w-full"
            >
              {mode === 'signin' ? 'Sign in' : 'Create account'}
            </Button>
          </form>

          {/* Instant demo accounts */}
          {process.env.NEXT_PUBLIC_ENABLE_DEMO_LOGIN === 'true' && <div className="mt-6 border-t border-line pt-4">
            <p className="mb-2.5 flex items-center gap-1.5 text-xs font-medium text-ink-2">
              <KeyRound className="size-3.5 text-ink-3" strokeWidth={1.75} />
              Quick demo sign-in
            </p>
            <div className="grid grid-cols-3 gap-2">
              {DEMO_ACCOUNTS.map((d, idx) => (
                <button
                  key={d.email}
                  type="button"
                  disabled={loading}
                  style={{ '--delay': `${idx * 60}ms` }}
                  onClick={() => signInDemo(d.email, `${d.name} (${d.role})`)}
                  className="stagger-item cursor-pointer rounded-lg border border-line bg-canvas px-2.5 py-2 text-left transition-all duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:-translate-y-0.5 hover:border-line-strong hover:bg-muted active:scale-95 disabled:opacity-50"
                >
                  <p className="text-xs font-semibold text-ink">{d.role}</p>
                  <p className="truncate font-mono text-[11px] text-ink-3">
                    {d.email}
                  </p>
                </button>
              ))}
            </div>
          </div>}
        </Card>
      <p className="auth-footnote">
        GoTaks — Student group task tracker
      </p>
      </ScrollReveal>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<PageLoader label="Loading sign in" fullscreen />}>
      <LoginContent />
    </Suspense>
  )
}
