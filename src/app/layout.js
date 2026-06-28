import "./globals.css";
import Providers from "@/components/Providers";

export const metadata = {
  title: "360 Lab ERP",
  description: "ERP for 360 Lab - Dental Lab Workflow",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
