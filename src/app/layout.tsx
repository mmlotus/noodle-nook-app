import type { Metadata } from "next";
import { Quicksand } from "next/font/google";
import "./globals.css";
import PWARegister from "@/components/PWARegister";
import { Toaster } from "react-hot-toast";
import Navbar from "@/components/Navigation/Navbar";
import ScrollToTopWrapper from "@/components/ScrollToTopWrapper";
import ThemeApplier from "@/components/ThemeApplier";
import { ToolTipProvider } from "@/components/ToolTips/ToolTipProvider";
import NextAuthSessionProvider from "./providers/SessionProvider";
import Footer from "@/components/Footer";

const quicksand = Quicksand({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-quicksand",
  display: "swap",
});

export const metadata: Metadata = {
  title: "NoodleNook",
  description: "Manage your world",
  applicationName: "NoodleNook",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "NoodleNook",
    statusBarStyle: "default",
  },
  icons: {
    icon: "/icons/NoodleNook-20x20.png",
    apple: "icons/NoodleNook-180x180.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${quicksand.variable} appBody`}>
        <ThemeApplier />
        <PWARegister />
        <Toaster position="top-center" />

        <NextAuthSessionProvider>
          <div className="page-wrapper">
            <ToolTipProvider>
              <Navbar />
              <main className="content">{children}</main>
              <ScrollToTopWrapper />
            </ToolTipProvider>
            <Footer />
          </div>
        </NextAuthSessionProvider>
      </body>
    </html>
  );
}
