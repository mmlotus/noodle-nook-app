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
                loading="eager"
                priority
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
                <Link href="/construction" className={global.card}>
                    <h1 className={global.subWarn} style={{ fontSize: 14 }}>COMING SOON!</h1>
                    <h2>Meals</h2>
                    <p>Track meals, food patterns & routines.</p>
                </Link>
                <Link href="/construction" className={global.card}>
                    <h1 className={global.subWarn} style={{ fontSize: 14 }}>COMING SOON!</h1>
                    <h2>Recipes</h2>
                    <p>Put recipes in on the go to come back to later.</p>
                </Link>
                <Link href="/construction" className={global.card}>
                    <h1 className={global.subWarn} style={{ fontSize: 14 }}>COMING SOON!</h1>
                    <h2>Health</h2>
                    <p>Log your gym weights, times, etc. as you move through your health journey.</p>
                </Link>
                <Link href="/construction" className={global.card}>
                    <h1 className={global.subWarn} style={{ fontSize: 14 }}>COMING SOON!</h1>
                    <h2>Mood</h2>
                    <p>Check in with how you are feeling each day.</p>
                </Link>
                <Link href="/construction" className={global.card}>
                    <h1 className={global.subWarn} style={{ fontSize: 14 }}>COMING SOON!</h1>
                    <h2>Habits</h2>
                    <p>Keep up with recurring habits & daily goals.</p>
                </Link>
            </div>

            <div className={global.fullWidthSeparator} />
            <div className={global.subcentered}>My Money</div>

            <div className={global.grid}>
                <Link href="/budget/recurring" className={global.card}>
                    <h2>Bills & Income</h2>
                    <p>Enter your recurring bills and income, as well as expected expenses that may be coming up.</p>
                </Link>
                <Link href="/budget" className={global.card}>
                    <h2>Budget</h2>
                    <p>Keep tabs on your expected income, expenses, & physical payments.</p>
                </Link>
            </div>

            <div className={global.fullWidthSeparator} />
            <div className={global.subcentered}>My Lists</div>

            <div className={global.grid}>
                <Link href="/trackers/books" className={global.card}>
                    <h2>Books</h2>
                    <p>Track books to buy, read, finish, or revisit.</p>
                </Link>
                <Link href="/trackers/watchlist" className={global.card}>
                    <h2>Watchlist</h2>
                    <p>Track movies and TV shows you want to watch.</p>
                </Link>
                <Link href="/trackers/places" className={global.card}>
                    <h2>Places to Visit</h2>
                    <p>Keep track of places you want to go, things to see, & restaurants to eat out at.</p>
                </Link>
                <Link href="/notes" className={global.card}>
                    <h2>Notes</h2>
                    <p>Jot down quick ideas or long-term goals in a standard notepad format.</p>
                </Link>
                <Link href="/construction" className={global.card}>
                    <h1 className={global.subWarn} style={{ fontSize: 14 }}>COMING SOON!</h1>
                    <h2>Groceries</h2>
                    <p>Create your grocery list to take on the go.</p>
                </Link>
                <Link href="/construction" className={global.card}>
                    <h1 className={global.subWarn} style={{ fontSize: 14 }}>COMING SOON!</h1>
                    <h2>Shopping</h2>
                    <p>Create other shopping lists to take with you on your day out.</p>
                </Link>
                <Link href="/construction" className={global.card}>
                    <h1 className={global.subWarn} style={{ fontSize: 14 }}>COMING SOON!</h1>
                    <h2>Gifts</h2>
                    <p>Keep track of what you want for a special occasion or what you plan to get others.</p>
                </Link>
                <Link href="/construction" className={global.card}>
                    <h1 className={global.subWarn} style={{ fontSize: 14 }}>COMING SOON!</h1>
                    <h2>Create a Custom List</h2>
                    <p>Create your own!</p>
                </Link>
            </div>

            <div className={global.fullWidthSeparator} />
            <div className={global.subcentered}>My Work</div>

            <div className={global.grid}>
                <Link href="/mileage" className={global.card}>
                    <h2>Mileage</h2>
                    <p>Track your mileage</p>
                </Link>
                <Link href="/timesheets" className={global.card}>
                    <h2>Time Tracking</h2>
                    <p>Log your time & build timesheets.</p>
                </Link>
                <Link href="/timesheets/shared" className={global.card}>
                    <h2>Shared Timesheets</h2>
                    <p>View timesheets shared with you & manage timesheets you have shared.</p>
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