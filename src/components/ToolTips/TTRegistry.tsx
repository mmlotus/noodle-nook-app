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
            message2: "Email megan@boisevape.com!"
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
    log: [
        { 
            id: "cards",
            title: "Don't see your card under Account? 💳",
            message1: "Make sure you check out Manage Cards first!",
            message2: "",
        },
    ],
    view: [
        {
            id: "build",
            title: "Ready to build your log? 🏗️",
            message1: "Use the checkboxes on expenses to gather your expenses, & you'll see a Build Log button appear near the All Expenses tab!",
            message2: "",
        },
    ],
    viewMileage: [
        {
            id: "build-mile",
            title: "Ready to build your log? 🏗️",
            message1: "Use the checkboxes on mileage entries to gather what you need, & you'll see a Build Log button appear near the ALL Entries tab!",
            message2: "",
        },
    ],
    logMileage: [
        {
            id: "log-type",
            title: "Wondering how to log mileage? ✍️",
            message1: "There are two ways to log mileage: odometer reading or total mileage.",
            message2: "You can choose whichever works best for you! Odometer reading will do the math for you.",
        },
    ],
};