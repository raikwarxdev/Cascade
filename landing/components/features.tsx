'use client'

import type { ReactNode } from 'react'
import { Check, CircleAlert, RotateCcw, UserCheck } from 'lucide-react'
import { Reveal } from '@/components/reveal'
import { cn } from '@/lib/utils'

function FeatureRow({
  label,
  title,
  body,
  bullets,
  visual,
  flip,
}: {
  label: string
  title: string
  body: string
  bullets: string[]
  visual: ReactNode
  flip?: boolean
}) {
  return (
    <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-20">
      <Reveal repeat className={cn(flip && 'lg:order-2')}>
        <p className="text-[0.6875rem] font-medium tracking-[0.16em] text-muted-foreground uppercase">
          {label}
        </p>
        <h3 className="mt-5 text-2xl leading-[1.14] font-extrabold tracking-[-0.03em] text-balance md:text-4xl">
          {title}
        </h3>
        <p className="mt-4 max-w-lg font-serif text-lg leading-relaxed text-foreground/75">{body}</p>
        <ul className="mt-7 flex flex-col gap-3">
          {bullets.map((b) => (
            <li key={b} className="flex items-start gap-3 text-sm leading-relaxed">
              <Check className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
              <span className="text-foreground/80">{b}</span>
            </li>
          ))}
        </ul>
      </Reveal>

      <Reveal repeat delay={0.12} className={cn(flip && 'lg:order-1')}>
        <div className="rounded-[1.25rem] border border-border/70 bg-card p-5 md:p-7">{visual}</div>
      </Reveal>
    </div>
  )
}

function RetryVisual() {
  const attempts = [
    { n: 'Attempt 1', note: 'Output failed schema check', state: 'fail' as const },
    { n: 'Attempt 2', note: 'Re-planned with error context', state: 'retry' as const },
    { n: 'Attempt 3', note: 'Validated · confidence 0.94', state: 'pass' as const },
  ]
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between text-[0.625rem] font-medium tracking-[0.16em] text-muted-foreground uppercase">
        <span>Step · analyst</span>
        <span>Retry policy · 3</span>
      </div>
      {attempts.map((a) => (
        <div
          key={a.n}
          className="flex items-center gap-3 rounded-xl border border-border/70 bg-background px-4 py-3.5"
        >
          <span
            className={cn(
              'inline-flex size-7 shrink-0 items-center justify-center rounded-full',
              a.state === 'pass' ? 'bg-primary text-primary-foreground' : 'bg-secondary',
            )}
          >
            {a.state === 'fail' && (
              <CircleAlert className="size-3.5 text-accent" aria-hidden="true" />
            )}
            {a.state === 'retry' && <RotateCcw className="size-3.5" aria-hidden="true" />}
            {a.state === 'pass' && <Check className="size-3.5" aria-hidden="true" />}
          </span>
          <div className="min-w-0">
            <div className="text-sm font-medium">{a.n}</div>
            <div className="truncate font-serif text-sm text-muted-foreground">{a.note}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

function ApprovalVisual() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2.5">
        <span className="inline-flex size-8 items-center justify-center rounded-full bg-accent/15 text-accent">
          <UserCheck className="size-4" aria-hidden="true" />
        </span>
        <span className="text-[0.625rem] font-medium tracking-[0.16em] text-muted-foreground uppercase">
          Checkpoint · paused
        </span>
      </div>

      <div className="rounded-xl border border-border/70 bg-background p-4">
        <div className="text-sm font-medium">Publish Q3 competitor brief</div>
        <p className="mt-2 font-serif text-sm leading-relaxed text-muted-foreground">
          Writer produced a 1,400-word brief citing 12 sources. Two claims are flagged as
          low-confidence and need review before send.
        </p>
        <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-2 border-t border-border pt-3">
          <div>
            <dt className="text-[0.625rem] font-medium tracking-[0.16em] text-muted-foreground uppercase">
              Requested by
            </dt>
            <dd className="mt-1 text-sm">writer.v3</dd>
          </div>
          <div>
            <dt className="text-[0.625rem] font-medium tracking-[0.16em] text-muted-foreground uppercase">
              Waiting
            </dt>
            <dd className="mt-1 text-sm">4m 12s</dd>
          </div>
        </dl>
      </div>

      <div className="flex flex-wrap gap-2">
        <span className="inline-flex min-h-11 items-center rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground">
          Approve &amp; continue
        </span>
        <span className="inline-flex min-h-11 items-center rounded-full border border-border px-5 text-sm font-medium">
          Request changes
        </span>
      </div>
    </div>
  )
}

function TraceVisual() {
  const spans = [
    { name: 'plan', offset: 0, width: 16, ms: '210ms' },
    { name: 'researcher.search', offset: 14, width: 38, ms: '1.4s' },
    { name: 'researcher.cite', offset: 48, width: 18, ms: '640ms' },
    { name: 'analyst.score', offset: 62, width: 24, ms: '870ms' },
    { name: 'writer.draft', offset: 80, width: 20, ms: '1.1s' },
  ]
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between text-[0.625rem] font-medium tracking-[0.16em] text-muted-foreground uppercase">
        <span>Run · 8f21c4</span>
        <span>Total · 4.2s</span>
      </div>
      {spans.map((s, i) => (
        <div key={s.name} className="flex items-center gap-4">
          <span className="w-32 shrink-0 truncate font-mono text-xs text-foreground/70">
            {s.name}
          </span>
          <span className="relative h-2 flex-1 rounded-full bg-background">
            <span
              className={cn(
                'absolute top-0 h-2 rounded-full',
                i === 3 ? 'bg-accent' : 'bg-primary/70',
              )}
              style={{ left: `${s.offset}%`, width: `${s.width}%` }}
            />
          </span>
          <span className="w-14 shrink-0 text-right font-mono text-xs text-muted-foreground">
            {s.ms}
          </span>
        </div>
      ))}
    </div>
  )
}

export function Features() {
  return (
    <section id="docs" className="mx-auto max-w-6xl px-6 pb-20 md:pb-32 lg:px-8">
      <div className="flex flex-col gap-24 md:gap-36">
        <FeatureRow
          label="Self-correcting retries"
          title="It notices the failure before you do"
          body="Every step carries a validator. When output drifts, Cascade feeds the failure back into the plan and retries with context — not a blind re-roll."
          bullets={[
            'Schema, rubric, and custom validators per step',
            'Error context injected into the retry prompt',
            'Deterministic backoff with per-step retry caps',
          ]}
          visual={<RetryVisual />}
        />

        <FeatureRow
          label="Human approval checkpoints"
          title="Pause the graph exactly where the stakes are"
          body="Mark any step as requiring sign-off. The run suspends durably, notifies the right reviewer, and resumes from the same state on approval."
          bullets={[
            'Durable pauses that survive restarts and deploys',
            'Reviewer routing by role, cost, or confidence score',
            'Full audit trail of who approved what, and when',
          ]}
          visual={<ApprovalVisual />}
          flip
        />

        <FeatureRow
          label="Live execution trace"
          title="Watch the reasoning as it happens"
          body="A waterfall of every span, token, and tool call — streaming while the run is still in flight. Replay any step in isolation with the same inputs."
          bullets={[
            'Sub-200ms streaming spans for in-flight runs',
            'Per-step cost, latency, and token accounting',
            'One-click replay with pinned inputs',
          ]}
          visual={<TraceVisual />}
        />
      </div>
    </section>
  )
}
