import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(req: NextRequest) {

  let response = NextResponse.next({
    request: {
      headers: req.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));

          response = NextResponse.next({
            request: {
              headers: req.headers,
            },
          });

          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const user = session?.user;

  const protectedRoutes = [
    "/dashboard",
    "/interviewer",
    "/feedback",
    "/setup",
    "/uploadresume",
  ];

  const isProtected = protectedRoutes.some((route) =>
    req.nextUrl.pathname.startsWith(route)
  );

  // block unauthorized users
  if (isProtected && !user) {
    const url = req.nextUrl.clone();
    url.pathname = "/unauthorized";
    return NextResponse.rewrite(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/uploadresume/:path*",
    "/interviewer/:path*",
    "/feedback/:path*",
    "/setup/:path*",
  ],
};