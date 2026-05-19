import { redirect } from "next/navigation";
import { auth, isAuthEnabled } from "@/auth";
import { LoginButton } from "@/components/LoginButton";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (!isAuthEnabled()) {
    redirect("/");
  }
  const session = await auth();
  if (session?.user?.email) {
    redirect("/");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F2F2F7] px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold tracking-tight text-[#1C1C1E]">
          サインイン
        </h1>
        <p className="mt-2 text-sm text-[#8E8E93]">
          案件一覧を表示するには Google アカウントでサインインしてください。
        </p>
        <div className="mt-6">
          <LoginButton callbackUrl="/" />
        </div>
        <p className="mt-6 text-xs text-[#8E8E93]">
          ※ 案件ページは URL
          を知っていればサインインなしでも閲覧できます（編集は不可）。
        </p>
      </div>
    </div>
  );
}
