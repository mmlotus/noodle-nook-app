import { useSession } from "next-auth/react";

export function useCurrentUser() {
    const { data: session, status, update } = useSession();

    const isAuthenticated = status === "authenticated";
    const isLoading = status === "loading";

    const user = {
        email: session?.user?.email || "",
        name: session?.user?.name || "",
        role: session?.user?.role || "",
        org: session?.org || session?.user?.org || "",
        email_verified: session?.user?.email_verified ?? 0,
        org_access: session?.user?.org_access || "",
        user_access: session?.user?.user_access || ""
    };

    return {
        isAuthenticated,
        isLoading,
        update,
        user,
    };
}