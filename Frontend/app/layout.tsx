import type { Metadata } from 'next'
import { Sometype_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const _sometypeMono = Sometype_Mono({
  weight: ['400', '700'],
  subsets: ["latin"],
  variable: "--font-sometype-mono",
});

export const metadata: Metadata = {
  title: 'CodeEvo - AI-Powered System Design Platform',
  description: 'Visual system modeling, AI code generation, and Git integration for distributed system architecture',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="bg-white scroll-smooth">
      <body className={`${_sometypeMono.variable} font-sans antialiased bg-white text-[#0b1c2c]`}>
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
