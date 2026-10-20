import type { Metadata } from "next";
import Footer from "@/components/Footer";
import Navbar from "@/components/navbar/Navbar";
import Providers from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "PokeTrade Vault",
  description: "Korea's premier verified Pokémon TCG exchange & vault",
};

// 페인트 전에 저장된 테마를 적용해 라이트 모드 사용자의 다크 깜빡임을 막는다. (키: ThemeToggle 의 THEME_STORAGE_KEY)
const themeInitScript = `try{if(localStorage.getItem("poketrade-theme")==="light")document.documentElement.classList.remove("dark")}catch(e){}`;

/**
 * 모든 페이지 공통 레이아웃. Navbar/Footer 를 여기서 한 번만 렌더하므로
 * 페이지를 이동해도 언어·통화·테마·세션 상태와 헤더 UI 가 그대로 유지된다.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html className="dark" lang="ko" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <link href="https://fonts.googleapis.com" rel="preconnect" />
        <link crossOrigin="" href="https://fonts.gstatic.com" rel="preconnect" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@500;600;700&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block"
          rel="stylesheet"
        />
      </head>
      <body className="bg-surface font-body-md text-on-surface antialiased selection:bg-primary-container selection:text-on-primary-container min-h-screen">
        <Providers>
          <Navbar />
          <main className="w-full pt-28 bg-surface min-h-[calc(100vh-28rem)]">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
