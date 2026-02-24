import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import { Tailwind } from "@react-email/tailwind";

interface MagicLinkEmailProps {
  magicLink: string;
}

export const MagicLinkEmail = ({ magicLink }: MagicLinkEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Sign in to your account</Preview>
      <Tailwind>
        <Body className="bg-white font-sans">
          <Container className="mx-auto py-8 px-4">
            <Heading className="text-2xl font-bold mb-4">
              Sign in to your account
            </Heading>
            <Text className="text-gray-700 mb-4">
              Click the button below to sign in to your account. This link will
              expire in 1 hour.
            </Text>
            <Section className="text-center my-8">
              <Link
                href={magicLink}
                className="bg-black text-white px-6 py-3 rounded-md inline-block text-center no-underline"
              >
                Sign In
              </Link>
            </Section>
            <Text className="text-gray-500 text-sm">
              If you didn&apos;t request this email, you can safely ignore it.
            </Text>
            <Text className="text-gray-500 text-sm mt-4">
              Or copy and paste this URL into your browser: {magicLink}
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default MagicLinkEmail;
