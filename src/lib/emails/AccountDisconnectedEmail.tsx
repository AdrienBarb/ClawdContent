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

interface AccountDisconnectedEmailProps {
  platform: string;
  username: string;
  reconnectUrl: string;
}

export const AccountDisconnectedEmail = ({
  platform,
  username,
  reconnectUrl,
}: AccountDisconnectedEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>
        Your {platform} account @{username} needs to be reconnected
      </Preview>
      <Tailwind>
        <Body className="bg-white font-sans">
          <Container className="mx-auto py-8 px-4">
            <Heading className="text-2xl font-bold mb-4">
              Account disconnected
            </Heading>
            <Text className="text-gray-700 mb-4">
              Your <strong>{platform}</strong> account{" "}
              <strong>@{username}</strong> has been disconnected due to an
              expired or revoked token.
            </Text>
            <Text className="text-gray-700 mb-4">
              PostClaw can no longer publish to this account until you reconnect
              it.
            </Text>
            <Section className="text-center my-8">
              <Link
                href={reconnectUrl}
                className="bg-black text-white px-6 py-3 rounded-md inline-block text-center no-underline"
              >
                Reconnect Account
              </Link>
            </Section>
            <Text className="text-gray-500 text-sm">
              This usually happens when a platform revokes access (e.g. password
              change, app permissions reset). Reconnecting only takes a few
              seconds.
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default AccountDisconnectedEmail;
