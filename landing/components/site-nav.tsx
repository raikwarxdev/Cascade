'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ChevronDown, Menu, X } from 'lucide-react'
import { Logo } from '@/components/logo'
import { cn } from '@/lib/utils'

const links = [
  { label: 'Product', href: '#product' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Docs', href: '#docs' },
]

export function SiteNav() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const reduced = useReducedMotion()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <header
      className={cn(
        'sticky top-0 z-50 transition-all duration-300',
        scrolled
          ? 'border-b border-border bg-background/80 shadow-[0_1px_20px_rgba(26,24,21,0.06)] backdrop-blur-md'
          : 'border-b border-transparent bg-background',
      )}
    >
      <nav
        aria-label="Main"
        className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6 md:h-20 lg:px-8"
      >
        <a
          href="#top"
          className="flex min-h-11 items-center rounded-md pr-2"
          aria-label="Cascade home"
        >
          <Logo />
        </a>

        <ul className="hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <li key={link.label}>
              <a
                href={link.href}
                className="rounded-full px-3.5 py-2 text-sm font-medium text-foreground/75 transition-colors duration-200 hover:bg-secondary hover:text-foreground"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          <a
            href="https://cascade-1dvs8ty41-dev-kumar-raikwar-s-projects.vercel.app/signup"
            className="hidden min-h-11 items-center gap-1.5 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors duration-200 hover:bg-accent hover:text-accent-foreground md:inline-flex"
          >
            Get Started
            <ChevronDown className="size-4 opacity-70" aria-hidden="true" />
          </a>

          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            aria-expanded={open}
            className="inline-flex size-11 items-center justify-center rounded-full text-foreground transition-colors duration-200 hover:bg-secondary md:hidden"
          >
            <Menu className="size-5" aria-hidden="true" />
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-foreground/25 md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduced ? 0 : 0.2 }}
              onClick={() => setOpen(false)}
            />
            <motion.div
              className="fixed inset-y-0 right-0 z-50 flex w-[86%] max-w-sm flex-col border-l border-border bg-background px-6 py-5 md:hidden"
              initial={{ x: reduced ? 0 : '100%' }}
              animate={{ x: 0 }}
              exit={{ x: reduced ? 0 : '100%' }}
              transition={{ duration: reduced ? 0 : 0.3, ease: [0.22, 1, 0.36, 1] }}
              role="dialog"
              aria-modal="true"
              aria-label="Menu"
            >
              <div className="flex items-center justify-between">
                <Logo />
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close menu"
                  className="inline-flex size-11 items-center justify-center rounded-full text-foreground transition-colors duration-200 hover:bg-secondary"
                >
                  <X className="size-5" aria-hidden="true" />
                </button>
              </div>

              <ul className="mt-8 flex flex-col gap-1">
                {links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      onClick={() => setOpen(false)}
                      className="flex min-h-12 items-center border-b border-border text-lg font-medium tracking-[-0.01em] transition-colors duration-200 hover:text-accent"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>

              <a
                href="https://cascade-1dvs8ty41-dev-kumar-raikwar-s-projects.vercel.app/signup"
                onClick={() => setOpen(false)}
                className="mt-8 inline-flex min-h-12 items-center justify-center rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors duration-200 hover:bg-accent hover:text-accent-foreground"
              >
                Get Started
              </a>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  )
}
