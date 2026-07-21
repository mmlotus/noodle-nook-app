export function formatDate(dateString: string): string {
    if (!dateString) return "";

    const [y, m, d] = dateString.split("T")[0].split("-");
    return `${m}.${d}.${y}`;
}

export function getTodayDateString(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

export function getCurrentTimeString(): string {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");

    return `${hours}:${minutes}:${seconds}`;
}

export function getElapsedMinutesFromTime(
    startTime: string | null | undefined
): number {
    if (!startTime) return 0;

    const [startHours, startMinutes, startSeconds = 0] = startTime
        .split(":")
        .map(Number);

    if (
        !Number.isFinite(startHours) ||
        !Number.isFinite(startMinutes) ||
        !Number.isFinite(startSeconds)
    ) {
        return 0;
    }

    const now = new Date();

    const start = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        startHours,
        startMinutes,
        startSeconds
    );

    return Math.max(
        0,
        Math.floor((now.getTime() - start.getTime()) / 60000)
    );
}

export function getCurrentMonthValue() {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
}

export function getDateOnly(value: string | null | undefined) {
    if (!value) return "";

    return value.split("T")[0];
}

export function getTimeOnly(value: string | null | undefined) {
    if (!value) return "";

    return value.slice(0, 5);
}

export function formatHoursFromMinutes(minutes: number | string | null | undefined) {
    const numericMinutes = Number(minutes || 0);
    const hours = numericMinutes / 60;

    return `${hours.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })} hrs`;
}

export function minutesToHoursInput(minutes: number | string | null | undefined) {
    const numericMinutes = Number(minutes || 0);

    if (!numericMinutes) return "";

    return String(numericMinutes / 60);
}

export function hoursToMinutes(value: string) {
    const numericHours = Number(value);

    if (!Number.isFinite(numericHours)) return 0;

    return Math.round(numericHours * 60);
}

export function getMinutesBetweenTimes(
    startTime: string | null | undefined,
    endTime: string | null | undefined
) {
    if (!startTime || !endTime) return 0;

    const [startHours, startMinutes] = startTime.split(":").map(Number);
    const [endHours, endMinutes] = endTime.split(":").map(Number);

    if (
        !Number.isFinite(startHours) ||
        !Number.isFinite(startMinutes) ||
        !Number.isFinite(endHours) ||
        !Number.isFinite(endMinutes)
    ) {
        return 0;
    }

    const startTotal = startHours * 60 + startMinutes;
    const endTotal = endHours * 60 + endMinutes;

    if (endTotal <= startTotal) return 0;

    return endTotal - startTotal;
}