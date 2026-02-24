import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import { Tailwind } from "@react-email/tailwind";
import config from "@/lib/config";

interface WaitlistConfirmationEmailProps {
  email: string;
  position: number;
}

export const WaitlistConfirmationEmail = ({
  email,
  position,
}: WaitlistConfirmationEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>You&apos;re on the waitlist!</Preview>
      <Tailwind>
        <Body className="bg-white font-sans">
          <Container className="mx-auto py-8 px-4">
            <Heading className="text-2xl font-bold mb-4">
              You&apos;re on the waitlist!
            </Heading>
            <Text className="text-gray-700 mb-4">
              Thanks for joining the waitlist for {config.project.name}.
              We&apos;ll notify you as soon as we launch.
            </Text>
            <Section className="bg-gray-50 rounded-md p-4 my-4">
              <Text className="text-sm text-gray-600 mb-2">
                Your position: <strong>#{position}</strong>
              </Text>
              <Text className="text-sm text-gray-600">Email: {email}</Text>
            </Section>
            <Text className="text-gray-500 text-sm">
              We&apos;ll send you an email when it&apos;s your turn to access
              the platform.
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default WaitlistConfirmationEmail;
