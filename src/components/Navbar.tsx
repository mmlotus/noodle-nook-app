"use client";

import Link from "next/link";
import navStyles from "./Navbar.module.css";
import { signOut } from "next-auth/react";
import { useCurrentUser } from "@/lib/useCurrentUser";
import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import toast from "react-hot-toast";

export default function Navbar() {
    const { user, isAuthenticated } = useCurrentUser();
    const pathname = usePathname();

    const [menuOpen, setMenuOpen] = useState(false);
    const closeMenu = () => setMenuOpen(false);
    const [org, setOrg] = useState("default");

    useEffect(() => {
        if (
            pathname === "/login" ||
            pathname === "/devmode" ||
            !isAuthenticated
        ) {
            setOrg("default");
        } else {
            setOrg(user.org || "default");
        }

        if (!menuOpen) return;

        const handleClick = (e: MouseEvent) => {
            const menu = document.getElementById("sideMenu");
            if (menu && !menu.contains(e.target as Node)) {
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
    }, [pathname, isAuthenticated, menuOpen, user.org]);

    const handleSignOut = async () => {
        try {
            await signOut({ redirect: false });
            window.location.href = "/login";
        } catch (err) {
            console.error("Sign out failed:", err);
            toast.error("We're having trouble signing you out.");
        }
    };

    const showNavLinks =
        isAuthenticated &&
        pathname !== "/login" &&
        pathname !== "/devmode" &&
        pathname !== "/home";

    const isMileagePage =
        isAuthenticated &&
        pathname.includes("mileage");

    const expenseNavLabel = isMileagePage ? "My Mileage" : "My Expenses";

    return (
        <nav className={`${navStyles.nav} ${navStyles[org]}`}>
            <div className={navStyles.title}>{expenseNavLabel}</div>

            {/* Only show links if user is logged in */}
            {showNavLinks && (
                <>
                    {/* Desktop links */}
                    <div className={navStyles.links}>
                        {isAuthenticated && (
                            <>
                                {/* Always Show */}
                                <Link href="/home" className={navStyles.link}>Home</Link>
                                <Link href="/expenses" className={navStyles.link}>My Expenses</Link>
                                <Link href="/mileage" className={navStyles.link}>My Mileage</Link>
                                <Link href="/manage-accounts" className={navStyles.link}>My Cards</Link>
                                <Link href="/profile" className={navStyles.link}>Profile</Link>

                                {/* Executives, Accountants, Admins */}
                                {user?.role !== "User" && (
                                    <>
                                        <Link href="/review-export" className={navStyles.link}>Review & Export</Link>
                                    </>
                                )}
                                {/* Admin Only */}
                                {user?.role === "Admin" && (
                                    <>
                                        <Link href="/users" className={navStyles.link}>User Roles</Link>
                                    </>
                                )}
                            </>
                        )}
                        <button
                            onClick={() => signOut({ callbackUrl: "/login" })}
                            className={navStyles.link}
                        >Sign Out</button>
                    </div>

                    {/* Hamburger for mobile */}
                    < button className={navStyles.hamburger} onClick={() => setMenuOpen(!menuOpen)}>☰</button>

                    {/* Slide-out menu */}
                    <div className={`${navStyles.mobileMenu} ${menuOpen ? navStyles.open : ""}`}>
                        <button className={navStyles.closeBtn} onClick={() => setMenuOpen(false)}>✕</button>
                        {isAuthenticated && (
                            <>
                                {/* Always Show*/}
                                <Link href="/home" className={navStyles.link} onClick={closeMenu}>Home</Link>
                                <Link href="/expenses" className={navStyles.link} onClick={closeMenu}>My Expenses</Link>
                                <Link href="/mileage" className={navStyles.link} onClick={closeMenu}>My Mileage</Link>
                                <Link href="/manage-accounts" className={navStyles.link} onClick={closeMenu}>My Cards</Link>
                                <Link href="/profile" className={navStyles.link} onClick={closeMenu}>Profile</Link>

                                {/* Executives, Accountants, Admins */}
                                {user?.role !== "User" && (
                                    <>
                                        <Link href="/review-export" className={navStyles.link} onClick={closeMenu}>Review & Export</Link>
                                    </>
                                )}

                                {/* Admin Only */}
                                {user?.role === "Admin" && (
                                    <>
                                        <Link href="/users" className={navStyles.link} onClick={closeMenu}>User Roles</Link>
                                    </>
                                )}
                            </>
                        )}
                        <button onClick={() => {
                            setMenuOpen(false); handleSignOut();
                        }} className={navStyles.signout}>Logout</button>
                    </div>
                </>
            )
            }
        </nav >
    );
}