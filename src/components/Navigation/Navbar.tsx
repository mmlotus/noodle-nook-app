"use client";

import Link from "next/link";
import navStyles from "./Navbar.module.css";
import { Quicksand } from "next/font/google";
import { signOut } from "next-auth/react";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import toast from "react-hot-toast";
import Image from "next/image";

const quicksand = Quicksand({
    weight: ["700"],
    subsets: ["latin"],
});

export default function Navbar() {
    const { isAuthenticated } = useCurrentUser();
    const pathname = usePathname();

    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!menuOpen) return;

        const handleClick = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setMenuOpen(false);
            }
        };

        const handleScroll = () => {
            setMenuOpen(false);
        };

        document.addEventListener("mousedown", handleClick);
        document.addEventListener("scroll", handleScroll, true);

        return () => {
            document.removeEventListener("mousedown", handleClick);
            document.removeEventListener("scroll", handleScroll, true);
        };
    }, [menuOpen]);

    const handleSignOut = async () => {
        try {
            await signOut({ redirect: false });
            window.location.href = "/login";
        } catch (err) {
            console.error("Sign out failed:", err);
            toast.error("We're having trouble signing you out.");
        }
    };

    const showNav =
        isAuthenticated &&
        pathname !== "/" &&
        pathname !== "/login" &&
        pathname !== "/home";

    console.log("auth:", isAuthenticated);
    console.log("path:", pathname);

    return (
        <nav className={navStyles.nav}>
            <div className={navStyles.left}>
                <div className={navStyles.brand}>
                    <Image src="/icons/NoodleNook-20x20.svg" alt="" width={20} height={20} className={navStyles.logo} />
                    <div className={`${navStyles.title} ${quicksand.className}`}>NoodleNook</div>
                </div>
            </div>

            <div className={navStyles.right}>
                {showNav && (
                    <>
                        {/* Hamburger */}
                        <button
                            type="button"
                            aria-label="Open menu"
                            className={navStyles.hamburger}
                            onClick={() => setMenuOpen(true)}
                        >
                            <span></span>
                            <span></span>
                            <span></span>
                        </button>

                        {/* Slide-out menu */}
                        <div ref={menuRef} className={`${navStyles.mobileMenu} ${menuOpen ? navStyles.open : ""}`}>
                            <button className={navStyles.closeBtn} onClick={() => setMenuOpen(false)}>✕</button>
                            {isAuthenticated && (
                                <>
                                    <Link href="/home" className={navStyles.link}>HOME</Link>
                                    <Link href="/profile" className={navStyles.link}>Profile</Link>
                                </>
                            )}
                            <button onClick={() => {
                                setMenuOpen(false); handleSignOut();
                            }} className={navStyles.link}>LOGOUT</button>
                        </div>
                    </>
                )}

                {isAuthenticated && pathname === "/home" && (
                    <button onClick={handleSignOut} className={navStyles.link}>LOGOUT</button>
                )}
            </div>
        </nav >
    );
}