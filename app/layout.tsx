import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

// Load our fonts
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

// 1. THE VIEWPORT (Mobile App Feel)
// This prevents zooming on inputs and locks the "app" feel on phones.
export const viewport: Viewport = {
  themeColor: "#020617", // Matches bg-slate-950
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

// 2. THE SEO ENGINE
export const metadata: Metadata = {
  // ⚠️ CHANGE THIS TO YOUR ACTUAL DOMAIN WHEN DEPLOYED
  metadataBase: new URL("https://haul-os.pages.dev"), 

  title: {
    default: "CDL Practice Test 2026 | Free Simulator & Diagnostic",
    template: "%s | CDL Practice Test",
  },
  description:
    "Don't just study. Simulate. Free 2026 CDL practice test for Class A, B, & C. Master Air Brakes, Hazmat, and Pre-Trip Inspection with the HAUL.OS exam simulator.",
  
  keywords: [
    "CDL practice test",
    "CDL practice test 2026",
    "CDL prep",
    "Hazmat practice test",
    "Air Brakes test",
    "Pre-Trip Inspection checklist",
    "Class A license",
    "DMV CDL test",
    "Commercial Driver License",
  ],

  authors: [{ name: "HAUL.OS" }],
  creator: "HAUL.OS",
  publisher: "HAUL.OS",

  // 3. SOCIAL SHARES (The "Rich Link" Look)
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://haul-os.pages.dev",
    title: "CDL Practice Test 2026 | Pass First Time",
    description: "Take the 60-second diagnostic. Find your weak points. Pass your CDL exam.",
    siteName: "HAUL.OS",
    images: [
      {
        url: "/icon.png", // We use your icon as the preview image for now
        width: 512,
        height: 512,
        alt: "HAUL.OS CDL Simulator",
      },
    ],
  },

  twitter: {
    card: "summary", // Use 'summary_large_image' if you make a big banner later
    title: "CDL Practice Test 2026",
    description: "Free CDL Diagnostic & Simulator. Class A, B, C.",
    images: ["/icon.png"],
  },

  // 4. ICONS (Favicon & App Icon)
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/icon.png",
    other: {
      rel: "apple-touch-icon-precomposed",
      url: "/icon.png",
    },
  },

  // 5. ROBOTS (Make sure Google sees us)
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Google tag (gtag.js) */}
<script async src="https://www.googletagmanager.com/gtag/js?id=AW-17887232273"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', 'AW-17887232273');
</script>

        {/* Microsoft Clarity */}
        <script type="text/javascript">
    (function(c,l,a,r,i,t,y){
        c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
        t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
        y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
    })(window, document, "clarity", "script", "v3rz0a592n");
</script>
      </head>
      <body className={`${inter.variable} ${mono.variable} font-sans bg-slate-950 text-white antialiased`}>
        {children}
      </body>
    </html>
  );
}
