import {
  AbsoluteFill,
  Img,
  staticFile,
  useCurrentFrame,
  interpolate,
  Easing,
} from "remotion";
import { INTER } from "../fonts";

const SELECTED_CHIP = "Write a LinkedIn post about my latest project";

const AI_POST = `Here's a LinkedIn post for your latest project:

I've been working on something exciting — and today, it's finally live.

We built a tool that helps founders manage their social media with AI. No more copy-pasting across platforms.

One conversation → content everywhere.

If you're a founder wearing the marketing hat too, I'd love to hear how you handle it 👇`;

const AI_ASK = "When would you like me to post this?";
const USER_REPLY = "Today at 9pm";
const AI_CONFIRM = "Done! Your post is scheduled for today at 9:00 PM across LinkedIn and X ✓";

const EASE_OUT = Easing.bezier(0.16, 1, 0.3, 1);
const EASE_IN_OUT = Easing.bezier(0.45, 0, 0.55, 1);
const POP = Easing.bezier(0.34, 1.56, 0.64, 1);

const PRIMARY = "#FF5E48";
const GRAY_100 = "#f3f4f6";
const GRAY_200 = "#e5e7eb";
const GRAY_400 = "#9ca3af";
const GRAY_700 = "#374151";
const GRAY_800 = "#1f2937";
const GRAY_900 = "#111827";

const CHIPS = [
  "Write a LinkedIn post about my latest project",
  "Draft a short announcement for Threads",
  "Turn this idea into a Twitter thread",
];

// ── Timeline ──
const CARD_END = 30;
const CHIP_CLICK = 65;
const TEXT_INPUT = 78;
const SEND1 = 95;
const DOTS1_START = 98;
const DOTS1_END = 125;
const AI_POST_START = 125;
const AI_POST_END = 260;
const AI_ASK_START = 280;
const AI_ASK_END = 310;
const USER_REPLY_FRAME = 340;
const AI_CONFIRM_START = 370;
const AI_CONFIRM_END = 410;
const FADE_START = 440;
const FADE_END = 470;

// ── Components defined OUTSIDE to avoid re-creation each frame ──

const BotBubble: React.FC<{
  text: string;
  opacity: number;
  translateY: number;
  streaming: boolean;
  cursorFrame: number;
}> = ({ text, opacity, translateY, streaming, cursorFrame }) => (
  <div
    style={{
      display: "flex",
      alignItems: "flex-end",
      gap: 10,
      opacity,
      transform: `translateY(${translateY}px)`,
    }}
  >
    <Img
      src={staticFile("logo.png")}
      style={{
        width: 28,
        height: 28,
        borderRadius: "50%",
        flexShrink: 0,
        objectFit: "cover",
      }}
    />
    <div
      style={{
        maxWidth: "80%",
        background: GRAY_100,
        color: GRAY_900,
        padding: "12px 16px",
        borderRadius: "16px 16px 16px 6px",
        fontSize: 14,
        fontFamily: INTER,
        lineHeight: 1.65,
        whiteSpace: "pre-wrap",
      }}
    >
      {text}
      {streaming && (
        <span
          style={{
            display: "inline-block",
            width: 2,
            height: 16,
            background: PRIMARY,
            marginLeft: 2,
            opacity: cursorFrame % 10 < 6 ? 1 : 0,
            verticalAlign: "text-bottom",
            borderRadius: 1,
          }}
        />
      )}
    </div>
  </div>
);

const UserBubble: React.FC<{
  text: string;
  scale: number;
  opacity: number;
}> = ({ text, scale, opacity }) => (
  <div
    style={{
      display: "flex",
      alignItems: "flex-end",
      gap: 10,
      justifyContent: "flex-end",
    }}
  >
    <div
      style={{
        maxWidth: "80%",
        background: PRIMARY,
        color: "#ffffff",
        padding: "12px 16px",
        borderRadius: "16px 16px 6px 16px",
        fontSize: 14,
        fontFamily: INTER,
        lineHeight: 1.5,
        transform: `scale(${scale})`,
        opacity,
      }}
    >
      {text}
    </div>
  </div>
);

const TypingDots: React.FC<{ frame: number }> = ({ frame }) => (
  <div style={{ display: "flex", alignItems: "flex-end", gap: 10 }}>
    <Img
      src={staticFile("logo.png")}
      style={{
        width: 28,
        height: 28,
        borderRadius: "50%",
        flexShrink: 0,
        objectFit: "cover",
      }}
    />
    <div
      style={{
        background: GRAY_100,
        borderRadius: "16px 16px 16px 6px",
        padding: "16px 20px",
        display: "flex",
        alignItems: "center",
        gap: 6,
      }}
    >
      {[0, 1, 2].map((dot) => (
        <div
          key={dot}
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: PRIMARY,
            opacity: 0.6,
            transform: `translateY(${Math.sin(((frame * 5 + dot * 35) % 360) * (Math.PI / 180)) * 4}px)`,
          }}
        />
      ))}
    </div>
  </div>
);

