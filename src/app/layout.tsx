import type { Metadata } from "next";
import { Inter, Instrument_Serif } from "next/font/google";
import { Toaster } from "react-hot-toast";
import GlobalErrorHandler from "@/components/GlobalErrorHandler";
import { QueryProviders } from "@/components/providers/QueryProviders";
import { PostHogProvider } from "@/components/tracking/PostHogProvider";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import Script from "next/script";
import "./globals.css";
import { genPageMetadata } from "@/lib/seo/genPageMetadata";
import { siteMetadata } from "@/data/siteMetadata";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = genPageMetadata({
  title: siteMetadata.title,
  description: siteMetadata.description,
  url: "/",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <Script id="x-pixel" strategy="afterInteractive">
          {`!function(e,t,n,s,u,a){e.twq||(s=e.twq=function(){s.exe?s.exe.apply(s,arguments):s.queue.push(arguments);},s.version='1.1',s.queue=[],u=t.createElement(n),u.async=!0,u.src='https://static.ads-twitter.com/uwt.js',a=t.getElementsByTagName(n)[0],a.parentNode.insertBefore(u,a))}(window,document,'script');twq('config','r799m');`}
        </Script>
        <Script id="reddit-pixel" strategy="afterInteractive">
          {`!function(w,d){if(!w.rdt){var p=w.rdt=function(){p.sendEvent?p.sendEvent.apply(p,arguments):p.callQueue.push(arguments)};p.callQueue=[];var t=d.createElement("script");t.src="https://www.redditstatic.com/ads/pixel.js?pixel_id=a2_hydv97z4rbjb",t.async=!0;var s=d.getElementsByTagName("script")[0];s.parentNode.insertBefore(t,s)}}(window,document);rdt('init','a2_hydv97z4rbjb');rdt('track','PageVisit');`}
        </Script>
        <Script
          src="https://cdn.affonso.io/js/pixel.min.js"
          data-affonso="cmmp272p100dbfezm2z469o0w"
          data-cookie_duration="30"
          strategy="afterInteractive"
        />
      </head>
      <body className={`${inter.variable} ${instrumentSerif.variable} antialiased`}>
        <NuqsAdapter>
          <QueryProviders>
            <PostHogProvider>
              <div className="flex min-h-screen flex-col">{children}</div>
              <Toaster position="bottom-center" />
              <GlobalErrorHandler />
            </PostHogProvider>
          </QueryProviders>
        </NuqsAdapter>
      </body>
    </html>
  );
}
