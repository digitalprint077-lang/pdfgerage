import type { ReactNode } from "react";
import Header from "./Header";
import Footer from "./Footer";

export default function SitePageShell({
  children,
  bare = false,
}: {
  children: ReactNode;
  bare?: boolean;
}) {
  return (
    <div className="page-shell flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      {bare ? null : <Footer />}
    </div>
  );
}
