import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";

type UserRole = "admin" | "bm" | "unit_manager" | "agency_manager" | "agent";

type ProtectedRouteProps = {
  children: ReactNode;
  allowedRoles?: UserRole[];
};

type User = {
  role?: UserRole;
};

export default function ProtectedRoute({
  children,
  allowedRoles,
}: ProtectedRouteProps) {
  const token = localStorage.getItem("insuranceToken");
  const user: User = JSON.parse(localStorage.getItem("insuranceUser") || "{}");

  if (!token) {
    return <Navigate to="/email-otp-login" replace />;
  }

  if (allowedRoles && (!user.role || !allowedRoles.includes(user.role))) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}