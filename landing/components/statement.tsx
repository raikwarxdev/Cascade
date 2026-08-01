'use client'

import { motion, useReducedMotion } from 'motion/react'
import { Reveal } from '@/components/reveal'

const stats = [
  { value: '99.2%', label: 'Task completion' },
  { value: '3.4x', label: 'Fewer manual fixes' },
  { value: '<200ms', label: 'Trace latency' },
]

export function Statement() {
  const reduced = useReducedMotion()

  return (
    <section
      id="product"
      className="rounded-t-[2rem] bg-ink px-6 py-20 text-ink-foreground md:rounded-t-[3rem] md:py-32 lg:px-8"
    >
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <p className="mb-10 text-[0.6875rem] font-medium tracking-[0.16em] text-ink-muted uppercase md:mb-14">
            Why Cascade
          </p>
        </Reveal>

        <Reveal delay={0.1}>
          <h2 className="max-w-4xl font-serif text-3xl leading-[1.22] tracking-[-0.01em] text-balance italic md:text-5xl lg:text-[3.5rem]">
            Agents don&apos;t fail loudly. They fail quietly, three steps upstream, and hand you a
            confident answer built on nothing.
          </h2>
        </Reveal>

        <Reveal delay={0.2}>
          <p className="mt-10 max-w-xl font-serif text-lg leading-relaxed text-ink-foreground/70">
            Cascade is built for the part nobody demos: what happens when a step goes wrong. Every
            run is a graph you can inspect, replay, and interrupt.
          </p>
        </Reveal>

        <div className="mt-16 grid gap-px overflow-hidden border-t border-ink-border sm:grid-cols-3">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              className="border-b border-ink-border py-8 sm:border-b-0"
              initial={{ opacity: 0, y: reduced ? 0 : 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: reduced ? 0 : 0.5, delay: reduced ? 0 : i * 0.1 }}
            >
              <div className="text-3xl font-bold tracking-[-0.03em] md:text-4xl">{stat.value}</div>
              <div className="mt-2 text-[0.6875rem] font-medium tracking-[0.14em] text-ink-muted uppercase">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
