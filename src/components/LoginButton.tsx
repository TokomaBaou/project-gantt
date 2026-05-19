"use client";

import { signIn } from "next-auth/react";

interface LoginButtonProps {
  callbackUrl?: string;
}

export function LoginButton({ callbackUrl = "/" }: LoginButtonProps) {
  return (
    <button
      type="button"
      onClick={() => void signIn("google", { callbackUrl })}
      className="inline-flex items-center gap-2 rounded-xl bg-[#007AFF] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0051D5]"
    >
      <GoogleIcon />
      Google でサインイン
    </button>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path
        fill="#fff"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84c-.21 1.12-.84 2.07-1.78 2.71v2.26h2.88c1.69-1.55 2.66-3.84 2.66-6.61z"
      />
      <path
        fill="#fff"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.88-2.26c-.8.54-1.83.86-3.08.86-2.37 0-4.38-1.6-5.1-3.75H.96v2.36C2.43 16.05 5.48 18 9 18z"
        opacity="0.85"
      />
      <path
        fill="#fff"
        d="M3.9 10.67c-.18-.54-.28-1.12-.28-1.72s.1-1.18.28-1.72V4.87H.96A8.99 8.99 0 0 0 0 8.95c0 1.45.35 2.83.96 4.08l2.94-2.36z"
        opacity="0.7"
      />
      <path
        fill="#fff"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0 5.48 0 2.43 1.95.96 4.87L3.9 7.23C4.62 5.08 6.63 3.58 9 3.58z"
        opacity="0.55"
      />
    </svg>
  );
}
