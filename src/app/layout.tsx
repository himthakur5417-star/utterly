import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Utterly — AI Invoice & Payment Recovery",
    template: "%s · Utterly",
  },
  description:
    "Utterly helps US small businesses, freelancers and agencies get paid faster with intelligent invoicing and AI-powered payment recovery.",
  keywords: ["invoicing", "payment recovery", "AI", "small business", "freelancers"],
  openGraph: {
    title: "Utterly — AI Invoice & Payment Recovery",
    description:
      "Intelligent invoicing and AI-powered payment recovery for small businesses.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
