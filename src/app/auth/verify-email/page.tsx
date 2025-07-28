
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useState } from "react";

const supabase = createClient();

export default function VerifyEmailPage() {
  const [loading, setLoading] = useState(false);

  const resendVerification = async () => {
    setLoading(true);
    const { data: user } = await supabase.auth.getUser();

    if (!user?.user?.email) {
      toast.error("No email found for this session.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.resend({
      type: "signup",
      email: user.user.email,
    });

    if (error) {
      toast.error("Failed to resend email. Try again later.");
    } else {
      toast.success("Verification email sent again!");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-background px-4">
      <Card className="w-full max-w-md p-6 shadow-lg border rounded-2xl text-center">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Verify Your Email</CardTitle>
          <CardDescription>
            A verification link has been sent to your email address. Please check your inbox (and spam folder).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            After verifying your email, you can proceed to sign in.
          </p>
          <Button
            onClick={resendVerification}
            disabled={loading}
            className="w-full"
          >
            {loading ? "Resending..." : "Resend Verification Email"}
          </Button>
          <Link href="/auth/signin" className="text-blue-500 hover:underline block mt-3">
            Go to Sign In
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
