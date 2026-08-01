import { ArrowRight } from 'lucide-react'
import { LogoMark } from '@/components/logo'
import { Reveal } from '@/components/reveal'

const columns = [
  {
    heading: 'Product',
    links: ['Overview', 'Agents', 'Checkpoints', 'Tracing'],
  },
  {
    heading: 'Resources',
    links: ['Documentation', 'Quickstart', 'Changelog', 'Status', 'Examples'],
  },
  {
    heading: 'Company',
    links: ['About', 'Careers', 'Security', 'Privacy', 'Contact'],
  },
]

export function SiteFooter() {
  return (
    <footer className="rounded-t-[2rem] bg-ink text-ink-foreground md:rounded-t-[3rem]">
      <section
        id="get-started"
        className="mx-auto max-w-6xl px-6 py-24 text-center md:py-36 lg:px-8"
      >
        <Reveal>
          <h2
            className="mx-auto max-w-3xl text-3xl leading-[1.08] font-extrabold tracking-[-0.03em] text-balance md:text-6xl"
          >
            Ship agents you can actually trust
          </h2>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="mx-auto mt-6 max-w-xl font-serif text-lg leading-relaxed text-ink-foreground/70">
            Free while you build. Usage-based when you go to production — no per-seat pricing, no
            trace retention games.
          </p>
        </Reveal>
        <Reveal delay={0.18}>
          <a
            href="https://cascade-1dvs8ty41-dev-kumar-raikwar-s-projects.vercel.app/signup"
            className="mt-10 inline-flex min-h-12 items-center gap-2 rounded-full bg-ink-foreground px-7 text-sm font-medium text-ink transition-colors duration-200 hover:bg-accent hover:text-accent-foreground"
          >
            Try Cascade now
            <ArrowRight className="size-4" aria-hidden="true" />
          </a>
        </Reveal>
      </section>

      <div className="mx-auto max-w-6xl border-t border-ink-border px-6 py-16 lg:px-8">
        <div className="grid gap-12 md:grid-cols-[1fr_2fr]">
          <div>
            <span className="inline-flex items-center gap-2.5">
              <LogoMark size={22} />
              <span className="text-[1.0625rem] font-bold tracking-[-0.02em]">Cascade</span>
            </span>
            <p className="mt-4 max-w-xs font-serif text-sm leading-relaxed text-ink-muted">
              Orchestration for multi-agent systems that have to work in production.
            </p>
          </div>

          <div className="grid gap-10 sm:grid-cols-3">
            {columns.map((col) => (
              <nav key={col.heading} aria-label={col.heading}>
                <h3 className="text-[0.625rem] font-medium tracking-[0.16em] text-ink-muted uppercase">
                  {col.heading}
                </h3>
                <ul className="mt-4 flex flex-col gap-1">
                  {col.links.map((link) => (
                    <li key={link}>
                      <a
                        href="#top"
                        className="inline-flex min-h-9 items-center text-sm text-ink-foreground/65 transition-colors duration-200 hover:text-ink-foreground"
                      >
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        <div className="mt-16 flex flex-col items-start gap-6 border-t border-ink-border pt-8 sm:flex-row sm:items-end sm:justify-between">
          <span
            aria-hidden="true"
            className="text-5xl leading-none font-extrabold tracking-[-0.05em] text-ink-foreground/15 select-none md:text-7xl"
          >
            Cascade
          </span>
          <p className="text-xs text-ink-muted">© {new Date().getFullYear()} Cascade Labs, Inc.</p>
        </div>
      </div>
    </footer>
  )
}
