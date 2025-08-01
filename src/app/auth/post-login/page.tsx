"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function PostLogin() {
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      const supabase = createClient();
      const { data, error } = await supabase.auth.getSession();
      if (data?.session) {
        router.replace("/polldashboard");
      } else {
        router.replace("/auth/signin?error=session_not_found");
      }
    };
    checkSession();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-background px-4">
      <div className="w-full max-w-md p-6 shadow-lg border rounded-2xl text-center">
        <h2 className="text-2xl font-bold mb-6">Signing you in...</h2>
        <p className="text-gray-600 dark:text-gray-300">Please wait while we complete your sign-in.</p>
      </div>
    </div>
  );
}