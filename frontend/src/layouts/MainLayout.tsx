import type { ReactNode } from "react";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";

type MainLayoutProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
};

export default function MainLayout({
  title,
  subtitle,
  children,
}: MainLayoutProps) {
  return (
    <div className="layout">
      <Sidebar />

      <main className="main">
        <Topbar
          title={title}
          subtitle={subtitle}
        />

        {children}
      </main>
    </div>
  );
}