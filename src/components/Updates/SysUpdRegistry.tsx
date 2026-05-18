export interface SystemUpdate {
    id: string;
    title: string;
    body: string;
    date: string;
    critical?: boolean;
};

export const systemUpdates: SystemUpdate[] = [
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