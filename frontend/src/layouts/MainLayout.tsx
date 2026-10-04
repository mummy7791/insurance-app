import type { ReactNode } from "react";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import SecureLifeAIChat from "../components/SecureLifeAIChat";

type MainLayoutProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
};

export default function MainLayout({ title, subtitle, children }: MainLayoutProps) {
  let role = "";
  try {
    role = JSON.parse(localStorage.getItem("insuranceUser") || "{}")?.role || "";
  } catch {
    role = "";
  }

  const portalClass =
    role === "customer"
      ? "customer-portal"
      : role === "advisor"
        ? "advisor-portal"
        : "staff-portal";

  return (
    <div className={`layout ${portalClass}`}>
      <Sidebar />
      <main className="main">
        <Topbar title={title} subtitle={subtitle} />
        {children}
        {role === "customer" && <SecureLifeAIChat />}
      </main>
    </div>
  );
}
