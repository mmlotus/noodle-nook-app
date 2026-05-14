import { useSession } from "next-auth/react";

export function useCurrentUser() {
    const { data: session, status, update } = useSession();

    const isAuthenticated = status === "authenticated";
    const isLoading = status === "loading";

    const user = {
        id: session?.user?.id ?? null,
        email: session?.user?.email || "",
        name: session?.user?.name || "",
    };

    return {
        isAuthenticated,
        isLoading,
        update,
        user,
    };
}