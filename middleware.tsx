import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          request.cookies.set({
            name,
            value,
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: any) {
          request.cookies.set({
            name,
            value: "",
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value: "",
            ...options,
          });
        },
      },
    }
  );

  // Add error handling for session retrieval
  let session = null;
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.error("Error getting session:", error);
    } else {
      session = data.session;
    }
  } catch (err) {
    console.error("Unexpected error getting session:", err);
  }

  // If user is signed in and the current path is /auth/signin or /auth/signup, redirect to /polldashboard
  if (
    session &&
    (request.nextUrl.pathname === "/auth/signin" ||
      request.nextUrl.pathname === "/auth/signup")
  ) {
    return NextResponse.redirect(new URL("/polldashboard", request.url));
  }

  // If user is not signed in and the current path is /polldashboard, redirect to /auth/signin
  if (!session && request.nextUrl.pathname.startsWith("/polldashboard")) {
    return NextResponse.redirect(new URL("/auth/signin", request.url));
  }

  // If the current path is /, redirect to /auth/signup
  if (request.nextUrl.pathname === "/") {
    return NextResponse.redirect(new URL("/auth/signup", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/", "/auth/signin", "/auth/signup", "/polldashboard/:path*"],
};
