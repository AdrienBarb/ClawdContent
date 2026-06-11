import { Heading, Text, Section } from "@react-email/components";
import { EmailLayout, EmailButton } from "./components/EmailLayout";

interface PostFailedEmailProps {
  firstName: string;
  platform: string;
  username: string;
  contentPreview: string | null;
  dashboardUrl: string;
}

export const PostFailedEmail = ({
  firstName,
  platform,
  username,
  contentPreview,
  dashboardUrl,
}: PostFailedEmailProps) => (
  <EmailLayout preview={`A post to @${username} needs your attention`}>
    <Heading className="m-0 mb-2 text-[22px] font-bold tracking-tight text-[#2d2a25]">
      A post needs your attention
    </Heading>
    <Text className="m-0 mb-3 text-[14px] leading-relaxed text-gray-600">
      Hi {firstName} — a scheduled post to your {platform} account{" "}
      <strong>@{username}</strong> failed to publish, and the automatic retry
      didn&apos;t go through either.
    </Text>
    {contentPreview ? (
      <Text className="m-0 mb-5 rounded-lg bg-gray-50 p-3 text-[13px] leading-relaxed text-gray-700">
        &ldquo;{contentPreview}&rdquo;
      </Text>
    ) : null}
    <Section className="text-center">
      <EmailButton href={dashboardUrl}>Review the post</EmailButton>
    </Section>
  </EmailLayout>
);

export default PostFailedEmail;
