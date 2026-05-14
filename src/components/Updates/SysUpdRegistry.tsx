export interface SystemUpdate {
    id: string;
    title: string;
    body: string;
    date: string;
    critical?: boolean;
};

export const systemUpdates: SystemUpdate[] = [
    {
        id: "2026-05-12-003",
        title: "My Mileage has made it to My Expenses! 🚗",
        body: `My Mileage is here! Feel free to track as you go - Mileage entries will stay put just like expenses until you are ready to
        submit them in a mileage log. Like expenses, any submitted mileage entries will be locked and no longer able to be edited; this is a
        safety and efficiency measure to ensure that documentation remains trustworthy over time.
        
        If you have any trouble with logging your mileage, please reach out! There is always room to improve, even if it is a simple formatting issue.`,
        date: "2026-05-12",
    },
    {
        id: "2026-05-12-002",
        title: "Now available as a 'mobile app' 📲",
        body: `My Expenses has been updated to become what is called a PWA! A PWA will function on your mobile device as if it were a true mobile app,
        but it will not show up as an app in the Google Play Store or Apple Store. To install, visit expenses.boisevape.com on your Chrome/Safari app;
        you will either be prompted to install/add to home screen, or you can click the menu on the browser to find 'Add to Home Screen'.
        
        This change should help to make My Expenses more user-friendly and accessible!`,
        date: "2026-05-12",
    },
    {
        id: "2026-05-12-001",
        title: "Custom Theme Experience is LIVE! 📢",
        body: `You are now able to customize your theme under your profile page. Choose between 'Light', 'Dark', or 'Default System Settings'. Once you
        have assigned a theme preference to your profile, it should override any system settings for both desktop and mobile experiences.
        
        Be sure to press 'Edit' on your profile before attempting to change the theme preference setting.`,
        date: "2026-05-12",
    },
];