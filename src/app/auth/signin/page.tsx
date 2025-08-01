
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { ErrorMessage } from "@/components/ui/error-message";

const supabase = createClient();

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleGoogleSignIn = async () => {
    setErrorMessage("");
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) {
        console.error('Google sign-in error:', error);
        setErrorMessage(error.message || 'Failed to sign in with Google.');
        toast.error(error.message || 'Failed to sign in with Google.');
      }
    } catch (err) {
      console.error('Unexpected error during Google sign-in:', err);
      setErrorMessage('An unexpected error occurred. Please try again.');
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ✅ Check for auth callback error in URL
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const error = searchParams.get("error");
    if (error === "auth_callback_error") {
      setErrorMessage(
        "There was a problem with the authentication process. Please try again."
      );
    }
  }, []);

  const handleSignin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("Signin error:", error);

        // ✅ Friendly error messages
        if (error.message.includes("Email not confirmed")) {
          const msg = "Please verify your email before signing in.";
          setErrorMessage(msg);
          toast.error(msg);
        } else {
          const errorMsg =
            error.message || "Signin failed. Please check your credentials.";
          setErrorMessage(errorMsg);
          toast.error(errorMsg);
        }
        return;
      }

      // ✅ Ensure session exists before redirect
      if (data?.session) {
        toast.success("Successfully signed in!");
        router.push("/polldashboard");
      } else {
        const msg = "Session not created. Please try again.";
        setErrorMessage(msg);
        toast.error(msg);
      }
    } catch (err) {
      console.error("Unexpected error during signin:", err);
      const errorMsg = "An unexpected error occurred. Please try again.";
      setErrorMessage(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-background px-4 rounded-2xl">
      <Card className="w-full max-w-md p-6 shadow-lg border rounded-2xl">
        <CardContent>
          <h2 className="text-2xl font-bold mb-6 text-center">Sign In</h2>
          {errorMessage && <ErrorMessage message={errorMessage} />}
          <form onSubmit={handleSignin} className="space-y-5">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <span
                  className="absolute right-3 top-2 cursor-pointer text-gray-500"
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </span>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or continue with
                </span>
              </div>
            </div>

            <Button 
              type="button" 
              className="w-full bg-red-500 hover:bg-black-600 text-white"
              onClick={handleGoogleSignIn}
              disabled={loading}
            >
              Sign In with Google
            </Button>
          </form>

          <p className="mt-4 text-sm text-center text-muted-foreground">
            Don&apos;t have an account?{" "}
            <a href="/auth/signup" className="text-blue-500 underline">
              Sign Up
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
