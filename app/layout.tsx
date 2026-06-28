import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Sora } from "next/font/google";
import "./globals.css";
import { AppRoot } from "@/components/AppRoot";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Aegis — 安全为先的 AI 客户端",
  description:
    "Aegis 是一款零知识加密、多模型路由、可部署于 Vercel 的 AI 客户端。自带 Spectrum 多模型对比与安全护盾。",
  applicationName: "Aegis",
  authors: [{ name: "Aegis" }],
  keywords: ["AI client", "Aegis", "CherryStudio", "LobeChat", "Chatbox", "Vercel"],
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#07090d",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

const themeInit = `
(function(){
  try {
    var t = localStorage.getItem('aegis:theme') || 'dark';
    document.documentElement.setAttribute('data-theme', t);
  } catch(e){
    document.documentElement.setAttribute('data-theme','dark');
  }
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${sora.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className="min-h-full flex flex-col">
        <div className="app-backdrop" aria-hidden />
        <AppRoot>{children}</AppRoot>
      </body>
    </html>
  );
}
