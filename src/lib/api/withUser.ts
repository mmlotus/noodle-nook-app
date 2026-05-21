import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/app/api/auth/userHelpers";

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