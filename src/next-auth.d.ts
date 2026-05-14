import "next-auth";

declare module "next-auth" {
    interface Session {
        user: {
            id?: number | string | null;
            name?: string | null;
            email?: string | null;
            image?: string | null;
        };
    }

    interface User {
        id: number | string;
        name?: string | null;
        email?: string | null;
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        id?: number | string | null;
        name?: string | null;
        email?: string | null;
        picture?: string | null;
        sub?: string;
    }
}
