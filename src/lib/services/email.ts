import { brevo } from "@/lib/brevo/client";

const BREVO_LIST_ID = process.env.BREVO_LIST_ID
  ? parseInt(process.env.BREVO_LIST_ID, 10)
  : undefined;

/**
 * Create a contact in Brevo on signup.
 * Sets initial attributes and adds to the main list.
 */
export async function createBrevoContact(user: {
  email: string;
  name?: string | null;
}) {
  try {
    await brevo.contacts.createContact({
      email: user.email,
      attributes: {
        FIRSTNAME: user.name ?? "",
        SIGNUP_DATE: new Date().toISOString(),
        SUBSCRIPTION_STATUS: "none",
        PLAN_NAME: "",
      },
      listIds: BREVO_LIST_ID ? [BREVO_LIST_ID] : undefined,
      updateEnabled: true,
    });
  } catch (error) {
    console.error("Failed to create Brevo contact:", error);
  }
}

/**
 * Fire signup_completed event — triggers the onboarding automation in Brevo.
 */
export async function trackSignupCompleted(email: string) {
  try {
    await brevo.event.createEvent({
      event_name: "signup_completed",
      identifiers: { email_id: email },
      event_properties: { source: "web" },
    });
  } catch (error) {
    console.error("Failed to track signup_completed event:", error);
  }
}

/**
 * Fire subscription_started event — exits the conversion automation
 * and updates contact attributes.
 */
export async function trackSubscriptionStarted(
  email: string,
  planName: string
) {
  try {
    // Safety check: explicit attribute update so automation conditions work
    // even if the event's contact_properties don't propagate in time
    await brevo.contacts.updateContact({
      identifier: email,
      attributes: {
        SUBSCRIPTION_STATUS: "active",
        PLAN_NAME: planName,
      },
    });

    // Exit trigger: pulls the user out of the onboarding automation
    await brevo.event.createEvent({
      event_name: "subscription_started",
      identifiers: { email_id: email },
      event_properties: { plan: planName },
    });
  } catch (error) {
    console.error("Failed to track subscription_started event:", error);
  }
}

/**
 * Update contact attributes in Brevo (e.g. on cancellation or plan change).
 */
export async function updateBrevoContact(
  email: string,
  attributes: Record<string, string>
) {
  try {
    await brevo.contacts.updateContact({
      identifier: email,
      attributes,
    });
  } catch (error) {
    console.error("Failed to update Brevo contact:", error);
  }
}
