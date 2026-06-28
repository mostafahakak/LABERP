import "./globals.css";
import Providers from "@/components/Providers";
import AppToaster from "@/components/ui/AppToaster";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata = {
  title: "360 Lab ERP",
  description: "ERP for 360 Lab - Dental Lab Workflow",
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
