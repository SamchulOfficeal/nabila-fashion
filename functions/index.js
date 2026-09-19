/**
 * NABILA FASHION — background push fan-out.
 *
 * Whenever a document is written to /notifications, this function sends an
 * FCM push to the right devices:
 *   - row WITH userId    → pushes to that customer's devices (their own update)
 *   - row WITHOUT userId → pushes ONLY to staff devices
 *     (users/{uid}.role in ['admin','manager']) — customers NEVER receive
 *     admin/staff notifications.
 *
 * Deploy once (requires the Blaze plan for Cloud Functions):
 *   cd functions && npm install
 *   npx firebase-tools deploy --only functions
 *
 * No extra config needed: the Admin SDK inherits the project's default
 * credentials, and web push uses the VAPID key registered in Firebase
 * Console → Project settings → Cloud Messaging.
 */
const admin = require("firebase-admin");
const functions = require("firebase-functions");

admin.initializeApp();

const REGION = "asia-south1";

exports.onNotificationCreated = functions
  .region(REGION)
  .firestore.document("notifications/{id}")
  .onCreate(async (snapshot, context) => {
    const row = snapshot.data() || {};
    const title = row.title || "NABILA FASHION";
    const body = row.message || "You have a new update.";
    const orderId = row.orderId || "";
    const url = orderId ? `/orders?order=${orderId}` : "/orders";

    // Decide the audience from the row shape (mirrors firestore.rules):
    const isCustomerRow = typeof row.userId === "string" && row.userId.length > 0;
    let tokens = [];

    try {
      if (isCustomerRow) {
        const snap = await admin
          .firestore()
          .collection("fcmTokens")
          .where("userId", "==", row.userId)
          .get();
        tokens = snap.docs.map((doc) => doc.data().token).filter(Boolean);
      } else {
        // Staff row: push to admin/manager devices only.
        const staffSnap = await admin
          .firestore()
          .collection("users")
          .where("role", "in", ["admin", "manager"])
          .get();
        const staffIds = staffSnap.docs.map((doc) => doc.id);

        // `in` supports max 10 values per query; staff lists are tiny but stay safe.
        const chunks = [];
        for (let i = 0; i < staffIds.length; i += 10) {
          chunks.push(staffIds.slice(i, i + 10));
        }
        const snaps = await Promise.all(
          chunks.map((ids) =>
            admin.firestore().collection("fcmTokens").where("userId", "in", ids).get(),
          ),
        );
        tokens = snaps.flatMap((snap) => snap.docs.map((doc) => doc.data().token)).filter(Boolean);
      }

      if (!tokens.length) return null;

      // FCM allows max 500 tokens per send; chunk defensively.
      for (let i = 0; i < tokens.length; i += 100) {
        const batch = tokens.slice(i, i + 100);
        const res = await admin.messaging().sendEachForMulticast({
          tokens: batch,
          data: {
            title,
            body,
            url,
            tag: `order-${orderId || context.params.id}`,
            icon: "/auravelle-mark.svg",
          },
          webpush: {
            // No `notification` block on purpose — a `data`-only message lets
            // our service worker render the notification (onBackgroundMessage).
            headers: { Urgency: "high" },
          },
        });

        // Clean up dead tokens so the fan-out list stays healthy.
        const dead = res.responses
          .map((r, idx) => (!r.success && r.error && isUnregistered(r.error) ? batch[idx] : null))
          .filter(Boolean);
        await Promise.all(dead.map((token) => deleteToken(token)));
      }
      return null;
    } catch (error) {
      console.error("[push] fan-out failed", error);
      return null;
    }
  });

function isUnregistered(error) {
  return (
    error.code === "messaging/registration-token-not-registered" ||
    error.code === "messaging/invalid-registration-token"
  );
}

async function deleteToken(token) {
  const snap = await admin
    .firestore()
    .collection("fcmTokens")
    .where("token", "==", token)
    .limit(1)
    .get();
  await Promise.all(snap.docs.map((doc) => doc.ref.delete().catch(() => null)));
}
