'use client'

import { createContext, useContext } from 'react'

export const GroupContext = createContext(null)

export function useGroup() {
  const ctx = useContext(GroupContext)
  if (!ctx) throw new Error('useGroup must be used inside a group layout')
  return ctx
}
