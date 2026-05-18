"use client";

import Link from "next/link";
import navStyles from "./Navigation/Navbar.module.css";
import Image from "next/image";
import { Copyright } from "lucide-react";

export default function Footer() {
    return (
        <footer className={navStyles.nav}>
            <div className={navStyles.left}>
                <Link href="/privacy" className={navStyles.link}>Privacy Policy</Link>
                <br />
                <Link href="/terms" className={navStyles.link}>Terms of Service</Link>
            </div>
            <div className={navStyles.right}>
                <Copyright size={15} />2026
                <span style={{ marginLeft: "10px" }}>
                    <Image src="/icons/NoodleNook-20x20.svg" alt="NoodleNook" width={10} height={10} className={navStyles.logo} />
                </span>
            </div>
        </footer>
    );
}