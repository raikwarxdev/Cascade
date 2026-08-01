'use client'

import { useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { FileText, LineChart, Search } from 'lucide-react'
import { Reveal } from '@/components/reveal'
import { DemoSlot } from '@/components/demo-animation'

const steps = [
  {
    n: '01',
    icon: Search,
    title: 'Researcher',
    body: "Fans out across your sources, cites every claim, and drops anything it can't verify.",
    meta: [
      { label: 'Status', value: 'Complete' },
      { label: 'Retries', value: '0' },
    ],
  },
  {
    n: '02',
    icon: LineChart,
    title: 'Analyst',
    body: 'Scores the findings against your rubric and re-runs itself when confidence drops.',
    meta: [
      { label: 'Status', value: 'Self-corrected' },
      { label: 'Retries', value: '2' },
    ],
  },
  {
    n: '03',
    icon: FileText,
    title: 'Writer',
    body: 'Drafts the deliverable and holds it at a checkpoint until a human signs off.',
    meta: [
      { label: 'Status', value: 'Awaiting approval' },
      { label: 'Retries', value: '0' },
    ],
  },
]

export function HowItWorks() {
  const reduced = useReducedMotion()
  const [hoveredCard, setHoveredCard] = useState<string | null>(null)

  return (
    <section
      id="how-it-works"
      className="-mt-8 rounded-t-[2rem] bg-background px-6 py-20 md:-mt-12 md:rounded-t-[3rem] md:py-32 lg:px-8"
    >
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-6 md:grid-cols-[1fr_1fr] md:items-end">
          <Reveal>
            <h2 className="text-3xl leading-[1.08] font-extrabold tracking-[-0.03em] text-balance md:text-5xl">
              How Cascade works
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="font-serif text-lg leading-relaxed text-foreground/75 md:pb-2">
              Compose agents as steps. Each one declares its own success criteria, so the graph knows
              when to retry, when to stop, and when to ask you.
            </p>
          </Reveal>
        </div>

        <ul className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {steps.map((step, i) => (
            <motion.li
              key={step.title}
              onHoverStart={() => setHoveredCard(step.title)}
              onHoverEnd={() => setHoveredCard((c) => (c === step.title ? null : c))}
              className="group flex flex-col rounded-[1.25rem] border border-border/70 bg-card p-7 transition-shadow duration-200 hover:shadow-[0_18px_40px_-24px_rgba(26,24,21,0.35)] md:p-8"
              initial={{ opacity: 0, y: reduced ? 0 : 26 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: reduced ? 0 : 0.55, delay: reduced ? 0 : i * 0.1 }}
              whileHover={reduced ? undefined : { y: -4, scale: 1.01 }}
            >
              <div className="flex items-center justify-between">
                <span className="inline-flex size-10 items-center justify-center rounded-full bg-primary/5 text-foreground">
                  <step.icon className="size-5" aria-hidden="true" />
                </span>
                <span className="text-[0.6875rem] font-medium tracking-[0.16em] text-muted-foreground">
                  {step.n}
                </span>
              </div>

              <h3 className="mt-6 text-xl font-bold tracking-[-0.02em]">{step.title}</h3>
              <p className="mt-2 mb-7 font-serif leading-relaxed text-foreground/70">{step.body}</p>

              <div className="mt-auto border-t border-border pt-5">
                <dl className="flex flex-wrap gap-x-10 gap-y-3">
                  {step.meta.map((m) => (
                    <div key={m.label}>
                      <dt className="text-[0.625rem] font-medium tracking-[0.16em] text-muted-foreground uppercase">
                        {m.label}
                      </dt>
                      <dd className="mt-1 text-sm font-medium">{m.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              <DemoSlot
                persona={step.title.toLowerCase() as 'researcher' | 'analyst' | 'writer'}
                active={hoveredCard === step.title}
              />
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  )
}
