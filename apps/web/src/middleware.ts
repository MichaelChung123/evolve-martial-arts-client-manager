import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE_NAME = "session_token";

export function middleware(request: NextRequest) {
    const session = request.cookies.get(SESSION_COOKIE_NAME);

    if (!session && !request.nextUrl.pathname.startsWith("/login") && !request.nextUrl.pathname.startsWith("/signup")) {
        return NextResponse.redirect(new URL("/login", request.url));
    }

    if (session && (request.nextUrl.pathname.startsWith("/login") || request.nextUrl.pathname.startsWith("/signup"))) {
        return NextResponse.redirect(new URL("/", request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/", "/login", "/signup"],
};
