import type React from "react"
import type { Metadata } from "next"
import { Figtree } from "next/font/google"
import { ClerkProvider } from "@clerk/nextjs"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"

const figtree = Figtree({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-figtree",
})

export const metadata: Metadata = {
  title: "Free Real Estate",
  description: "QR Tracking Platform for Real Estate Professionals",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <ClerkProvider>
      <html lang="en" className={`${figtree.variable} antialiased`}>
        <body className="font-sans">
          {children}
          <Analytics />
        </body>
      </html>
    </ClerkProvider>
  )
}
