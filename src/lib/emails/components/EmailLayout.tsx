import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Link,
  Preview,
  Text,
} from "@react-email/components";
import { Tailwind } from "@react-email/tailwind";

interface EmailLayoutProps {
  preview: string;
  children: React.ReactNode;
}

// Shared shell for every PostClaw transactional email: white card on warm
// off-white, PostClaw wordmark header, muted footer. Coral is reserved for
// the one primary button inside `children` (use EmailButton).
export const EmailLayout = ({ preview, children }: EmailLayoutProps) => {
  return (
    <Html lang="en">
      <Head />
      <Preview>{preview}</Preview>
      <Tailwind>
        <Body className="bg-[#faf9f5] font-sans py-6">
          <Container className="mx-auto max-w-[560px] rounded-2xl bg-white px-8 py-8">
            <Text className="m-0 mb-6 text-[18px] font-bold tracking-tight text-[#2d2a25]">
              PostClaw
            </Text>
            {children}
            <Hr className="my-6 border-gray-200" />
            <Text className="m-0 text-[12px] text-gray-400">
              PostClaw — your Instagram, on autopilot.
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

interface EmailButtonProps {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary";
}

export const EmailButton = ({
  href,
  children,
  variant = "primary",
}: EmailButtonProps) => {
  const className =
    variant === "primary"
      ? "bg-[#ec6f5b] text-white px-5 py-3 rounded-lg inline-block text-[14px] font-semibold no-underline"
      : "bg-white text-gray-700 border border-solid border-gray-300 px-4 py-2 rounded-lg inline-block text-[13px] font-medium no-underline";
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
};

export default EmailLayout;
