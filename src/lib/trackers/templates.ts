import { SimpleTrackerTemplate } from "@/types/trackers";


export const simpleTrackerTemplates: Record<string, SimpleTrackerTemplate> = {
    books: {
        key: "books",
        name: "Books",
        slug: "books",
        description: "Track books you want to buy, read, finish, or revisit.",
        statuses: [
            "Want to Buy", "Own it!", "Want to Read", "Reading", "Finished!", "Did Not Finish",
        ],
        fields: [
            {
                key: "author",
                label: "Author",
                type: "text",
            },
            {
                key: "format",
                label: "Format",
                type: "select",
                options: ["Paperback/Hardback", "Kindle", "Audiobook", "Library", "Other"],
            },
            {
                key: "series",
                label: "Series",
                type: "text",
            },
            {
                key: "seriesNumber",
                label: "# in Series",
                type: "number",
            },
        ],
        tags: [
            "Fiction", "Nonfiction", "Fantasy", "Romance", "Mystery", "Thriller", "Business", "Self-Help", "Personal", "Work",
        ],
    },

    watchlist: {
        key: "watchlist",
        name: "Watchlist",
        slug: "watchlist",
        description: "Track movies & TV shows you want to watch.",
        statuses: [
            "Want to Watch", "Watching", "Seen", "Paused", "Dropped",
        ],
        fields: [
            {
                key: "type",
                label: "Type",
                type: "select",
                options: ["Film", "TV", "Other"],
            },
            {
                key: "platform",
                label: "Platform",
                type: "text",
            },
            {
                key: "releaseYear",
                label: "Release Year",
                type: "number",
            },
        ],
        tags: [
            "Comedy", "Drama", "Horror", "Action", "Documentary", "Thriller", "Comfort Watch", "Family", "Anime",
        ],
    },

    places: {
        key: "places",
        name: "Places to Visit",
        slug: "places",
        description: "Track places you want to visit or revisit.",
        statuses: [
            "Want to Go", "Planning", "Booked", "Visited", "Want to Revisit", "Not Interested",
        ],
        fields: [
            {
                key: "location",
                label: "Location",
                type: "text",
            },
            {
                key: "bestSeason",
                label: "Best Season",
                type: "select",
                options: ["Spring", "Summer", "Fall", "Winter", "Anytime"],
            },
            {
                key: "estimatedCost",
                label: "Estimated Cost",
                type: "select",
                options: ["$", "$$", "$$$", "$$$$"],
            },
        ],
        tags: [
            "Local", "Road Trip", "Vacation", "Food", "Nature", "Family", "Weekend", "Bucket List",
        ],
    },
};

export function getSimpleTrackerTemplate(templateKey: string) {
    return simpleTrackerTemplates[templateKey] || null;
}

export function getSimpleTrackerTemplates() {
    return Object.values(simpleTrackerTemplates);
}