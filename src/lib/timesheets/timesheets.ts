import { cleanString } from "@/lib/api/apiUtils";
import db from "@/lib/db";
import {
    TimeEntryCreatePayload,
    TimeEntryUpdatePayload,
    TimesheetCreatePayload,
    TimesheetPermission,
    TimesheetStatus,
    TimesheetUpdatePayload,
} from "@/types/timesheets";

export type TimesheetAccess = {
    isOwner: boolean;
    isShared: boolean;
    canView: boolean;
    canEdit: boolean;
    canShare: boolean;
};

function cleanHourlyRate(value: unknown) {
    if (value === null || value === undefined || value === "") return null;

    const numericValue = Number(value);

    if (!Number.isFinite(numericValue) || numericValue < 0) {
        throw new Error("Hourly rate must be a valid number.");
    }

    return numericValue;
}

export function validateTimesheetCreatePayload(body: TimesheetCreatePayload) {
    if (!body.period_start || typeof body.period_start !== "string") {
        throw new Error("Start date is required.");
    }

    if (!body.period_end || typeof body.period_end !== "string") {
        throw new Error("End date is required.");
    }

    if (body.period_end < body.period_start) {
        throw new Error("End date cannot be before start date.");
    }

    const isPayable = Boolean(body.is_payable);
    const hourlyRate = cleanHourlyRate(body.hourly_rate);

    if (isPayable && hourlyRate === null) {
        throw new Error("Hourly rate is required for payable timesheets.");
    }

    return {
        periodStart: body.period_start,
        periodEnd: body.period_end,
        notes: cleanString(body.notes),
        isPayable,
        hourlyRate,
    };
}

export function validateTimesheetUpdatePayload(body: TimesheetUpdatePayload) {
    const allowedStatuses: TimesheetStatus[] = ["open", "finalized"];

    if (body.period_start && typeof body.period_start !== "string") {
        throw new Error("Invalid start date.");
    }

    if (body.period_end && typeof body.period_end !== "string") {
        throw new Error("Invalid end date.");
    }

    if (
        body.period_start &&
        body.period_end &&
        body.period_end < body.period_start
    ) {
        throw new Error("End date cannot be before start date.");
    }

    if (body.status && !allowedStatuses.includes(body.status)) {
        throw new Error("Invalid timesheet status.");
    }

    const hasIsPayable = Object.prototype.hasOwnProperty.call(body, "is_payable");
    const hasHourlyRate = Object.prototype.hasOwnProperty.call(body, "hourly_rate");
    const hasIsPaid = Object.prototype.hasOwnProperty.call(body, "is_paid");

    return {
        periodStart: body.period_start,
        periodEnd: body.period_end,
        status: body.status,
        notes: Object.prototype.hasOwnProperty.call(body, "notes")
            ? cleanString(body.notes)
            : undefined,
        isPayable: hasIsPayable ? Boolean(body.is_payable) : undefined,
        hourlyRate: hasHourlyRate ? cleanHourlyRate(body.hourly_rate) : undefined,
        isPaid: hasIsPaid ? Boolean(body.is_paid) : undefined,
        hasIsPayable,
        hasHourlyRate,
        hasIsPaid,
    };
}

export function validateTimeEntryCreatePayload(body: TimeEntryCreatePayload) {
    if (!body.work_date || typeof body.work_date !== "string") {
        throw new Error("Work date is required.");
    }

    if (!body.start_time || typeof body.start_time !== "string") {
        throw new Error("Clock-in time is required.");
    }

    if (!body.end_time || typeof body.end_time !== "string") {
        throw new Error("Clock-out time is required.");
    }

    if (body.end_time <= body.start_time) {
        throw new Error("Clock-out time must be after clock-in time.");
    }

    if (
        !body.duration_minutes ||
        typeof body.duration_minutes !== "number" ||
        body.duration_minutes <= 0
    ) {
        throw new Error("Duration must be greater than zero.");
    }

    const category = cleanString(body.category);

    if (!category) {
        throw new Error("Category is required.");
    }

    return {
        workDate: body.work_date,
        startTime: body.start_time,
        endTime: body.end_time,
        durationMinutes: body.duration_minutes,
        category,
        description: cleanString(body.description),
    };
}

export function validateTimeEntryUpdatePayload(body: TimeEntryUpdatePayload) {
    if (
        body.duration_minutes !== undefined &&
        (
            typeof body.duration_minutes !== "number" ||
            body.duration_minutes <= 0
        )
    ) {
        throw new Error("Duration must be greater than zero.");
    }

    if (
        body.category !== undefined &&
        (!body.category || typeof body.category !== "string")
    ) {
        throw new Error("Category is required.");
    }

    if (body.start_time && body.end_time && body.end_time <= body.start_time) {
        throw new Error("Clock-out time must be after clock-in time.");
    }

    const category = body.category === undefined
        ? undefined
        : cleanString(body.category);

    if (body.category !== undefined && !category) {
        throw new Error("Category is required.");
    }

    return {
        workDate: body.work_date,
        startTime: body.start_time,
        endTime: body.end_time,
        durationMinutes: body.duration_minutes,
        category,
        description: body.description === undefined
            ? undefined
            : cleanString(body.description),
    };
}

export function validateTimesheetPermission(permission?: string): TimesheetPermission {
    if (!permission) {
        return "view";
    }

    if (
        permission !== "view" &&
        permission !== "comment" &&
        permission !== "approve"
    ) {
        throw new Error("Invalid timesheet permission.");
    }

    return permission;
}

export async function getTimesheetAccess(
    timesheetId: string,
    userId: string
): Promise<TimesheetAccess> {
    const result = await db.query(
        `
            SELECT
                t.user_id = $2 AS is_owner,
                EXISTS (
                    SELECT 1
                    FROM timesheet_shares ts
                    WHERE ts.timesheet_id = t.id
                        AND ts.shared_with_user_id = $2
                ) AS is_shared
            FROM timesheets t
            WHERE t.id = $1
        `,
        [timesheetId, userId]
    );

    if (result.length === 0) {
        return {
            isOwner: false,
            isShared: false,
            canView: false,
            canEdit: false,
            canShare: false,
        };
    }

    const isOwner = Boolean(result[0].is_owner);
    const isShared = Boolean(result[0].is_shared);

    return {
        isOwner,
        isShared,
        canView: isOwner || isShared,
        canEdit: isOwner,
        canShare: isOwner,
    };
}