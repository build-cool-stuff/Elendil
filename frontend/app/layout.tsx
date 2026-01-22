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
  title: "Elendil",
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
        <head>
          {/* Meta Pixel Code */}
          <script
            dangerouslySetInnerHTML={{
              __html: `!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '1215149140131480');
fbq('track', 'PageView');`,
            }}
          />
          <noscript>
            <img
              height="1"
              width="1"
              style={{ display: 'none' }}
              src="https://www.facebook.com/tr?id=1215149140131480&ev=PageView&noscript=1"
              alt=""
            />
          </noscript>
          {/* End Meta Pixel Code */}
        </head>
        <body className="font-sans">
          {children}
          <Analytics />
        </body>
      </html>
    </ClerkProvider>
  )
}
