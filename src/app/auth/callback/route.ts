




import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  // ✅ Await because TS expects Promise
  const cookieStore = await cookies();
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/auth/signin", request.url));
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set(name, value, options);
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set(name, "", { ...options, maxAge: 0 });
        },
      },
    }
  );

  try {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return NextResponse.redirect(
        new URL("/auth/signin?error=auth_callback_error", request.url)
      );
    }

    if (data?.user && !data.user.email_confirmed_at) {
      return NextResponse.redirect(new URL("/auth/verify-email", request.url));
    }

    const redirectTo =
      requestUrl.searchParams.get("redirect_to") || "/auth/post-login";
    return NextResponse.redirect(new URL(redirectTo, request.url));
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (_) {
    return NextResponse.redirect(
      new URL("/auth/signin?error=auth_callback_error", request.url)
    );
  }
}

