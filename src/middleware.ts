import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";


const publicRoutes = [
    "/",
    "/login",
    "/devmode",
    "/verify",
];

const publicApiRoutes = [
    "/api/auth",
    "/api/profiles/verify",
    "/api/profiles/resend",
];

function isPublicRoute(pathname: string) {
    return publicRoutes.some((route) => {
        return pathname === route || pathname.startsWith(`${route}/`);
    });
}

function isPublicApiRoute(pathname: string) {
    return publicApiRoutes.some((route) => {
        return pathname === route || pathname.startsWith(`${route}/`);
    });
}

function isStaticAsset(pathname: string) {
    return (
        pathname.startsWith("/_next") ||
        pathname === "/manifest.json" ||
        pathname === "/sw.js" ||
        pathname === "/favicon.ico" ||
        /\.(?:png|jpg|jpeg|svg|gif|webp|ico|css|js|woff2?|ttf)$/i.test(pathname)
    );
}
export async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    if (isStaticAsset(pathname) || isPublicApiRoute(pathname)) {
        return NextResponse.next();
    }

    const token = await getToken({
        req,
        secret: process.env.NEXTAUTH_SECRET,
    });

    // Logged out: block everything except public routes
    if (!token && !isPublicRoute(pathname)) {
        if (pathname.startsWith("/api")) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const loginUrl = new URL("/login", req.url);
        loginUrl.searchParams.set("callbackUrl", pathname);
        return NextResponse.redirect(loginUrl);
    }

    // Logged in: don't let them sit on login page
    if (token && pathname === "/login") {
        return NextResponse.redirect(new URL("/home", req.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};