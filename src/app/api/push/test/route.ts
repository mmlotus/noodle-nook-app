import { jsonOk, serverError } from "@/lib/api/apiUtils";
import { withUser } from "@/lib/api/withUser";
import { sendPushToUser } from "@/lib/push/sendPushNotification";

export const POST = withUser(async (_req, _context, user) => {
    try {
        await sendPushToUser(user.id, {
            title: "NoodleNook Test Notification",
            body: "Your NoodleNook push notifications are working!",
            url: "/profile",
        });

        return jsonOk({ success: true });
    } catch (err) {
        return serverError("POST /api/push/test", err);
    }
});