// import { createServerClient } from '@supabase/ssr'
// import { cookies } from 'next/headers'
// import { NextResponse } from 'next/server'

// export async function GET(request: Request) {
//   const cookieStore = await cookies()
//   const requestUrl = new URL(request.url)
//   const code = requestUrl.searchParams.get('code')

//   if (code) {

//     const supabase = createServerClient(
//       process.env.NEXT_PUBLIC_SUPABASE_URL!,
//       process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
//       {
//         cookies: {
//           get(name: string) {
//             return cookieStore.get(name)?.value
//           },
//         },
//       }
//     )

//     try {
//       const { data, error } = await supabase.auth.exchangeCodeForSession(code);

//       console.log('Callback data:', data);
      
//       if (error) {
//         console.error('Callback error:', error);
//         // Redirect to signin with error parameter
//         return NextResponse.redirect(new URL('/auth/signin?error=auth_callback_error', request.url));
//       }

//       if (data?.user && !data.user.email_confirmed_at) {
//         // If email is not confirmed, redirect to a page asking them to verify
//         return NextResponse.redirect(new URL('/auth/verify-email', request.url));
//       }
//     } catch (err) {
//       console.error('Unexpected error in auth callback:', err);
//       // Redirect to signin with error parameter
//       return NextResponse.redirect(new URL('/auth/signin?error=auth_callback_error', request.url));
//     }
//   }

//   // URL to redirect to after sign in process completes
//   return NextResponse.redirect(new URL('/polldashboard', request.url));
// }


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
      requestUrl.searchParams.get("redirect_to") || "/polldashboard";
    return NextResponse.redirect(new URL(redirectTo, request.url));
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (_) {
    return NextResponse.redirect(
      new URL("/auth/signin?error=auth_callback_error", request.url)
    );
  }
}

