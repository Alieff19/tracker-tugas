'use client'

import { Fragment, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronDown, ChevronRight, LayoutGrid, LogOut, Pencil } from 'lucide-react'
import { Auth } from '@/lib/api'
import { useToast } from './ToastProvider'
import { Avatar, Button, Field, Input, Logo, Modal, cn } from './ui'

function MenuItem({ icon: Icon, children, onClick, danger }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] transition-colors',
        danger ? 'text-red-700 hover:bg-red-50' : 'text-ink-2 hover:bg-muted hover:text-ink'
      )}
    >
      <Icon className="size-4" strokeWidth={1.75} />
      {children}
    </button>
  )
}

export default function TopBar({ profile, email, onProfileChange, crumbs = [] }) {
  const router = useRouter()
  const toast = useToast()
  const menuRef = useRef(null)

  const [menuOpen, setMenuOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const onDown = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  const signOut = async () => {
    try {
      await Auth.keluar()
      router.push('/login')
    } catch (err) {
      toast.error(err.message || 'Could not sign out')
    }
  }

  const openEdit = () => {
    setName(profile?.nama || '')
    setMenuOpen(false)
    setEditOpen(true)
  }

  const saveName = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    try {
      await Auth.updateProfil(name.trim())
      onProfileChange?.({ ...profile, nama: name.trim() })
      toast.success('Display name updated')
      setEditOpen(false)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-line bg-canvas/85 backdrop-blur-md print:hidden">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <nav className="flex min-w-0 items-center gap-2 text-[13px]">
            <Link href="/dashboard" className="shrink-0">
              <Logo />
            </Link>
            {crumbs.map((c, i) => (
              <Fragment key={i}>
                <ChevronRight className="size-4 shrink-0 text-line-strong" strokeWidth={1.75} />
                {c.href ? (
                  <Link href={c.href} className="shrink-0 text-ink-2 transition-colors hover:text-ink">
                    {c.label}
                  </Link>
                ) : (
                  <span className="truncate font-medium text-ink">{c.label}</span>
                )}
              </Fragment>
            ))}
          </nav>

          {profile && (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="flex cursor-pointer items-center gap-2 rounded-lg py-1 pl-1 pr-2 transition-colors hover:bg-muted"
              >
                <Avatar name={profile.nama} size="sm" />
                <span className="hidden max-w-[140px] truncate text-[13px] font-medium text-ink sm:block">
                  {profile.nama}
                </span>
                <ChevronDown className="size-3.5 text-ink-3" strokeWidth={2} />
              </button>

              {menuOpen && (
                <div className="fade-in absolute right-0 mt-1.5 w-60 rounded-xl border border-line bg-surface p-1 shadow-lg shadow-ink/5">
                  <div className="mb-1 border-b border-line px-2.5 pb-2.5 pt-2">
                    <p className="truncate text-[13px] font-medium text-ink">{profile.nama}</p>
                    {email && <p className="truncate text-xs text-ink-3">{email}</p>}
                  </div>
                  <MenuItem
                    icon={LayoutGrid}
                    onClick={() => {
                      setMenuOpen(false)
                      router.push('/dashboard')
                    }}
                  >
                    All groups
                  </MenuItem>
                  <MenuItem icon={Pencil} onClick={openEdit}>
                    Edit display name
                  </MenuItem>
                  <MenuItem icon={LogOut} onClick={signOut} danger>
                    Sign out
                  </MenuItem>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        icon={Pencil}
        title="Edit display name"
        description="This name appears on the board and in contribution reports."
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="profile-form" loading={saving}>
              Save
            </Button>
          </>
        }
      >
        <form id="profile-form" onSubmit={saveName}>
          <Field label="Display name">
            <Input value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
          </Field>
        </form>
      </Modal>
    </>
  )
}
