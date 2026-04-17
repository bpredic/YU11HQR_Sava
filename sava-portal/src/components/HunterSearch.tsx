'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export function HunterSearch() {
  const [callsign, setCallsign] = useState('')
  const router = useRouter()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = callsign.trim().toUpperCase()
    if (trimmed) {
      router.push(`/hunter/${encodeURIComponent(trimmed)}`)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        placeholder="e.g. YU1ABC"
        value={callsign}
        onChange={e => setCallsign(e.target.value.toUpperCase())}
        className="font-mono text-base"
        maxLength={15}
      />
      <Button type="submit" disabled={!callsign.trim()}>
        Search
      </Button>
    </form>
  )
}