// ── Main component ──

export const ChatFlow: React.FC = () => {
  const frame = useCurrentFrame();

  if (frame > FADE_END + 5) return null;

  const sceneOpacity = interpolate(frame, [FADE_START, FADE_END], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.in(Easing.cubic),
  });

  const cardEnter = interpolate(frame, [0, CARD_END], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE_OUT,
  });

  // ── Camera ──
  const zoomToChips = interpolate(frame, [45, CHIP_CLICK], [1, 1.12], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE_IN_OUT,
  });
  const zoomOutForChat = interpolate(frame, [SEND1, SEND1 + 40], [1.12, 1.0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE_IN_OUT,
  });
  const cameraScale = frame < SEND1 ? zoomToChips : zoomOutForChat;

  const panToChips = interpolate(frame, [45, CHIP_CLICK], [0, 50], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE_IN_OUT,
  });
  const panBackUp = interpolate(frame, [SEND1, SEND1 + 45], [50, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE_IN_OUT,
  });
  const driftUp = interpolate(frame, [AI_POST_START + 40, FADE_START], [0, -120], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE_IN_OUT,
  });
  const cameraY = frame < SEND1
    ? panToChips
    : frame < AI_POST_START + 40
      ? panBackUp
      : driftUp;

  // ── Chip interaction ──
  const chipClicked = frame >= CHIP_CLICK;
  const chipPress = interpolate(
    frame,
    [CHIP_CLICK, CHIP_CLICK + 4, CHIP_CLICK + 8],
    [1, 0.95, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const chipsFade = interpolate(frame, [CHIP_CLICK, CHIP_CLICK + 12], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const showInputText = frame >= TEXT_INPUT && frame < SEND1;

  const sent1 = frame >= SEND1;
  const sent1Pop = interpolate(frame, [SEND1, SEND1 + 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: POP,
  });

  // ── AI post ──
  const aiPostEnter = interpolate(frame, [AI_POST_START, AI_POST_START + 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE_OUT,
  });
  const aiPostStream = interpolate(frame, [AI_POST_START + 5, AI_POST_END], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const aiPostText = AI_POST.slice(0, Math.floor(aiPostStream * AI_POST.length));

  // ── AI ask ──
  const aiAskEnter = interpolate(frame, [AI_ASK_START, AI_ASK_START + 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE_OUT,
  });
  const aiAskStream = interpolate(frame, [AI_ASK_START + 5, AI_ASK_END], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const aiAskText = AI_ASK.slice(0, Math.floor(aiAskStream * AI_ASK.length));

  // ── User reply ──
  const userReplied = frame >= USER_REPLY_FRAME;
  const replyPop = interpolate(frame, [USER_REPLY_FRAME, USER_REPLY_FRAME + 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: POP,
  });

  // ── AI confirm ──
  const aiConfirmEnter = interpolate(frame, [AI_CONFIRM_START, AI_CONFIRM_START + 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE_OUT,
  });
  const aiConfirmStream = interpolate(frame, [AI_CONFIRM_START + 5, AI_CONFIRM_END], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const aiConfirmText = AI_CONFIRM.slice(0, Math.floor(aiConfirmStream * AI_CONFIRM.length));

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        opacity: sceneOpacity,
      }}
    >
      <div
        style={{
          transform: `scale(${cameraScale}) translateY(${cameraY}px)`,
          width: "100%",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: 768,
            height: 560,
            borderRadius: 16,
            background: "#ffffff",
            boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
            border: `1px solid ${GRAY_100}`,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            opacity: cardEnter,
            transform: `translateY(${interpolate(cardEnter, [0, 1], [50, 0])}px)`,
          }}
        >
          {/* Messages */}
          <div
            style={{
              flex: 1,
              padding: 20,
              display: "flex",
              flexDirection: "column",
              gap: 16,
              justifyContent: "flex-end",
              overflow: "hidden",
            }}
          >
            {/* Welcome + chips */}
            {!sent1 && (
              <>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 10 }}>
                  <Img
                    src={staticFile("logo.png")}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      flexShrink: 0,
                      boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                      objectFit: "cover",
                    }}
                  />
                  <div
                    style={{
                      maxWidth: "80%",
                      borderRadius: "16px 16px 16px 6px",
                      padding: "16px 20px",
                      fontSize: 14,
                      fontFamily: INTER,
                      lineHeight: 1.625,
                      color: GRAY_800,
                      background: "linear-gradient(135deg, #f8f7ff 0%, #fff5f3 100%)",
                      border: "1px solid rgba(255, 94, 72, 0.1)",
                    }}
                  >
                    You're all set on LinkedIn and X! Tell me what you'd like to
                    post — I can write, adapt, and publish to all your platforms.
                  </div>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, paddingLeft: 44 }}>
                  {CHIPS.map((s, i) => {
                    const chipEnter = interpolate(
                      frame, [10 + i * 5, 22 + i * 5], [0, 1],
                      { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE_OUT }
                    );
                    const isSelected = s === SELECTED_CHIP;
                    const otherFade = !isSelected && chipClicked ? chipsFade : 1;
                    const selectedFade = isSelected && chipClicked
                      ? interpolate(frame, [TEXT_INPUT - 3, TEXT_INPUT + 5], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
                      : 1;
                    const hoverGlow = isSelected
                      ? interpolate(frame, [55, CHIP_CLICK], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
                      : 0;
                    const scale = isSelected && chipClicked ? chipPress : 1;

                    return (
                      <div
                        key={s}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          borderRadius: 999,
                          padding: "8px 16px",
                          fontSize: 14,
                          fontFamily: INTER,
                          color: GRAY_700,
                          background: isSelected && hoverGlow > 0.5
                            ? "linear-gradient(135deg, #fff5f3 0%, #fef0ed 100%)"
                            : "linear-gradient(135deg, #ffffff 0%, #faf9ff 100%)",
                          border: isSelected && hoverGlow > 0.5
                            ? "1px solid rgba(255, 94, 72, 0.3)"
                            : "1px solid rgba(212, 214, 229, 0.6)",
                          opacity: chipEnter * otherFade * selectedFade,
                          transform: `translateY(${interpolate(chipEnter, [0, 1], [8, 0])}px) scale(${scale})`,
                          boxShadow: isSelected && hoverGlow > 0.5
                            ? "0 2px 8px rgba(255, 94, 72, 0.12)"
                            : "none",
                        }}
                      >
                        <svg width="12" height="12" viewBox="0 0 256 256" fill="none" style={{ flexShrink: 0 }}>
                          <path d="M128 24l19.4 84.6L232 128l-84.6 19.4L128 232l-19.4-84.6L24 128l84.6-19.4Z" fill={PRIMARY} opacity={0.6} />
                        </svg>
                        {s}
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {sent1 && <UserBubble text={SELECTED_CHIP} scale={sent1Pop} opacity={sent1Pop} />}

            {frame >= DOTS1_START && frame < DOTS1_END && <TypingDots frame={frame} />}

            {frame >= AI_POST_START && (
              <BotBubble
                text={aiPostText}
                opacity={aiPostEnter}
                translateY={interpolate(aiPostEnter, [0, 1], [14, 0])}
                streaming={aiPostStream < 1}
                cursorFrame={frame}
              />
            )}

            {frame >= AI_ASK_START && (
              <BotBubble
                text={aiAskText}
                opacity={aiAskEnter}
                translateY={interpolate(aiAskEnter, [0, 1], [14, 0])}
                streaming={aiAskStream < 1}
                cursorFrame={frame}
              />
            )}

            {userReplied && <UserBubble text={USER_REPLY} scale={replyPop} opacity={replyPop} />}

            {frame >= AI_CONFIRM_START && (
              <BotBubble
                text={aiConfirmText}
                opacity={aiConfirmEnter}
                translateY={interpolate(aiConfirmEnter, [0, 1], [14, 0])}
                streaming={aiConfirmStream < 1}
                cursorFrame={frame}
              />
            )}
          </div>

          {/* Input bar */}
          <div style={{ padding: "8px 16px 16px" }}>
            <div
              style={{
                borderRadius: 16,
                border: `1px solid ${showInputText ? PRIMARY : GRAY_200}`,
                background: "#ffffff",
                boxShadow: showInputText
                  ? "0 1px 4px rgba(255, 94, 72, 0.1)"
                  : "0 1px 2px rgba(0,0,0,0.05)",
              }}
            >
              <div style={{ padding: "16px 20px 8px" }}>
                <span
                  style={{
                    fontSize: 16,
                    fontFamily: INTER,
                    lineHeight: 1.625,
                    color: showInputText ? GRAY_900 : GRAY_400,
                  }}
                >
                  {showInputText ? SELECTED_CHIP : "Type your thoughts..."}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0 12px 12px",
                }}
              >
                <div style={{ width: 36, height: 36, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" stroke={GRAY_400} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    background: PRIMARY,
                    opacity: showInputText ? 1 : 0.4,
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
