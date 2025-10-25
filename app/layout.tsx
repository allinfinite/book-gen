import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL('https://bookgen.dnalevity.com'),
  
  title: {
    default: "BookGen - AI-Powered Book Writing & Publishing Platform",
    template: "%s | BookGen"
  },
  
  description: "Create professional books with AI assistance. Voice-to-text transcription, intelligent chapter generation, and powerful editing tools. Transform your ideas into published books faster than ever.",
  
  keywords: [
    "AI book writing",
    "book generator",
    "AI writing assistant",
    "voice to book",
    "book creation tool",
    "AI author assistant",
    "write a book with AI",
    "book publishing software",
    "chapter generator",
    "manuscript editor",
    "GPT-5 book writing",
    "voice transcription for authors",
    "AI content generation",
    "book outline generator",
    "self-publishing tool",
    "creative writing AI",
    "book formatting software",
    "author productivity tool"
  ],
  
  authors: [{ name: "DNA Levity" }],
  creator: "DNA Levity",
  publisher: "DNA Levity",
  
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
  
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://bookgen.dnalevity.com',
    siteName: 'BookGen',
    title: 'BookGen - AI-Powered Book Writing & Publishing Platform',
    description: 'Create professional books with AI assistance. Voice-to-text transcription, intelligent chapter generation, and powerful editing tools.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'BookGen - AI Book Writing Platform',
        type: 'image/png',
      }
    ],
  },
  
  twitter: {
    card: 'summary_large_image',
    title: 'BookGen - AI-Powered Book Writing & Publishing Platform',
    description: 'Create professional books with AI assistance. Voice-to-text transcription, intelligent chapter generation, and powerful editing tools.',
    creator: '@dnalevity',
    images: ['/twitter-image.png'],
  },
  
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  
  manifest: "/manifest.json",
  
  alternates: {
    canonical: 'https://bookgen.dnalevity.com',
  },
  
  category: 'technology',
  
  verification: {
    // Add your verification codes here when you have them
    // google: 'your-google-verification-code',
    // yandex: 'your-yandex-verification-code',
    // bing: 'your-bing-verification-code',
  },
};

export const viewport: Viewport = {
  themeColor: "#6366f1",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "BookGen",
    "description": "AI-powered book writing and publishing platform with voice-to-text transcription, intelligent chapter generation, and professional editing tools.",
    "url": "https://bookgen.dnalevity.com",
    "applicationCategory": "WritingApplication",
    "operatingSystem": "Web Browser",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "creator": {
      "@type": "Organization",
      "name": "DNA Levity",
      "url": "https://bookgen.dnalevity.com"
    },
    "featureList": [
      "AI-powered book writing",
      "Voice-to-text transcription",
      "Intelligent chapter generation",
      "Book outline generator",
      "Rich text editor",
      "Export to PDF and EPUB",
      "Style customization",
      "Real-time collaboration"
    ],
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "5",
      "ratingCount": "1"
    }
  };

  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
