"use client";

import Banner from "@/components/Images/banner";
import ToolTips from "@/components/ToolTips/ToolTips";
import SystemUpdates from "@/components/Updates/SystemUpdates";
import { systemUpdates } from "@/components/Updates/SysUpdRegistry";
import { useCurrentUser } from "@/lib/useCurrentUser";
import global from "@/styles/Global.module.css";
import { ChevronDown, ChevronUp } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

export default function HomePage() {
    const { user } = useCurrentUser();

    const [collapsedSections, setCollapsedSections] = useState<string[]>([]);
    const [homePreferencesLoaded, setHomePreferencesLoaded] = useState(false);

    useEffect(() => {
        const loadHomePreferences = async () => {
            try {
                const res = await fetch("/api/profiles/user-profile");

                if (!res.ok) throw new Error("Failed to load homepage preferences.");

                const data = await res.json();

                setCollapsedSections(Array.isArray(data.collapsed_home_sections)
                    ? data.collapsed_home_sections
                    : []);
            } catch (err) {
                console.error(err);
            } finally {
                setHomePreferencesLoaded(true);
            }
        };

        void loadHomePreferences();
    }, []);

    const isCollapsed = (section: string) => collapsedSections.includes(section);

    const toggleSection = async (section: string) => {
        const previousSections = collapsedSections;

        const nextSections = isCollapsed(section)
            ? collapsedSections.filter((item) => item !== section)
            : [...collapsedSections, section];

        setCollapsedSections(nextSections);

        try {
            const res = await fetch("/api/profiles/homepage-pref", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ collapsed_home_sections: nextSections }),
            });

            if (!res.ok) throw new Error("Failed to save homepage preferences.");
        } catch (err) {
            console.error(err);
            toast.error("Failed to save homepage preferences. Please try again later.");
            setCollapsedSections(previousSections);
        }
    };

    const name = user.name ? user.name.split(" ")[0] : "";

    const hasUpdates = systemUpdates.length > 0;

    if (!homePreferencesLoaded) {
        return (
            <div className={global.pageWrapper}>
                <Banner
                    type="default"
                    title={!name ? "Welcome!" : `Welcome, ${name}!`}
                    subtitle="Your Dashbord"
                />
            </div>
        );
    }

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

            {/* UPDATES SECTION */}
            {
                hasUpdates && (
                    <>
                        <div className={global.fullWidthSeparator} />
                        <SystemUpdates minToShow={1} />
                        <div className={global.fullWidthSeparator} />
                    </>
                )
            }


            <div className={global.homeSections}>
                <section className={global.homeSection}>
                    <button
                        type="button"
                        className={global.homeSectionToggle}
                        onClick={() => toggleSection("myWellness")}
                        aria-expanded={!isCollapsed("myWellness")}
                    >
                        <div className={global.subcentered}>My Wellness</div>
                        <span className={global.homeSectionChevron} aria-hidden="true">
                            {isCollapsed("myWellness") ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                        </span>
                    </button>

                    {!isCollapsed("myWellness") && (
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
                    )}
                </section>

                <section className={global.homeSection}>
                    <button
                        type="button"
                        className={global.homeSectionToggle}
                        onClick={() => toggleSection("myMoney")}
                        aria-expanded={!isCollapsed("myMoney")}
                    >
                        <div className={global.subcentered}>My Money</div>
                        <span className={global.homeSectionChevron} aria-hidden="true">
                            {isCollapsed("myMoney") ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                        </span>
                    </button>

                    {!isCollapsed("myMoney") && (
                        <div className={global.grid}>
                            <Link href="/budget/recurring" className={global.card}>
                                <h2>Bills & Income</h2>
                                <p>Enter your recurring bills and income, as well as expected expenses that may be coming up.</p>
                            </Link>
                            <Link href="/budget" className={global.card}>
                                <h2>Budget</h2>
                                <p>Keep tabs on your expected income, expenses, & physical payments.</p>
                            </Link>
                            <Link href="/allocation" className={global.card}>
                                <h2>Allocation Planner</h2>
                                <p>Create reusable plans to split money between accounts & see exactly how much should move where.</p>
                            </Link>
                        </div>
                    )}
                </section>

                <section className={global.homeSection}>
                    <button
                        type="button"
                        className={global.homeSectionToggle}
                        onClick={() => toggleSection("myLists")}
                        aria-expanded={!isCollapsed("myLists")}
                    >
                        <div className={global.subcentered}>My Lists</div>
                        <span className={global.homeSectionChevron} aria-hidden="true">
                            {isCollapsed("myLists") ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                        </span>
                    </button>

                    {!isCollapsed("myLists") && (
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
                    )}
                </section>

                <section className={global.homeSection}>
                    <button
                        type="button"
                        className={global.homeSectionToggle}
                        onClick={() => toggleSection("myWork")}
                        aria-expanded={!isCollapsed("myWork")}
                    >
                        <div className={global.subcentered}>My Work</div>
                        <span className={global.homeSectionChevron} aria-hidden="true">
                            {isCollapsed("myWork") ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                        </span>
                    </button>

                    {!isCollapsed("myWork") && (
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
                    )}
                </section>

                <section className={global.homeSection}>
                    <div className={global.subcentered}>My Account</div>

                    <div className={global.grid}>
                        <Link href="/profile" className={global.card}>
                            <h2>Your Profile</h2>
                            <p>Edit your settings.</p>
                        </Link>
                    </div>
                </section>
            </div>
        </div>
    )
}