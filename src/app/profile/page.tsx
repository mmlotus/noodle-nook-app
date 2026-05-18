"use client";

import { useState, useEffect } from "react";
import global from "@/styles/Global.module.css";
import LoadingSpinner from "@/components/LoadingSpinner";
import Banner from "@/components/Images/banner";
import { toast } from "react-hot-toast";
import ToolTips from "@/components/ToolTips/ToolTips";
import { useToolTips } from "@/components/ToolTips/ToolTipProvider";
import { useCurrentUser } from "@/lib/useCurrentUser";
import Link from "next/link";

export default function ProfileMain() {
    const { user, isAuthenticated, isLoading, update } = useCurrentUser();
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);

    const [name, setName] = useState("");
    const [subtitleChoice, setSubtitleChoice] = useState("");
    const email = user.email || "";
    const [themePref, setThemePref] = useState("system");

    const [origName, setOrigName] = useState("");
    const [origSubtitleChoice, setOrigSubtitleChoice] = useState("");
    const [origThemePref, setOrigThemePref] = useState("system");

    const { tooltipsEnabled, setTooltipsEnabled } = useToolTips();

    // Load user profile from backend
    useEffect(() => {
        async function fetchProfile() {
            try {
                const res = await fetch("/api/profiles/user-profile");
                if (!res.ok) throw new Error("Failed to fetch profile");
                const data = await res.json();
                setName(data.name);
                setSubtitleChoice(data.subtitle_choice || "");
                setThemePref(data.theme_preference || "system");

                setOrigName(data.name);
                setOrigSubtitleChoice(data.subtitle_choice || "");
                setOrigThemePref(data.theme_preference || "system");
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }

        if (isAuthenticated) fetchProfile();
    }, [isAuthenticated]);

    if (isLoading) return <LoadingSpinner />;
    if (!isAuthenticated) return <p>You are not logged in.</p>;

    const handleSave = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/profiles/user-profile", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name,
                    subtitle_choice: subtitleChoice,
                    theme_preference: themePref,
                }),
            });

            if (!res.ok) throw new Error("Failed to save profile");

            window.dispatchEvent(new Event("theme-preference-updated"));

            await update();
            setIsEditing(false);
            toast.success("Changes saved!");
        } catch (err) {
            console.error(err);
            toast.error("Error saving changes");
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        setName(origName);
        setSubtitleChoice(origSubtitleChoice);
        setThemePref(origThemePref);
        setIsEditing(false);
    };

    const firstName = name.trim().split(" ")[0] || "";
    
    return (
        <div className={global.landing}>
            <Banner
                type="default"
                title={"Your profile"}
                subtitle={subtitleChoice ? `${subtitleChoice}` : `What would you like to do today, ${firstName}?`}
            />

            <ToolTips pageId="profile" />

            <div className={global.wideContainer}>
                {!isEditing ? (
                    <div className={global.viewMode}>
                        <p className={global.labelLine}><strong>Name:</strong> {name}</p>
                        <p className={global.labelLine}><strong>Email:</strong> {email}</p>
                        <p className={global.labelLine}><strong>Custom Subtitle:</strong> {subtitleChoice || "(optional)"}</p>
                        <p className={global.labelLine}><strong>Password:</strong> ************</p>
                        <button className={global.button} onClick={() => setIsEditing(true)}>Edit</button>
                    </div>
                ) : (
                    <>
                        <div className={global.inputGroup}>
                            <label className={global.label}>Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className={global.input}
                            />
                        </div>

                        <div className={global.inputGroup}>
                            <label className={global.label}>Custom Subtitle</label>
                            <input
                                type="text"
                                value={subtitleChoice}
                                onChange={(e) => setSubtitleChoice(e.target.value)}
                                placeholder="(optional)"
                                className={global.input}
                            />
                        </div>

                        <div className={global.inputGroup}>
                            <label className={global.label}>Change Password</label>
                            <Link
                                href="/change-password"
                                className={global.link}
                            >
                                Change my password
                            </Link>
                        </div>

                        <div style={{ marginTop: "1rem" }}>
                            <button className={global.button} onClick={handleSave} disabled={loading}>{loading ? "Saving..." : "Save"}</button>
                            <button className={global.button} onClick={handleCancel} style={{ marginLeft: "0.5rem" }}>Cancel</button>
                        </div>
                    </>
                )}

                <div className={global.separator} />

                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "1rem",
                        alignItems: "flex-start",
                    }}
                >
                    <div className={global.inputGroup}>
                        <label className={global.label}>Show Tooltips?</label>
                        <input
                            type="checkbox"
                            checked={tooltipsEnabled}
                            onChange={async (e) => {
                                const checked = e.target.checked;
                                setTooltipsEnabled(checked);

                                try {
                                    const res = await fetch("/api/user-tooltips", {
                                        method: "PATCH",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({ tooltipsEnabled: checked }),
                                    });

                                    if (!res.ok) throw new Error("Failed to update tooltips");
                                } catch (err) {
                                    console.error("Error updating tooltipsEnabled", err);
                                }
                            }}
                        />
                    </div>

                    <div className={global.inputGroup}>
                        <label className={global.label}>Theme</label>
                        <select
                            className={global.input}
                            style={{ cursor: "default" }}
                            value={themePref}
                            onChange={(e) => setThemePref(e.target.value)}
                            disabled={!isEditing}
                        >
                            <option value="system">Use Device Settings</option>
                            <option value="light">Light</option>
                            <option value="dark">Dark</option>
                        </select>
                    </div>
                    <p className={global.smallText}>To change your theme preferences, edit your profile!</p>
                </div>
            </div>
        </div>
    )
}
