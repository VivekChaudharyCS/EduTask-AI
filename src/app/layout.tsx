// src/app/layout.tsx
import "./globals.css";
import Navbar from "../components/layout/Navbar";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50" suppressHydrationWarning>
        <Navbar />
        <main className="p-6">{children}</main>
      </body>
    </html>
  );
}
