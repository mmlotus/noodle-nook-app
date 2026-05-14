import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import MicrosoftProvider from "next-auth/providers/azure-ad";
import CredentialsProvider from "next-auth/providers/credentials";
import { getUserByEmail, createUser, sendVerificationEmail } from "@/app/api/auth/userHelpers";
import { hasErrorCode } from "@/lib/api-errors";

export type User = {
    id: number;
    email: string;
    name?: string;
    email_alt?: string;
    email_verified: number;
    company?: string;
    role?: string;
    created_at?: string;
    org_access?: string[];
    user_access?: string[];
};

const allowedDomains = ["lotusecigs.com", "boisevape.com", "bedrockmfg.co"];

function emailToOrg(email: string) {
    const domain = email.split("@")[1]?.toLowerCase();
    if (domain === "boisevape.com") return "vape";
    if (domain === "lotusecigs.com") return "lotus";
    if (domain === "bedrockmfg.co") return "bedrock";
    return "default";
}

export const authOptions: NextAuthOptions = {
    session: {
        strategy: "jwt",
        maxAge: 60 * 60 * 24 * 2, //48 hours
    },
    jwt: {
        maxAge: 60 * 60 * 24 * 2, //same as session
    },

    providers: [
        // Google Workspace - LOTUS
        GoogleProvider({
            id: "google-lotus",
            name: "Lotus Login",
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,

            authorization: {
                params: {
                    scope: "openid email profile",
                    prompt: "login",
                },
            },

            profile(profile) {
                return {
                    id: profile.sub,
                    name: profile.name,
                    email: profile.email,
                };
            },
        }),

        // Google Workspace - BEDROCK
        GoogleProvider({
            id: "google-bedrock",
            name: "Bedrock Login",
            clientId: process.env.GOOGLE_CLIENT_ID_BR!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET_BR!,

            authorization: {
                params: {
                    scope: "openid email profile",
                    prompt: "login",
                },
            },

            profile(profile) {
                return {
                    id: profile.sub,
                    name: profile.name,
                    email: profile.email,
                };
            },
        }),


        // Microsoft 365 (via GoDaddy)
        MicrosoftProvider({
            clientId: process.env.AZURE_AD_CLIENT_ID!,
            clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
            tenantId: process.env.AZURE_AD_TENANT_ID, // Lock to our organization

            authorization: {
                params: {
                    scope: "openid profile email",
                    prompt: "login",
                },
            },

            profile(profile) {
                return {
                    id: profile.sub,
                    name: profile.name,
                    email: profile.email,
                };
            },
        }),

        // Devmode credentials (local/test only)
        ...(process.env.NODE_ENV !== "production"
            ? [
                CredentialsProvider({
                    name: "Developer",
                    credentials: {
                        username: { label: "Username", type: "text" },
                        password: { label: "Password", type: "password" },
                        org: {
                            label: "Organization",
                            type: "select",
                            options: [
                                { value: "vape", label: "Vape" },
                                { value: "lotus", label: "Lotus" },
                                { value: "bedrock", label: "Bedrock" },
                            ],
                        },
                    },
                    async authorize(credentials) {
                        console.log("DEV LOGIN raw credentials:", credentials);

                        const creds = { ...credentials };

                        console.log("DEV LOGIN plain credentials:", creds);

                        if (
                            String(creds.username) === "devadmin" &&
                            String(creds.password) === "Supernoodle2015!"
                        ) {
                            const org = credentials?.org?.toLowerCase() || "vape";
                            const adminEmails: Record<string, string> = {
                                vape: "admin@boisevape.com",
                                bedrock: "admin@bedrockmfg.co",
                                lotus: "admin@lotusecigs.com",
                            };
                            const email = adminEmails[org] || `admin@${org}.com`;

                            return {
                                id: `dev-${org}`,
                                name: "Admin User",
                                email,
                                role: "developer",
                                org,
                            };
                        }
                        console.log("DEV LOGIN failed");
                        return null;
                    },
                }),
            ]
            : []),
    ],

    pages: {
        signIn: "/login",
    },

    callbacks: {
        async signIn({ user, account, profile }) {
            try {
                console.log("DEBUG: signIn start", { user, account, profile });

                // ✅ Skip domain check for hardcoded dev user
                if (account?.provider === "credentials") {
                    console.log("DEBUG: Dev login detected.");
                    return true;
                }

                const email = (profile?.email || user?.email || "").toLowerCase();
                console.log("DEBUG: Extracted email", email);

                if (!email.includes("@")) {
                    console.error("No valid email from provider:", account?.provider, profile);
                    return false;
                }

                const domain: string = email.split("@")[1]?.toLowerCase() || "";
                console.log("DEBUG: Extracted domain:", domain);

                // Provider > domain enforcement
                if (domain === "boisevape.com" && account?.provider !== "azure-ad") {
                    console.warn("DEBUG: Boisevape login attempted with wrong provider:", account?.provider);
                    return false;
                }
                if (domain === "lotusecigs.com" && account?.provider !== "google-lotus") {
                    console.warn("DEBUG: Lotus/Bedrock login attempted with wrong provider:", account?.provider);
                    return false;
                }
                if (domain === "bedrockmfg.co" && account?.provider !== "google-bedrock") {
                    console.warn("DEBUG: Lotus/Bedrock login attempted with wrong provider:", account?.provider);
                    return false;
                }
                if (!allowedDomains.includes(domain)) {
                    console.warn("DEBUG: Domain not in allowedDomains:", domain);
                    return false;
                }

                console.log("DEBUG: Checking for existing user in DB...");
                const existingUser = (await getUserByEmail(email)) as User | undefined;
                console.log("DEBUG: existingUser result:", existingUser);

                if (!existingUser) {
                    console.log("DEBUG: User not found. Creating new user...");
                    try {
                        await createUser({
                            email,
                            name: profile?.name || "",
                            company: emailToOrg(email),
                            created_at: new Date().toISOString(),
                        });

                        console.log("DEBUG: Sending verification email to:", email);
                        await sendVerificationEmail(email);
                        return '/login?error=unverified';
                    } catch (err: unknown) {
                        if (hasErrorCode(err) && err.code === "23505") {
                            console.warn("DEBUG: User already exists (race condition). Continuing login.");
                        } else {
                            console.error("ERROR creating user:", err);
                            return false;
                        }
                    }
                } else if (existingUser.email_verified !== 1) {
                    console.log("DEBUG: User exists but is not verified. Sending verfication email...");
                    await sendVerificationEmail(email);
                    return '/login?error=unverified';
                }

                console.log("DEBUG: SignIn success for:", email);
                return true;

            } catch (err) {
                console.error("ERROR in signIn callback:", err);
                return false;
            }
        },

        async jwt({ token, user }) {
            if (user) {
                token.role = user.role;
                token.email = user.email;
            }

            if (token.email) {
                const dbUser = await getUserByEmail(token.email);
                if (dbUser) {
                    token.role = dbUser.role;
                    token.email_verified = dbUser.email_verified;
                    token.org_access = Array.isArray(dbUser.org_access) ? dbUser.org_access : (token.org_access ?? []);
                    token.user_access = Array.isArray(dbUser.user_access) ? dbUser.user_access : (token.user_access ?? []);

                    if (dbUser.company) {
                        token.org = dbUser.company.toLowerCase();
                    } else {
                        token.org = emailToOrg(token.email);
                    }
                } else {
                    token.org = emailToOrg(token.email);
                }
            }
            return token;
        },

        async session({ session, token }) {
            if (token?.role) {
                session.user.role = token.role;
            }

            // Always use token.email first, fallback to session.user.email
            const email = token?.email || session?.user?.email || "";

            if (token?.org) {
                //If org already stored in JWT, use it
                session.org = token.org;
            } else if (email.endsWith("@boisevape.com")) {
                session.org = "vape";
            } else if (email.endsWith("@lotusecigs.com")) {
                session.org = "lotus";
            } else if (email.endsWith("@bedrockmfg.co")) {
                session.org = "bedrock";
            } else {
                session.org = "default";
            }

            if (token?.email_verified !== undefined) {
                session.user.email_verified = token.email_verified;
            }

            if (token?.org_access) {
                session.user.org_access = token.org_access;
            }
            
            if (token?.user_access) {
                session.user.user_access = token.user_access;
            }
            
            return session;
        },

        redirect({ url, baseUrl }) {
            // If a callbackUrl is explicitly provided (i.e. signOut), use it
            if (url.startsWith("/")) return `${baseUrl}${url}`;
            else if (url.startsWith(baseUrl)) return url;
            return baseUrl + "/home"; // Default fallback
        },
    },
    secret: process.env.NEXTAUTH_SECRET,
};