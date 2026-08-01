import { SiteNav } from '@/components/site-nav'
import { Hero } from '@/components/hero'
import { Statement } from '@/components/statement'
import { HowItWorks } from '@/components/how-it-works'
import { Features } from '@/components/features'
import { SiteFooter } from '@/components/site-footer'

export default function Page() {
  return (
    <div className="min-h-svh bg-background">
      <SiteNav />
      <main>
        <Hero />
        <Statement />
        <HowItWorks />
        <Features />
      </main>
      <SiteFooter />
    </div>
  )
}
