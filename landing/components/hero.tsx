'use client'

import type { ReactNode } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { ArrowRight } from 'lucide-react'

function Underlined({ children, delay }: { children: ReactNode; delay: number }) {
  const reduced = useReducedMotion()
  return (
    <span className="relative inline-block whitespace-nowrap">
      {children}
      <motion.span
        aria-hidden="true"
        className="absolute -bottom-1 left-0 block h-[3px] bg-foreground md:h-[5px]"
        initial={{ width: reduced ? '100%' : '0%' }}
        animate={{ width: '100%' }}
        transition={{ duration: reduced ? 0 : 0.6, delay: reduced ? 0 : delay, ease: 'easeOut' }}
      />
    </span>
  )
}

export function Hero() {
  const reduced = useReducedMotion()

  const line = (i: number) => ({
    initial: { opacity: 0, y: reduced ? 0 : 18 },
    animate: { opacity: 1, y: 0 },
    transition: {
      duration: reduced ? 0 : 0.5,
      delay: reduced ? 0 : 0.1 + i * 0.12,
      ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
    },
  })

  return (
    <section id="top" className="mx-auto max-w-6xl px-6 pt-16 pb-20 md:pt-28 md:pb-32 lg:px-8">
      <motion.p
        className="mb-8 text-[0.6875rem] font-medium tracking-[0.16em] text-muted-foreground uppercase md:mb-12"
        {...line(0)}
      >
        Multi-agent orchestration
      </motion.p>

      <div className="grid gap-10 lg:grid-cols-[1.35fr_1fr] lg:items-end lg:gap-16">
        <h1 className="text-[2.25rem] leading-[1.06] font-extrabold tracking-[-0.035em] text-balance sm:text-5xl md:text-[3.5rem] lg:text-[4.25rem]">
          <motion.span className="block" {...line(1)}>
            Agent workflows
          </motion.span>
          <motion.span className="block" {...line(2)}>
            that <Underlined delay={0.85}>correct</Underlined> and
          </motion.span>
          <motion.span className="block" {...line(3)}>
            <Underlined delay={1.05}>explain</Underlined> themselves.
          </motion.span>
        </h1>

        <motion.div {...line(4)} className="lg:pb-4">
          <p className="max-w-md font-serif text-lg leading-relaxed text-foreground/80 md:text-xl">
            Cascade runs your agents as a traceable graph — retrying its own mistakes, pausing for
            human approval where it matters, and showing every decision as it happens.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a
              href="https://cascade-eosin-six.vercel.app/signup"
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors duration-200 hover:bg-accent hover:text-accent-foreground"
            >
              Start building free
              <ArrowRight className="size-4" aria-hidden="true" />
            </a>
            <a
              href="#how-it-works"
              className="inline-flex min-h-11 items-center rounded-full border border-border px-6 text-sm font-medium transition-colors duration-200 hover:border-foreground/40 hover:bg-secondary"
            >
              See a live trace
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
