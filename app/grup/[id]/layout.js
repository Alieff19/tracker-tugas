'use client'

import { use, useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Auth, Grup, Tugas } from '@/lib/api'
import { useToast } from '@/components/ToastProvider'
import { GroupContext } from '@/components/GroupContext'
import TopBar from '@/components/TopBar'
import GroupHeader from '@/components/GroupHeader'
import { PageLoader } from '@/components/ui'
import { RouteTransition } from '@/components/motion'

export default function GroupLayout({ children, params }) {
  const { id: groupId } = use(params)
  const router = useRouter()
  const toast = useToast()
  const [state, setState] = useState(null)

  const load = useCallback(async () => {
    try {
      const user = await Auth.userSaatIni()
      if (!user) {
        router.replace(`/login?redirect=/grup/${groupId}`)
        return
      }
      const [profile, myGroups, members] = await Promise.all([
        Auth.profilSaatIni(),
        Grup.daftarSaya(),
        Grup.anggota(groupId),
      ])
      const membership = myGroups?.find((m) => m.groups?.id === groupId)
      if (!membership) {
        toast.error('You are not a member of this group')
        router.replace('/dashboard')
        return
      }
      const draftCount =
        membership.role === 'ketua'
          ? (await Tugas.daftarDraft(groupId))?.length || 0
          : 0

      const sortedMembers = [...(members || [])].sort((a, b) =>
        a.role === b.role ? 0 : a.role === 'ketua' ? -1 : 1
      )

      setState({
        user,
        profile,
        group: membership.groups,
        role: membership.role,
        members: sortedMembers,
        draftCount,
      })
    } catch (err) {
      toast.error(err.message || 'Could not load this group')
      router.replace('/dashboard')
    }
  }, [groupId, router, toast])

  useEffect(() => {
    load()
  }, [load])

  const value = useMemo(() => {
    if (!state) return null
    return {
      ...state,
      groupId,
      isLeader: state.role === 'ketua',
      refresh: load,
      setProfile: (profile) => setState((s) => ({ ...s, profile })),
      setDraftCount: (draftCount) => setState((s) => ({ ...s, draftCount })),
    }
  }, [state, groupId, load])

  if (!value) {
    return (
      <div className="min-h-screen">
        <TopBar crumbs={[{ label: 'Groups', href: '/dashboard' }]} />
        <PageLoader label="Loading group" />
      </div>
    )
  }

  return (
    <GroupContext.Provider value={value}>
      <div className="flex min-h-screen flex-col">
        <TopBar
          profile={value.profile}
          email={value.user?.email}
          onProfileChange={value.setProfile}
          crumbs={[{ label: 'Groups', href: '/dashboard' }, { label: value.group.nama }]}
        />
        <GroupHeader />
        <main className="flex-1"><RouteTransition>{children}</RouteTransition></main>
      </div>
    </GroupContext.Provider>
  )
}
