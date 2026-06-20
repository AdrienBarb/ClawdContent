import { Heading, Text, Section } from "@react-email/components";
import { EmailLayout, EmailButton } from "./components/EmailLayout";

export type DunningStage = "initial" | "reminder" | "final";

interface PaymentFailedEmailProps {
  firstName: string;
  billingUrl: string;
  stage: DunningStage;
}

const COPY: Record<
  DunningStage,
  { preview: string; heading: string; body: string }
> = {
  initial: {
    preview: "Your last payment didn't go through",
    heading: "Your payment didn't go through",
    body:
      "we couldn't process your latest payment. Update your card and we'll take care of the rest — nothing changes in the meantime.",
  },
  reminder: {
    preview: "We still couldn't process your payment",
    heading: "Quick reminder — your payment is still failing",
    body:
      "we still haven't been able to charge your card. Update it soon to keep your account and your scheduled posts running.",
  },
  final: {
    preview: "Last reminder — your account closes tomorrow",
    heading: "Last reminder — your account closes tomorrow",
    body:
      "this is the final reminder. If we can't process your payment, your account and your scheduled posts will be removed tomorrow. Update your card now to stay active.",
  },
};

export const PaymentFailedEmail = ({
  firstName,
  billingUrl,
  stage,
}: PaymentFailedEmailProps) => {
  const { preview, heading, body } = COPY[stage];
  return (
    <EmailLayout preview={preview}>
      <Heading className="m-0 mb-2 text-[22px] font-bold tracking-tight text-[#2d2a25]">
        {heading}
      </Heading>
      <Text className="m-0 mb-5 text-[14px] leading-relaxed text-gray-600">
        Hi {firstName} — {body}
      </Text>
      <Section className="text-center">
        <EmailButton href={billingUrl}>Update payment method</EmailButton>
      </Section>
    </EmailLayout>
  );
};

export default PaymentFailedEmail;
