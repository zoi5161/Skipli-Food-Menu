import type { Metadata } from "next";
import { AuthCard } from "@/components/auth-card";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in · Skipli Food Menu" };

export default function LoginPage() {
  return (
    <AuthCard title="Sign in" subtitle="Manage your restaurant's online menu.">
      <LoginForm />
    </AuthCard>
  );
}
