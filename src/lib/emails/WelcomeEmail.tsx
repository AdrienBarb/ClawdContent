import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
  Tailwind,
} from "@react-email/components";

interface WelcomeEmailProps {
  name?: string;
}

export const WelcomeEmail = ({ name = "User" }: WelcomeEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Welcome to our platform!</Preview>
      <Tailwind>
        <Body className="bg-gray-50 font-sans">
          <Container className="mx-auto py-8 px-4">
            <Section className="bg-white rounded-lg shadow-sm p-8">
              <Heading className="text-2xl font-bold text-gray-900 mb-4">
                Welcome {name}!
              </Heading>
              <Text className="text-gray-700 text-base leading-6 mb-4">
                Thank you for signing up. We&apos;re excited to have you on board!
              </Text>
              <Text className="text-gray-600 text-sm">
                If you have any questions, feel free to reach out to our support team.
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default WelcomeEmail;

