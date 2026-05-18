"use client";

import Banner from "@/components/Images/banner";
import ToolTips from "@/components/ToolTips/ToolTips";
import SystemUpdates from "@/components/Updates/SystemUpdates";
import { systemUpdates } from "@/components/Updates/SysUpdRegistry";
import { useCurrentUser } from "@/lib/useCurrentUser";
import global from "@/styles/Global.module.css";
import Image from "next/image";
import Link from "next/link";

export default function HomePage() {
    const { user } = useCurrentUser();

    const name = user.name ? user.name.split(" ")[0] : "";

    const hasUpdates = systemUpdates.length > 0;

    return (
        <div className={global.pageWrapper}>
            <Banner
                type="default"
                title={!name ? "Welcome!" : `Welcome, ${name}!`}
                subtitle={`Your Dashboard`}
            />

            <Image
                className={global.authLogo}
                src="/icons/NoodleNook-180x180.png"
                alt="NoodleNook"
                width={90}
                height={90}
                style={{ marginTop: "24px", marginBottom: "2px" }}
            />

            <ToolTips pageId="home" />

            <div className={global.fullWidthSeparator} />
            <div className={global.subcentered}>My Wellness</div>

            <div className={global.grid}>
                <Link href="/weight" className={global.card}>
                    <h2>Weight</h2>
                    <p>Log your weight & view progress over time.</p>
                </Link>
                <Link href="/meals" className={global.card}>
                    <h2>Meals</h2>
                    <p>Track meals, food patterns & routines.</p>
                </Link>
                <Link href="/mood" className={global.card}>
                    <h2>Mood</h2>
                    <p>Check in with how you are feeling each day.</p>
                </Link>
                <Link href="/habits" className={global.card}>
                    <h2>Habits</h2>
                    <p>Keep up with recurring habits & daily goals.</p>
                </Link>
            </div>

            <div className={global.fullWidthSeparator} />
            <div className={global.subcentered}>My Work</div>

            <div className={global.grid}>
                <Link href="/mileage" className={global.card}>
                    <h2>Mileage</h2>
                    <p>Track your mileage</p>
                </Link>
            </div>

            <div className={global.fullWidthSeparator} />
            <label className={global.subcentered}>My Account</label>

            <div className={global.grid}>
                <Link href="/profile" className={global.card}>
                    <h2>Your Profile</h2>
                    <p>Edit your settings.</p>
                </Link>
            </div>

            {/* UPDATES SECTION */}
            {
                hasUpdates && (
                    <>
                        <div className={global.fullWidthSeparator} />
                        <SystemUpdates minToShow={1} />
                    </>
                )
            }
        </div >
    )
}