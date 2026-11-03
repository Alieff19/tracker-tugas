'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, KeyRound, UserPlus } from 'lucide-react'
import { Auth, Grup } from '@/lib/api'
import { useToast } from '@/components/ToastProvider'
import {
  Button,
  Card,
  Field,
  Input,
  Logo,
  PageLoader,
} from '@/components/ui'
import { ScrollReveal } from '@/components/motion'
import BrandPanel from '@/components/BrandPanel'

export default function JoinGroupPage({ params }) {
  const { group_id: groupId } = use(params)
  const router = useRouter()
  const toast = useToast()

  const [code, setCode] = useState('')
  const [checking, setChecking] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const checkSession = async () => {
      try {
        const user = await Auth.userSaatIni()
        if (!user) {
          toast.info('Please sign in first to join this group')
          router.replace(`/login?redirect=/join/${groupId}`)
          return
        }
        const myGroups = await Grup.daftarSaya()
        const alreadyMember = myGroups?.some((d) => d.groups?.id === groupId)
        if (alreadyMember) {
          toast.info('You are already a member of this group')
          router.replace(`/grup/${groupId}`)
          return
        }
      } catch {
        // Ignore
      } finally {
        setChecking(false)
      }
    }
    checkSession()
  }, [groupId, router, toast])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!code.trim()) return
    setSubmitting(true)
    try {
      const group = await Grup.gabung(code.trim())
      toast.success(`Joined "${group.nama}"`)
      router.push(`/grup/${group.id}`)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (checking) {
    return <PageLoader label="Checking invitation" fullscreen />
  }

  return (
    <div className="auth-layout page-wash">
      <BrandPanel />
      <div className="auth-mobile-logo"><Link href="/dashboard"><Logo /></Link></div>
      <div className="auth-form-side">
      <ScrollReveal variant="pop">
        <Card className="p-7">
          <div className="hover-wiggle mb-5 flex size-12 items-center justify-center rounded-2xl border border-accent/15 bg-accent-soft text-accent">
            <UserPlus className="size-5" strokeWidth={1.75} />
          </div>

          <h1 className="text-3xl font-medium tracking-[-0.05em] text-ink">Join group</h1>
          <p className="mt-1 text-[13px] leading-relaxed text-ink-2">
            Enter the 6-character invite code shared by your group leader to confirm access.
          </p>

          <div className="mt-4 flex items-center justify-between rounded-lg border border-line bg-canvas px-3 py-2 text-xs">
            <span className="text-ink-3">Group ID</span>
            <code className="max-w-[180px] truncate font-mono text-ink-2">
              {groupId}
            </code>
          </div>

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <Field label="Invite code">
              <Input
                icon={KeyRound}
                required
                maxLength={10}
                value={code}
                onChange={(e) => setCode(e.target.value.toLowerCase())}
                placeholder="92d9c1"
                className="font-mono tracking-widest lowercase"
                autoFocus
              />
            </Field>

            <Button
              type="submit"
              loading={submitting}
              iconRight={ArrowRight}
              className="w-full"
            >
              Join group
            </Button>
          </form>

          <div className="mt-5 border-t border-line pt-4 text-center">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-2 transition-colors hover:text-ink"
            >
              <ArrowLeft className="size-3.5" strokeWidth={1.75} />
              <span>Back to all groups</span>
            </Link>
          </div>
        </Card>
        <p className="auth-footnote">GoTaks — Student group task tracker</p>
      </ScrollReveal>
      </div>
    </div>
  )
}
