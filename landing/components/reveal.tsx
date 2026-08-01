'use client'

import { useRef, type ReactNode } from 'react'
import { motion, useInView, useReducedMotion } from 'motion/react'

type RevealProps = {
  children: ReactNode
  className?: string
  delay?: number
  /** vertical offset in px */
  y?: number
  as?: 'div' | 'section' | 'li' | 'header' | 'footer'
  /** re-run the reveal every time the element re-enters the viewport */
  repeat?: boolean
}

export function Reveal({
  children,
  className,
  delay = 0,
  y = 24,
  as = 'div',
  repeat = false,
}: RevealProps) {
  const reduced = useReducedMotion()
  const MotionTag = motion[as]
  const ref = useRef<HTMLElement>(null)
  // `amount: 'some'` keeps tall sections reliable, and useInView flips back to
  // false the moment the element leaves, so the reveal can replay on re-entry.
  const inView = useInView(ref, { amount: 'some' })

  if (reduced) {
    const Tag = as
    return <Tag className={className}>{children}</Tag>
  }

  if (repeat) {
    return (
      <MotionTag
        ref={ref as never}
        className={className}
        initial={false}
        animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y }}
        transition={{ duration: 0.5, delay: inView ? delay : 0, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </MotionTag>
    )
  }

  return (
    <MotionTag
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </MotionTag>
  )
}

/** Parent that staggers direct <Reveal>-style children using variants. */
export function RevealGroup({
  children,
  className,
  stagger = 0.1,
  as = 'div',
}: {
  children: ReactNode
  className?: string
  stagger?: number
  as?: 'div' | 'ul' | 'section'
}) {
  const reduced = useReducedMotion()
  const MotionTag = motion[as]

  if (reduced) {
    const Tag = as
    return <Tag className={className}>{children}</Tag>
  }

  return (
    <MotionTag
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.15 }}
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: stagger } },
      }}
    >
      {children}
    </MotionTag>
  )
}

export const revealItem = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  },
}
