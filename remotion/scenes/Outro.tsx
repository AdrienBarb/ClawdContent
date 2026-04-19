import {
  AbsoluteFill,
  Img,
  staticFile,
  useCurrentFrame,
  interpolate,
  Easing,
} from "remotion";
import { INTER, INSTRUMENT_SERIF } from "../fonts";

const EASE_OUT = Easing.bezier(0.16, 1, 0.3, 1);
const POP = Easing.bezier(0.34, 1.56, 0.64, 1);

// Starts after chat fades (frame 470)
const START = 465;

export const Outro: React.FC = () => {
  const frame = useCurrentFrame();

  if (frame < START) return null;

  const enterOpacity = interpolate(frame, [START, START + 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE_OUT,
  });

  const logoEnter = interpolate(frame, [START + 2, START + 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: POP,
  });
  const glowOpacity = interpolate(
    frame,
    [START + 25, START + 45, START + 60, START + 85],
    [0, 0.5, 0.3, 0.45],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const nameEnter = interpolate(frame, [START + 12, START + 26], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE_OUT,
  });

  const taglineEnter = interpolate(frame, [START + 22, START + 36], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE_OUT,
  });

  const urlEnter = interpolate(frame, [START + 32, START + 46], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE_OUT,
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        gap: 20,
        opacity: enterOpacity,
      }}
    >
      <div
        style={{
          transform: `scale(${logoEnter})`,
          opacity: logoEnter,
          filter: `drop-shadow(0 0 ${20 + glowOpacity * 30}px rgba(255, 94, 72, ${glowOpacity}))`,
        }}
      >
        <Img
          src={staticFile("logo.png")}
          style={{ width: 100, height: 100, borderRadius: 24 }}
        />
      </div>

      <div
        style={{
          fontSize: 60,
          fontFamily: INSTRUMENT_SERIF,
          color: "#0f1437",
          fontWeight: 400,
          opacity: nameEnter,
          transform: `translateY(${interpolate(nameEnter, [0, 1], [18, 0])}px)`,
          letterSpacing: "-0.02em",
        }}
      >
        PostClaw
      </div>

      <div
        style={{
          fontSize: 26,
          fontFamily: INSTRUMENT_SERIF,
          fontStyle: "italic",
          color: "rgba(15, 20, 55, 0.55)",
          opacity: taglineEnter,
          transform: `translateY(${interpolate(taglineEnter, [0, 1], [14, 0])}px)`,
        }}
      >
        Your AI Social Media Manager
      </div>

      <div
        style={{
          marginTop: 16,
          fontSize: 20,
          fontFamily: INTER,
          fontWeight: 500,
          color: "#FF5E48",
          opacity: urlEnter,
          transform: `translateY(${interpolate(urlEnter, [0, 1], [10, 0])}px)`,
          letterSpacing: "0.02em",
        }}
      >
        postclaw.io
      </div>
    </AbsoluteFill>
  );
};
