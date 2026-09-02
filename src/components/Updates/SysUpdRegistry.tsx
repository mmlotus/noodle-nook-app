export interface SystemUpdate {
    id: string;
    title: string;
    body: string;
    date: string;
    critical?: boolean;
};

export const systemUpdates: SystemUpdate[] = [
    {
        id: "2026-09-02-001",
        title: "New Functions! 📱 New Look! 👀",
        body:
        `🎨 The homepage now has banded sections that are collapsible. Whether a section is collapsed or not is customizable
        at the user level; your preferences will save automatically.

        💰 Allocation Planner has moved from "My Work" to "My Money"!

        🤑 Paid/Unpaid stamps now let you easily see which timesheets have been paid out (when applicable) without the need
        to open each timesheet individually.

        📅 The Budget calendar has been fixed to fit mobile width. This change allows the entire calendar to be viewed without
        the need to scroll left/right or up/down!

        🚨 System Updates have been moved to the very top of the page to ensure users are kept up to date on any system changes!
        
        ✏️ Timeclock/timesheet editing will now scroll to the top of the editing section, rather than the top of the page.
        
        👁️ Visibility eye is now available for all password/confirm password fields where applicable! We hope this eases the
        tension of meeting the password criteria and matching passwords upon creation/update.`,
        date: "2026-09-02",
    },
    {
        id: "2026-05-18-002",
        title: "Available as a 'mobile app' 📲",
        body: `NoodleNook has been built to become what is called a PWA! A PWA will function on your mobile device as if it were a true mobile app,
        but it will not show up as an app in the Google Play Store or Apple Store. To install, visit the site on your Chrome/Safari app; you will
        either be prompted to install/add to home screen, or you can click the menu on the browser to find 'Add to Home Screen'.
        
        This change should help to make NoodleNook more user-friendly and accessible!`,
        date: "2026-05-18",
    },
    {
        id: "2026-05-18-001",
        title: "Custom Theme Experience is LIVE! 📢",
        body: `You are now able to customize your theme under your profile page. Choose between 'Light', 'Dark', or 'Default System Settings'. Once you
        have assigned a theme preference to your profile, it should override any system settings for both desktop and mobile experiences.
        
        Be sure to press 'Edit' on your profile before attempting to change the theme preference setting.`,
        date: "2026-05-18",
    },
];