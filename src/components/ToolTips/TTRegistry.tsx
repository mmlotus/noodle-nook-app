type TooltipEntry = {
    id: string;
    title: string;
    message1: string;
    message2: string;
};

type TooltipRegistry = {
    [pageId: string]: TooltipEntry[];
};

export const tooltipRegistry: TooltipRegistry = {
    home: [
        {
            id: "welcome",
            title: "Welcome! 👋",
            message1: "ToolTips will serve as your onboarding assistant.",
            message2: "Once all ToolTips have been dismissed, you shouldn't see them again, unless you re-enable them in your profile!",
        },
        {
            id: "suggestion",
            title: "Have a suggestion? 🗣️",
            message1: "Want to see more on here? Is there a new tooltip type that could help others?",
            message2: "Email mmccoyinfo@gmail.com!"
        },
    ],
    profile: [
        {
            id: "onboarding",
            title: "Need your ToolTips back? 🔔",
            message1: "Come back anytime and check the box to Show ToolTips!",
            message2: "",
        },
    ],
};