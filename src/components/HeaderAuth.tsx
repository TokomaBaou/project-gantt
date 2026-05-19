"use client";

import { signIn, signOut } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import type { Role } from "@/lib/permissions";

const ROLE_LABEL: Record<Role, string> = {
  admin: "Admin",
  editor: "Editor",
  viewer: "Viewer",
};

interface HeaderAuthProps {
  authEnabled: boolean;
  user: { email: string; role: Role | null } | null;
}

export function HeaderAuth({ authEnabled, user }: HeaderAuthProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onClick = (e: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  if (!authEnabled) {
    return null;
  }

  if (!user) {
    return (
      <button
        type="button"
        onClick={() => void signIn("google", { callbackUrl: "/" })}
        className="rounded-lg bg-[#007AFF] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#0051D5]"
      >
        Google サインイン
      </button>
    );
  }

  const initial = user.email.charAt(0).toUpperCase();
  const roleLabel = user.role ? ROLE_LABEL[user.role] : "未承認";

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full bg-[#F2F2F7] py-1 pl-1 pr-3 text-xs transition hover:bg-[#E5E5EA]"
        aria-expanded={open}
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#007AFF] text-[11px] font-semibold text-white">
          {initial}
        </span>
        <span className="text-[#1C1C1E]">{user.email}</span>
      </button>

      {open && (
        <div className="absolute right-0 z-10 mt-2 w-64 rounded-xl border border-[#E5E5EA] bg-white p-3 shadow-xl">
          <div className="space-y-0.5">
            <div className="text-xs font-medium text-[#1C1C1E]">
              {user.email}
            </div>
            <div className="text-[11px] text-[#8E8E93]">
              ロール: <span className="font-medium">{roleLabel}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void signOut({ callbackUrl: "/login" })}
            className="mt-3 w-full rounded-lg border border-[#E5E5EA] bg-white px-3 py-1.5 text-xs font-medium text-[#FF3B30] transition hover:bg-[#FFE5E5]"
          >
            ログアウト
          </button>
        </div>
      )}
    </div>
  );
}
