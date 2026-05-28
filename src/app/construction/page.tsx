"use client";

import global from "@/styles/Global.module.css";
import Image from "next/image";
import Link from "next/link";

export default function UnderConstructionPage() {
    return (
        <main className={global.pageWrapper}>
            <div className={global.centeredPanel}>
                <Image src="/icons/NoodleNook-512x512.svg" alt="" width={360} height={360} />
                <Link href="/home" className={global.card}>Take me back home</Link>
            </div>
        </main>
    );
}