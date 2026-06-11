import { Heading, Hr, Img, Section, Text } from "@react-email/components";
import { EmailLayout, EmailButton } from "./components/EmailLayout";

export interface DigestPostItem {
  platform: string;
  username: string;
  scheduledAtLabel: string;
  contentPreview: string;
  mediaUrl: string | null;
  mediaType: "image" | "video" | null;
  status: string;
  vetoUrl: string | null;
  regenerateUrl: string | null;
  editUrl: string;
}

interface WeeklyDigestEmailProps {
  firstName: string;
  postCount: number;
  firstPostLabel: string | null;
  mode: "full_auto" | "review";
  posts: DigestPostItem[];
  /** Review mode only: one-click "Launch my week" commit link. */
  launchUrl: string | null;
  dashboardUrl: string;
}

function platformLabel(platform: string): string {
  if (platform === "instagram") return "Instagram";
  if (platform === "facebook") return "Facebook";
  return platform;
}

export const WeeklyDigestEmail = ({
  firstName,
  postCount,
  firstPostLabel,
  mode,
  posts,
  launchUrl,
  dashboardUrl,
}: WeeklyDigestEmailProps) => {
  const isReview = mode === "review";
  const previewText = isReview
    ? `Your week is planned — ${postCount} posts waiting for your go`
    : `Your week is ready — ${postCount} posts${firstPostLabel ? `, first goes live ${firstPostLabel}` : ""}`;

  return (
    <EmailLayout preview={previewText}>
      <Heading className="m-0 mb-2 text-[22px] font-bold tracking-tight text-[#2d2a25]">
        {isReview ? "Your week is planned" : "Your week is ready"}
      </Heading>
      <Text className="m-0 mb-5 text-[14px] leading-relaxed text-gray-600">
        Hi {firstName} — {postCount} post{postCount === 1 ? "" : "s"}{" "}
        {isReview
          ? "are planned for next week. Nothing publishes until you launch it."
          : `are scheduled for next week${firstPostLabel ? `. The first goes live ${firstPostLabel}` : ""}.`}
      </Text>

      {isReview && launchUrl ? (
        <Section className="mb-6 text-center">
          <EmailButton href={launchUrl}>Launch my week</EmailButton>
        </Section>
      ) : null}

      {posts.map((post, i) => (
        <Section
          key={i}
          className="mb-4 rounded-2xl border border-solid border-gray-200 p-4"
        >
          <Text className="m-0 mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400">
            {platformLabel(post.platform)} · @{post.username} ·{" "}
            {post.scheduledAtLabel}
            {post.status === "needs_media" ? " · needs attention" : ""}
          </Text>
          {post.mediaUrl && post.mediaType === "image" ? (
            <Img
              src={post.mediaUrl}
              alt=""
              width="240"
              className="mb-2 rounded-lg"
            />
          ) : null}
          <Text className="m-0 mb-3 text-[13px] leading-relaxed text-gray-800">
            {post.contentPreview}
          </Text>
          <Text className="m-0">
            <EmailButton href={post.editUrl} variant="secondary">
              Edit
            </EmailButton>{" "}
            {post.regenerateUrl ? (
              <EmailButton href={post.regenerateUrl} variant="secondary">
                Regenerate
              </EmailButton>
            ) : null}{" "}
            {post.vetoUrl ? (
              <EmailButton href={post.vetoUrl} variant="secondary">
                Veto
              </EmailButton>
            ) : null}
          </Text>
        </Section>
      ))}

      <Hr className="my-5 border-gray-200" />
      <Section className="text-center">
        <EmailButton href={dashboardUrl} variant={isReview ? "secondary" : "primary"}>
          See my week
        </EmailButton>
      </Section>
    </EmailLayout>
  );
};

export default WeeklyDigestEmail;
