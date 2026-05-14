import "next-auth";

declare module "next-auth" {
    interface Session {
        user: {
            /** Default NextAuth user fields */
            name?: string | null;
            email?: string | null;
            image?: string | null;
            /** Custom fields */
            role?: string;
            org?: string;
            email_verified?: number;
            org_access?: string[];
            user_access?: string[];
            company?: string;
            email_alt?: string;
        };
        org?: string; // optional for top-level
    }

    interface User {
        role?: string;
        org?: string;
        email_verified?: number;
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        /** Default JWT fields */
        name?: string | null;
        email?: string | null;
        picture?: string | null;
        sub?: string;

        /** Custom fields */
        role?: string;
        org?: string;
        email_verified?: number;
        org_access?: string[];
        user_access?: string[];
        company?: string;
        email_alt?: string;
    }
}
