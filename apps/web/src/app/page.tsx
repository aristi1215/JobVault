"use client";

import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [user, loading, router]);

  return (
    <div className="flex min-h-screen flex-col">
      <nav className="flex items-center justify-between px-6 py-4 sm:px-10">
        <span className="text-xl font-bold tracking-tight text-[var(--foreground)]">
          JobVault
        </span>
        <div className="flex gap-3">
          <a
            href="/login"
            className="rounded-lg px-4 py-2 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--border)]"
          >
            Log in
          </a>
          <a
            href="/signup"
            className="rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--brand-hover)]"
          >
            Sign up free
          </a>
        </div>
      </nav>

      <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <div className="mx-auto max-w-2xl">
          <div className="mb-6 inline-flex items-center rounded-full border border-[var(--border)] px-3 py-1 text-xs font-medium text-[var(--muted)]">
            Privacy-first &middot; Open source
          </div>

          <h1 className="headline text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
            Track every application.
            <br />
            <span className="text-[var(--brand)]">Never lose track again.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-lg text-lg text-[var(--muted)]">
            One dashboard for all your job applications across LinkedIn, Indeed, Glassdoor, and more. 
            Know exactly where you stand with every company.
          </p>

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <a
              href="/signup"
              className="w-full rounded-xl bg-[var(--brand)] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[var(--brand-hover)] sm:w-auto"
            >
              Get started — it&apos;s free
            </a>
            <a
              href="/login"
              className="w-full rounded-xl border border-[var(--border)] px-6 py-3 text-sm font-semibold text-[var(--foreground)] transition hover:border-[var(--border-hover)] sm:w-auto"
            >
              I already have an account
            </a>
          </div>
        </div>

        <div className="mx-auto mt-16 grid max-w-3xl grid-cols-1 gap-6 sm:grid-cols-3">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 text-left">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--brand-soft)] text-[var(--brand)]">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z"/></svg>
            </div>
            <h3 className="font-semibold">Log Instantly</h3>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Add applications manually or auto-capture from job boards with our browser extension.
            </p>
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 text-left">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--success-soft)] text-[var(--success)]">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
            </div>
            <h3 className="font-semibold">Track Progress</h3>
            <p className="mt-1 text-sm text-[var(--muted)]">
              See every application&apos;s status at a glance. Know who responded and who went silent.
            </p>
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 text-left">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--warning-soft)] text-[var(--warning)]">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.2 8.4c.5.38.8.97.8 1.6v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V10a2 2 0 0 1 .8-1.6l8-6a2 2 0 0 1 2.4 0l8 6Z"/><path d="m22 10-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 10"/></svg>
            </div>
            <h3 className="font-semibold">Follow Up Smart</h3>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Get follow-up reminders with bounded rules so you never over-contact or forget.
            </p>
          </div>
        </div>
      </main>

      <footer className="px-6 py-6 text-center text-xs text-[var(--muted)]">
        JobVault &middot; Privacy-first &middot; Your data stays yours
      </footer>
    </div>
  );
}
