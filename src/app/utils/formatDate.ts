export function formatDate(dateString: string): string {
    if (!dateString) return "";

    const [y, m, d] = dateString.split("T")[0].split("-");
    return `${m}/${d}/${y}`;
}