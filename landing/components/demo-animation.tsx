'use client'

import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { Check, X } from 'lucide-react'

export type DemoPersona = 'researcher' | 'analyst' | 'writer'

/**
 * Card-level hover contract:
 * - The parent <motion.li> in how-it-works.tsx sets onHoverStart/onHoverEnd
 *   and passes `active` down here.
 * - This box NEVER changes size. Only its internal content transitions
 *   between an idle (dim, static) state and a running (detailed, timed)
 *   sequence.
 */
export function DemoSlot({ persona, active }: { persona: DemoPersona; active: boolean }) {
  return (
    <div className="mt-7 h-[144px] w-full overflow-hidden rounded-2xl border border-border bg-background/60 p-3.5">
      {persona === 'researcher' && <ResearcherDemo active={active} />}
      {persona === 'analyst' && <AnalystDemo active={active} />}
      {persona === 'writer' && <WriterDemo active={active} />}
    </div>
  )
}

// ============================================================
// RESEARCHER
// ============================================================
const RESEARCH_SOURCES = [
  { label: 'IEA report §4.2', dropped: false },
  { label: 'Reuters, Mar 2026', dropped: false },
  { label: 'Unverified blog post', dropped: true },
  { label: 'FAO dataset', dropped: false },
]

function ResearcherDemo({ active }: { active: boolean }) {
  const reduced = useReducedMotion()
  const [revealed, setRevealed] = useState(0)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!active) {
      setRevealed(0)
      setDone(false)
      return
    }
    if (reduced) {
      setRevealed(RESEARCH_SOURCES.length)
      setDone(true)
      return
    }
    const timers = RESEARCH_SOURCES.map((_, i) =>
      setTimeout(() => setRevealed(i + 1), i * 220),
    )
    const doneTimer = setTimeout(() => setDone(true), RESEARCH_SOURCES.length * 220 + 150)
    return () => {
      timers.forEach(clearTimeout)
      clearTimeout(doneTimer)
    }
  }, [active, reduced])

  return (
    <div className="relative flex h-full flex-col justify-center gap-1 overflow-hidden leading-tight">
      {active && (
        <motion.div
          initial={{ left: '-40%' }}
          animate={{ left: '140%' }}
          transition={{ duration: 1.4, ease: 'easeInOut' }}
          className="pointer-events-none absolute top-0 h-full w-2/5 bg-gradient-to-r from-transparent via-accent/10 to-transparent"
        />
      )}
      {RESEARCH_SOURCES.map((s, i) => {
        const shown = active && i < revealed
        return (
          <div
            key={s.label}
            className="flex items-center gap-2 transition-opacity duration-300"
            style={{ opacity: shown ? 1 : 0.3 }}
          >
            <span
              className="flex size-[11px] shrink-0 items-center justify-center rounded-full transition-colors duration-200"
              style={{
                background: !shown ? 'var(--border)' : s.dropped ? 'rgba(176,74,47,0.18)' : 'rgba(31,122,61,0.18)',
                color: s.dropped ? '#b04a2f' : '#1f7a3d',
              }}
            >
              {shown && (s.dropped ? <X className="size-2" strokeWidth={3} /> : <Check className="size-2" strokeWidth={3} />)}
            </span>
            <span
              className="text-[11.5px] transition-colors duration-200"
              style={{
                color: shown ? 'var(--foreground)/70' : 'var(--muted-foreground)',
                textDecoration: shown && s.dropped ? 'line-through' : 'none',
                opacity: shown && s.dropped ? 0.6 : 1,
              }}
            >
              {s.label}
            </span>
          </div>
        )
      })}
      <div
        className="mt-0.5 text-[10.5px] transition-opacity duration-300"
        style={{ color: 'var(--muted-foreground)', opacity: done ? 1 : 0 }}
      >
        3 sources cited, 1 dropped
      </div>
    </div>
  )
}

// ============================================================
// ANALYST
// ============================================================
function AnalystDemo({ active }: { active: boolean }) {
  const reduced = useReducedMotion()
  const [round, setRound] = useState<0 | 1 | 2>(0)

  useEffect(() => {
    if (!active) {
      setRound(0)
      return
    }
    if (reduced) {
      setRound(2)
      return
    }
    setRound(1)
    const t = setTimeout(() => setRound(2), 1400)
    return () => clearTimeout(t)
  }, [active, reduced])

  const bars = [
    { label: 'accuracy', width: round === 0 ? 0 : 91, fail: false },
    { label: 'coverage', width: round === 0 ? 0 : round === 1 ? 35 : 90, fail: round === 1 },
    { label: 'bias check', width: round === 0 ? 0 : 88, fail: false },
  ]

  return (
    <div className="flex h-full flex-col justify-center gap-1.5">
      <div className="text-[10px] tracking-wide text-muted-foreground uppercase">
        {round === 0 ? 'at rest' : `round ${round}`}
      </div>
      {bars.map((b) => (
        <div key={b.label} className="flex items-center gap-2">
          <span className="w-[52px] shrink-0 text-[10px] text-muted-foreground">{b.label}</span>
          <div className="h-[5px] flex-1 overflow-hidden rounded-full bg-border">
            <motion.div
              animate={{ width: `${b.width}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="h-full rounded-full"
              style={{ background: b.fail ? '#b04a2f' : '#1f7a3d' }}
            />
          </div>
        </div>
      ))}
      <div className="mt-0.5 text-[10.5px] text-muted-foreground">
        {round === 0 && 'idle'}
        {round === 1 && <span style={{ color: '#b04a2f' }}>coverage below threshold — retrying</span>}
        {round === 2 && 'all criteria passed — 90% overall'}
      </div>
    </div>
  )
}

// ============================================================
// WRITER
// ============================================================
function WriterDemo({ active }: { active: boolean }) {
  const reduced = useReducedMotion()
  const [stage, setStage] = useState<0 | 1 | 2>(0)

  useEffect(() => {
    if (!active) {
      setStage(0)
      return
    }
    if (reduced) {
      setStage(2)
      return
    }
    setStage(1)
    const t = setTimeout(() => setStage(2), 1300)
    return () => clearTimeout(t)
  }, [active, reduced])

  const widths = stage === 0 ? [0, 0, 0] : [92, 68, 80]

  return (
    <div className="flex h-full flex-col justify-center gap-2">
      <div className="flex flex-col gap-1.5">
        {widths.map((w, i) => (
          <motion.div
            key={i}
            animate={{ width: `${w}%` }}
            transition={{ duration: 0.45, ease: 'easeOut', delay: i * 0.18 }}
            className="h-1.5 rounded-full"
            style={{ background: 'var(--muted-foreground)', opacity: 0.35 }}
          />
        ))}
      </div>
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <span
          className="size-[10px] shrink-0 rounded-[2px] border transition-colors duration-300"
          style={{
            borderColor: stage === 2 ? '#d97757' : 'var(--muted-foreground)',
            background: stage === 2 ? '#d97757' : 'transparent',
          }}
        />
        <span>{stage === 0 ? 'waiting' : stage === 1 ? 'drafting deliverable' : 'held at checkpoint — awaiting approval'}</span>
      </div>
    </div>
  )
}
