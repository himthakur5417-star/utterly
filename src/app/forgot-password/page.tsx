"use client";

import * as React from "react";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";

export default function ForgotPasswordPage() {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [result, setResult] = React.useState<{ message: string; resetUrl?: string } | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast("error", "Something went wrong", data.error);
        return;
      }
      if (data.demo && data.resetUrl) {
        setResult({ message: data.message, resetUrl: data.resetUrl });
        toast("info", "Demo reset link generated", "Copy the link below to reset your password.");
      } else {
        setResult({ message: data.message });
        toast("success", "Check your inbox", data.message);
      }
    } catch {
      toast("error", "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Reset your password"
      subtitle="Enter your account email and we'll send a reset link."
      footer={
        <>
          Remembered it? <Link href="/login" className="font-medium text-brand-600 hover:text-brand-700">Sign in</Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Work email">
          <Input
            type="email"
            required
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Button type="submit" className="w-full" size="lg" loading={loading}>
          Send reset link
        </Button>
      </form>

      {result ? (
        <div className="mt-5 rounded-xl border border-brand-100 bg-brand-50 p-4 text-sm text-brand-800">
          <p>{result.message}</p>
          {result.resetUrl ? (
            <a href={result.resetUrl} className="mt-2 block break-all font-medium text-brand-700 hover:underline">
              {result.resetUrl}
            </a>
          ) : null}
          {result.resetUrl ? (
            <p className="mt-2 text-xs text-brand-600">This link is shown only in demo mode because no email provider is configured.</p>
          ) : null}
        </div>
      ) : null}
    </AuthShell>
  );
}
