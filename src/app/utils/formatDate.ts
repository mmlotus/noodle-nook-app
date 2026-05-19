export function formatDate(dateString: string): string {
    if (!dateString) return "";

    const [y, m, d] = dateString.split("T")[0].split("-");
    return `${m}/${d}/${y}`;
}

export function getTodayDateString(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}