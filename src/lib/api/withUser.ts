import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/app/api/auth/userHelpers";
import db from "@/lib/db";

export type AuthedUser = {
    id: string;
    email: string;
    name?: string | null;
};

type RouteContext<TParams = unknown> = {
    params?: TParams;
};

type AuthedHandler<TParams = unknown> = (
    req: NextRequest,
    context: RouteContext<TParams>,
    user: AuthedUser
) => Promise<NextResponse>;

export function withUser<TParams = unknown>(handler: AuthedHandler<TParams>) {
    return async function authedRouteHandler(
        req: NextRequest,
        context: RouteContext<TParams>
    ) {
        try {
            const user = await getCurrentUser(req);

            if (!req.nextUrl.pathname.startsWith("/api/push")) {
                try {
                    await db.query(
                        `
                        UPDATE users
                        SET last_active_at = NOW()
                        WHERE id = $1
                        AND (
                            last_active_at IS NULL
                            OR last_active_at < NOW() - INTERVAL '5 minutes'
                        )
                    `,
                        [user.id]
                    );
                } catch (err) {
                    console.error("Failed to update last_active_at:", err);
                }
            }

            return handler(req, context, {
                id: String(user.id),
                email: user.email,
                name: user.name ?? null,
            });
        } catch {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }
    };
}