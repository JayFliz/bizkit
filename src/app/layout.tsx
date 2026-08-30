import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { getSession } from "@/lib/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { LogoutButton } from "@/components/layout/logout-button";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Bizkit",
  description: "Small business toolkit — CRM, marketing, invoicing, support",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const session = await getSession();
  const isLoggedIn = session.isLoggedIn;

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-zinc-50 font-sans dark:bg-zinc-950">
        {isLoggedIn ? (
          <div className="flex min-h-screen">
            <Sidebar />
            <div className="ml-56 flex flex-1 flex-col">
              <header className="sticky top-0 z-20 flex h-14 items-center justify-end border-b border-zinc-200 bg-white/80 px-6 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-zinc-600 dark:text-zinc-400">
                    {session.name}
                  </span>
                  <LogoutButton />
                </div>
              </header>
              <main className="flex-1 p-6">{children}</main>
            </div>
          </div>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
