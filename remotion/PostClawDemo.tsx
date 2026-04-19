import { AbsoluteFill } from "remotion";
import { ChatFlow } from "./scenes/ChatFlow";
import { Outro } from "./scenes/Outro";

export const PostClawDemo: React.FC = () => {
  const bgGradient = [
    "radial-gradient(ellipse 70% 60% at 15% 10%, rgba(224, 220, 255, 0.35) 0%, transparent 60%)",
    "radial-gradient(ellipse 60% 50% at 80% 70%, rgba(255, 232, 224, 0.25) 0%, transparent 55%)",
    "radial-gradient(ellipse 50% 40% at 50% 0%, rgba(224, 220, 255, 0.15) 0%, transparent 50%)",
    "#ededf5",
  ].join(", ");

  return (
    <AbsoluteFill style={{ background: bgGradient }}>
      <ChatFlow />
      <Outro />
    </AbsoluteFill>
  );
};
