import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { SessionProvider } from "@/components/providers/SessionProvider"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
})

export const metadata: Metadata = {
  metadataBase: new URL("https://getpersonalbrand.com"),
  title: {
    default: "GetPersonalBrand | One site. All of you.",
    template: "%s | GetPersonalBrand",
  },
  description:
    "Replace your link in bio, about page, and portfolio with one free personal website. Build with a drag-and-drop editor, custom domains, and analytics.",
  applicationName: "GetPersonalBrand",
  keywords: ["personal website", "portfolio builder", "link in bio", "personal brand"],
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    shortcut: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/apple-touch-icon.png", type: "image/png" }],
  },
  openGraph: {
    type: "website",
    siteName: "GetPersonalBrand",
    title: "GetPersonalBrand | One site. All of you.",
    description:
      "Your links, story, and best work together on one free personal website.",
    images: [
      {
        url: "/share-card.png",
        width: 1200,
        height: 630,
        alt: "GetPersonalBrand. One site. All of you.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "GetPersonalBrand | One site. All of you.",
    description:
      "Your links, story, and best work together on one free personal website.",
    images: ["/share-card.png"],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  )
}
