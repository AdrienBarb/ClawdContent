import { Composition } from "remotion";
import { PostClawDemo } from "./PostClawDemo";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="PostClawDemo"
      component={PostClawDemo}
      durationInFrames={560}
      fps={30}
      width={1920}
      height={1080}
    />
  );
};
