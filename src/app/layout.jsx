import "./globals.css";
import Providers from "@/components/Providers";
import AppToaster from "@/components/ui/AppToaster";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata = {
  title: {
    default: "360 Lab ERP",
    template: "%s | 360 Lab ERP",
  },
  description: "ERP system for 360 Dental Solutions — manage workflows, inventory, finance, and HR.",
  keywords: ["dental lab", "ERP", "360 Lab", "workflow", "inventory", "finance"],
  authors: [{ name: "360 Dental Solutions" }],
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
  openGraph: {
    title: "360 Lab ERP",
    description: "ERP system for 360 Dental Solutions — manage workflows, inventory, finance, and HR.",
    siteName: "360 Lab ERP",
    type: "website",
    images: [{ url: "/logo.png", width: 512, height: 512, alt: "360 Lab Logo" }],
  },
  other: {
    "theme-color": "#c3a28e",
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "360 Lab",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <body>
        <Providers>
          {children}
          <AppToaster />
        </Providers>
      </body>
    </html>
  );
}
