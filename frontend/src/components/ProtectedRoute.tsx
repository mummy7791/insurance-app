import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";

type UserRole = "admin" | "bm" | "unit_manager" | "agency_manager" | "advisor" | "agent" | "customer";

type ProtectedRouteProps = {
  children: ReactNode;
  allowedRoles?: readonly string[];
};

type User = {
  role?: UserRole;
};

export default function ProtectedRoute({
  children,
  allowedRoles,
}: ProtectedRouteProps) {
  const token = localStorage.getItem("insuranceToken");
  let user: User = {};
  try {
    user = JSON.parse(localStorage.getItem("insuranceUser") || "{}") as User;
  } catch {
    localStorage.removeItem("insuranceToken");
    localStorage.removeItem("insuranceUser");
    return <Navigate to="/login" replace />;
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && (!user.role || !allowedRoles.includes(user.role))) {
    return <Navigate to={user.role === "customer" ? "/customer-dashboard" : user.role === "advisor" ? "/advisor-dashboard" : "/dashboard"} replace />;
  }

  return children;
}