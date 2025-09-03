import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Providers from '@/components/Providers'
import './globals.css'

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap'
})

export const metadata: Metadata = {
  title: 'PlateWise - Cultural Meal Planning & Budget Optimization',
  description: 'A culturally-aware, AI-driven meal planning platform that helps families and individuals optimize their food budgets while preserving culinary traditions.',
  keywords: ['meal planning', 'budget optimization', 'cultural recipes', 'AI cooking', 'grocery savings'],
  authors: [{ name: 'PlateWise Team' }],
  creator: 'PlateWise',
  publisher: 'PlateWise',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://platewise.app'),
  openGraph: {
    title: 'PlateWise - Cultural Meal Planning & Budget Optimization',
    description: 'Optimize your food budget while preserving your cultural culinary traditions with AI-powered meal planning.',
    url: 'https://platewise.app',
    siteName: 'PlateWise',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PlateWise - Cultural Meal Planning & Budget Optimization',
    description: 'Optimize your food budget while preserving your cultural culinary traditions with AI-powered meal planning.',
    creator: '@platewise',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <link rel="icon" type="image/svg+xml" href="/assets/logo/favicon/favicon.svg" />
        <link rel="apple-touch-icon" sizes="180x180" href="/assets/logo/favicon/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/assets/logo/favicon/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/assets/logo/favicon/favicon-16x16.png" />
        <link rel="manifest" href="/site.webmanifest" />
      </head>
      <body className={inter.className}>
        <Providers>
          <div id="root">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  )
}
