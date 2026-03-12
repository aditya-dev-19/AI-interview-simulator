import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  
  // Add this temporarily to confirm middleware is running
  console.log("MIDDLEWARE RUNNING ON:", pathname);

  let response = NextResponse.next({
    request: { headers: req.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return req.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => 
            req.cookies.set(name, value)
          );
          response = NextResponse.next({ 
            request: { headers: req.headers } 
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  console.log("USER:", user ? "authenticated" : "not authenticated");
  console.log("PATH:", pathname);

  const protectedRoutes = [
    "/dashboard",
    "/interviewer",
    "/feedback",
    "/setup",
    "/uploadresume",
  ];

  const isProtected = protectedRoutes.some(route =>
    pathname.startsWith(route)
  );

  console.log("IS PROTECTED:", isProtected);

  if (isProtected && !user) {
    console.log("REDIRECTING TO /auth");
    return NextResponse.redirect(new URL("/auth", req.url));
  }

  if (pathname.startsWith("/auth") && user) {
    console.log("REDIRECTING TO /dashboard");
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)",
  ],
};
// import { NextResponse } from "next/server";
// import type { NextRequest } from "next/server";
// import { createServerClient } from "@supabase/ssr";

// export async function middleware(req: NextRequest) {
//   let response = NextResponse.next({
//     request: { headers: req.headers },
//   });

//   const supabase = createServerClient(
//     process.env.NEXT_PUBLIC_SUPABASE_URL!,
//     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
//     {
//       cookies: {
//         getAll() { return req.cookies.getAll(); },
//         setAll(cookiesToSet) {
//           cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
//           response = NextResponse.next({ request: { headers: req.headers } });
//           cookiesToSet.forEach(({ name, value, options }) =>
//             response.cookies.set(name, value, options)
//           );
//         },
//       },
//     }
//   );

//   const { data: { user } } = await supabase.auth.getUser();
//   const { pathname } = req.nextUrl;

//   const protectedRoutes = [
//     "/dashboard",
//     "/interviewer", 
//     "/feedback",
//     "/setup",
//     "/uploadresume"
//   ];

//   const isProtected = protectedRoutes.some(route => 
//     pathname.startsWith(route)
//   );

//   // Unauthenticated user hitting protected route → send to /auth
//   if (isProtected && !user) {
//     return NextResponse.redirect(new URL("/auth", req.url));
//   }

//   // Authenticated user hitting /auth → send to /dashboard  
//   if (pathname.startsWith("/auth") && user) {
//     return NextResponse.redirect(new URL("/dashboard", req.url));
//   }

//   return response;
// }

// export const config = {
//   // Run on ALL routes except Next.js internals and static files
//   matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
// };
// import { NextResponse } from "next/server";
// import type { NextRequest } from "next/server";
// import { createServerClient } from "@supabase/ssr";

// export async function middleware(req: NextRequest) {

//   const res = NextResponse.next();

//   const supabase = createServerClient(
//     process.env.NEXT_PUBLIC_SUPABASE_URL!,
//     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
//     {
//       cookies: {
//         getAll() {
//           return req.cookies.getAll();
//         },
//         setAll(cookiesToSet) {
//           cookiesToSet.forEach(({ name, value, options }) =>
//             res.cookies.set(name, value, options)
//           );
//         },
//       },
//     }
//   );

//    const { data: { user } } = await supabase.auth.getUser();
//   const { pathname } = req.nextUrl;

//   const isProtected = ["/dashboard", "/interviewer", "/feedback", "/setup", "/uploadresume"]
//     .some(route => pathname.startsWith(route));

//   const isAuthPage = pathname.startsWith("/auth");

//   // Redirect unauthenticated users away from protected routes
//   if (isProtected && !user) {
//     return NextResponse.redirect(new URL("/auth", req.url));
//   }

//   // Redirect authenticated users away from auth page
//   if (isAuthPage && user) {
//     return NextResponse.redirect(new URL("/dashboard", req.url));
//   }

//   return res;
// }

// export const config = {
//   matcher: [
//     "/((?!_next/static|_next/image|favicon.ico|public).*)",
//   ],
// };

// import { NextResponse } from "next/server";
// import type { NextRequest } from "next/server";
// import { createServerClient } from "@supabase/ssr";

// export async function middleware(req: NextRequest) {
//   let response = NextResponse.next({
//     request: {
//       headers: req.headers,
//     },
//   });

//   const supabase = createServerClient(
//     process.env.NEXT_PUBLIC_SUPABASE_URL!,
//     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
//     {
//       cookies: {
//         getAll() {
//           return req.cookies.getAll();
//         },
//         setAll(cookiesToSet) {
//           cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
//           response = NextResponse.next({
//             request: {
//               headers: req.headers,
//             },
//           });
//           cookiesToSet.forEach(({ name, value, options }) =>
//             response.cookies.set(name, value, options)
//           );
//         },
//       },
//     }
//   );

//   const {
//     data: { user },
//   } = await supabase.auth.getUser();

//   const protectedRoutes = ["/dashboard", "/interviewer", "/feedback", "/setup", "/uploadresume"];

//   const isProtected = protectedRoutes.some((route) =>
//     req.nextUrl.pathname.startsWith(route)
//   );

//   if (isProtected && !user && !req.nextUrl.pathname.startsWith("/auth")) {
//     return NextResponse.redirect(new URL("/auth", req.url));
//   }

//   return response;
// }

// export const config = {
//   matcher: ["/dashboard/:path*", "/interviewer/:path*", "/feedback/:path*", "/setup/:path*", "/uploadresume/:path*"],
// };