import { Heading, Text, Section } from "@react-email/components";
import { EmailLayout, EmailButton } from "./components/EmailLayout";

interface BatchFailedEmailProps {
  firstName: string;
  dashboardUrl: string;
}

export const BatchFailedEmail = ({
  firstName,
  dashboardUrl,
}: BatchFailedEmailProps) => (
  <EmailLayout preview="We hit a snag preparing your week">
    <Heading className="m-0 mb-2 text-[22px] font-bold tracking-tight text-[#2d2a25]">
      We hit a snag preparing your week
    </Heading>
    <Text className="m-0 mb-5 text-[14px] leading-relaxed text-gray-600">
      Hi {firstName} — this week&apos;s posts couldn&apos;t be prepared
      automatically. We&apos;ll keep retrying, and you can always plan posts
      yourself from the dashboard in the meantime.
    </Text>
    <Section className="text-center">
      <EmailButton href={dashboardUrl}>Open PostClaw</EmailButton>
    </Section>
  </EmailLayout>
);

export default BatchFailedEmail;
