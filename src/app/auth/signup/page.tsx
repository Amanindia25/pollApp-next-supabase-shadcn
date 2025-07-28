"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { ErrorMessage } from "@/components/ui/error-message";

const supabase = createClient();

export default function SignupPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState("user"); // Default role
  const [errorMessage, setErrorMessage] = useState("");

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    setErrorMessage("");

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match");
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: { role: role }, // Pass the selected role as user metadata
        },
      });

      console.log("Supabase signup data:", data);

      if (error) {
        console.log("Supabase error message:", error.message);
        console.log("Supabase error code:", error.code);

        // ✅ Handle duplicate user error
        if (error.code === "auth_user_already_exists") {
          const duplicateMsg =
            "This email is already registered. Please sign in.";
          setErrorMessage(duplicateMsg);
          toast.error(duplicateMsg);
          setTimeout(() => {
            router.push("/auth/signin");
          }, 2000); // Delay redirect to show message
          return; // Stop further execution
        }

        // Other errors
        setErrorMessage(error.message || "Something went wrong");
        toast.error(error.message || "Something went wrong");
        return;
      }

      toast.success(
        "Signup successful! Please verify your email before signing in."
      );
      router.push("/auth/signin");
    } catch (err) {
      console.error("Unexpected error during signup:", err);
      const errorMessage = "An unexpected error occurred. Please try again.";
      setErrorMessage(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-background px-4">
      <Card className="w-full max-w-md p-6 shadow-lg border rounded-2xl">
        <CardContent>
          <h2 className="text-2xl font-bold mb-6 text-center">
            Create your account
          </h2>
          {errorMessage && <ErrorMessage message={errorMessage} />}
          <form onSubmit={handleSignup} className="space-y-5">
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
                  type={showPass ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <span
                  className="absolute right-3 top-2 cursor-pointer text-gray-500"
                  onClick={() => setShowPass(!showPass)}
                >
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </span>
              </div>
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPass ? "text" : "password"}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                <span
                  className="absolute right-3 top-2 cursor-pointer text-gray-500"
                  onClick={() => setShowConfirmPass(!showConfirmPass)}
                >
                  {showConfirmPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </span>
              </div>
            </div>

            <div>
              <Label htmlFor="role">Register as</Label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing up..." : "Sign Up"}
            </Button>

            <p className="mt-4 text-sm text-center text-muted-foreground">
              Already have an account?{" "}
              <a href="/auth/signin" className="text-blue-500 underline">
                Sign in
              </a>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
