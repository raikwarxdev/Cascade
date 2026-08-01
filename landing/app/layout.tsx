import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Inter, Source_Serif_4 } from 'next/font/google'
import './globals.css'

const _inter = Inter({ subsets: ['latin'], display: 'swap' })
const _sourceSerif = Source_Serif_4({ subsets: ['latin'], display: 'swap' })

export const metadata: Metadata = {
  title: 'Cascade — Multi-agent AI workflows that correct themselves',
  description:
    'Cascade orchestrates multi-agent AI workflows with self-correcting retries, human-approval checkpoints, and live execution tracing.',
  generator: 'v0.app',
  openGraph: {
    title: 'Cascade — Multi-agent AI workflows that correct themselves',
    description:
      'Self-correcting retries, human-approval checkpoints, and live execution tracing for production agent workflows.',
    type: 'website',
  },
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#f0eee6',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="bg-background">
      <body className="antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
