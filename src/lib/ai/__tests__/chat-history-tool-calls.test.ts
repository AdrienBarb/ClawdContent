/**
 * Tests that chat history with tool calls produces valid Anthropic API messages.
 *
 * The pipeline:
 *   DB parts → UIMessage → server filter → convertToModelMessages → Anthropic API
 *
 * The Anthropic API requires: every assistant message with tool_use blocks
 * must be immediately followed by a user message with matching tool_result blocks.
 */
import { describe, it, expect } from "vitest";
import { convertToModelMessages, UIMessage } from "ai";

// --- Helpers ---

/** Simulate what onFinish saves to the DB (JSON round-trip strips undefined) */
function simulateDbRoundTrip(parts: unknown[]): unknown[] {
  return JSON.parse(JSON.stringify(parts));
}

/** Simulate the server-side filter from route.ts */
function filterParts(parts: unknown[]): UIMessage["parts"] {
  return (parts ?? []).filter((p: any) => {
    if (p == null || typeof p !== "object" || !("type" in p)) return false;
    if (p.type === "text" || p.type === "step-start") return true;
    if (
      (p.type === "dynamic-tool" ||
        (typeof p.type === "string" && p.type.startsWith("tool-"))) &&
      "toolCallId" in p &&
      typeof p.toolCallId === "string" &&
      "toolName" in p &&
      typeof p.toolName === "string" &&
      "state" in p &&
      p.state === "output-available" &&
      "output" in p &&
      p.output !== undefined
    ) {
      return true;
    }
    return false;
  }) as UIMessage["parts"];
}

/** Build UIMessages from raw DB data, like history/route.ts does */
function buildUIMessages(
  dbMessages: { id: string; role: string; content: string; parts: unknown[] | null }[]
): UIMessage[] {
  return dbMessages.map((m) => ({
    id: m.id,
    role: m.role as "user" | "assistant",
    content: m.content,
    parts: filterParts(
      Array.isArray(m.parts) ? m.parts : [{ type: "text", text: m.content }]
    ),
  }));
}

/** Validate that every tool-call in assistant messages has a matching tool-result */
function validateToolCallPairing(
  modelMessages: Awaited<ReturnType<typeof convertToModelMessages>>
) {
  const errors: string[] = [];
  for (let i = 0; i < modelMessages.length; i++) {
    const msg = modelMessages[i];
    if (msg.role !== "assistant" || !Array.isArray(msg.content)) continue;

    const toolCallIds = msg.content
      .filter((c: any) => c.type === "tool-call")
      .map((c: any) => c.toolCallId as string);

    if (toolCallIds.length === 0) continue;

    const next = modelMessages[i + 1];
    if (!next) {
      errors.push(
        `messages[${i}]: assistant has tool-calls [${toolCallIds.join(", ")}] but no following message`
      );
      continue;
    }

    if (next.role !== "tool") {
      errors.push(
        `messages[${i}]: assistant has tool-calls but next message is role="${next.role}", expected "tool"`
      );
      continue;
    }

    const resultIds = new Set(
      (next.content as any[])
        .filter((c: any) => c.type === "tool-result")
        .map((c: any) => c.toolCallId as string)
    );

    for (const id of toolCallIds) {
      if (!resultIds.has(id)) {
        errors.push(
          `messages[${i}]: tool-call "${id}" has no matching tool-result in messages[${i + 1}]`
        );
      }
    }
  }
  return errors;
}

// --- Tests ---

describe("Chat history tool call validation", () => {
  it("single-step tool call: save → load → convert produces valid messages", async () => {
    // Simulate onFinish saving a single-step tool call
    const savedParts = simulateDbRoundTrip([
      { type: "step-start" },
      {
        type: "dynamic-tool",
        toolCallId: "toolu_abc123",
        toolName: "createPost",
        input: { platform: "twitter", text: "Hello world" },
        state: "output-available",
        output: { postId: "post_1", url: "https://twitter.com/status/1" },
      },
      { type: "text", text: "I published your post on Twitter!" },
    ]);

    const uiMessages = buildUIMessages([
      { id: "m1", role: "user", content: "Post hello world on Twitter", parts: null },
      { id: "m2", role: "assistant", content: "I published your post on Twitter!", parts: savedParts },
      { id: "m3", role: "user", content: "Thanks!", parts: null },
    ]);

    const modelMessages = await convertToModelMessages(uiMessages, {
      ignoreIncompleteToolCalls: true,
    });

    const errors = validateToolCallPairing(modelMessages);
    expect(errors).toEqual([]);
    // Verify the tool call exists (AI remembers what it did)
    const hasToolCall = modelMessages.some(
      (m) =>
        m.role === "assistant" &&
        Array.isArray(m.content) &&
        m.content.some((c: any) => c.type === "tool-call" && c.toolName === "createPost")
    );
    expect(hasToolCall).toBe(true);
  });

  it("multi-step tool calls: step-start markers produce proper message pairs", async () => {
    // Step 0: createPost(twitter), Step 1: createPost(linkedin)
    const savedParts = simulateDbRoundTrip([
      { type: "step-start" },
      {
        type: "dynamic-tool",
        toolCallId: "toolu_step0",
        toolName: "createPost",
        input: { platform: "twitter", text: "Hello" },
        state: "output-available",
        output: { postId: "tw_1" },
      },
      { type: "step-start" },
      {
        type: "dynamic-tool",
        toolCallId: "toolu_step1",
        toolName: "createPost",
        input: { platform: "linkedin", text: "Hello" },
        state: "output-available",
        output: { postId: "li_1" },
      },
      { type: "text", text: "Posted on both platforms!" },
    ]);

    const uiMessages = buildUIMessages([
      { id: "m1", role: "user", content: "Post on Twitter and LinkedIn", parts: null },
      { id: "m2", role: "assistant", content: "Posted on both platforms!", parts: savedParts },
      { id: "m3", role: "user", content: "Great", parts: null },
    ]);

    const modelMessages = await convertToModelMessages(uiMessages, {
      ignoreIncompleteToolCalls: true,
    });

    const errors = validateToolCallPairing(modelMessages);
    expect(errors).toEqual([]);
    // Both tool calls should exist
    const toolCalls = modelMessages.flatMap((m) =>
      m.role === "assistant" && Array.isArray(m.content)
        ? m.content.filter((c: any) => c.type === "tool-call")
        : []
    );
    expect(toolCalls).toHaveLength(2);
  });

  it("multi-step without step-start (old DB data): still valid via flattening", async () => {
    // Old format: no step-start markers
    const savedParts = simulateDbRoundTrip([
      {
        type: "dynamic-tool",
        toolCallId: "toolu_old1",
        toolName: "createPost",
        input: { platform: "twitter" },
        state: "output-available",
        output: { postId: "tw_old" },
      },
      {
        type: "dynamic-tool",
        toolCallId: "toolu_old2",
        toolName: "listPosts",
        input: {},
        state: "output-available",
        output: { posts: [] },
      },
      { type: "text", text: "Done" },
    ]);

    const uiMessages = buildUIMessages([
      { id: "m1", role: "user", content: "Post and verify", parts: null },
      { id: "m2", role: "assistant", content: "Done", parts: savedParts },
      { id: "m3", role: "user", content: "OK", parts: null },
    ]);

    const modelMessages = await convertToModelMessages(uiMessages, {
      ignoreIncompleteToolCalls: true,
    });

    const errors = validateToolCallPairing(modelMessages);
    expect(errors).toEqual([]);
  });

  it("tool call with undefined output is filtered out", async () => {
    // Simulate a tool call where output was undefined (stripped by JSON.stringify)
    const savedParts = simulateDbRoundTrip([
      { type: "step-start" },
      {
        type: "dynamic-tool",
        toolCallId: "toolu_nooutput",
        toolName: "createPost",
        input: { platform: "twitter" },
        state: "output-available",
        output: undefined, // will be stripped by JSON.stringify
      },
      { type: "text", text: "Something went wrong" },
    ]);

    const uiMessages = buildUIMessages([
      { id: "m1", role: "user", content: "Post this", parts: null },
      { id: "m2", role: "assistant", content: "Something went wrong", parts: savedParts },
      { id: "m3", role: "user", content: "Try again", parts: null },
    ]);

    const modelMessages = await convertToModelMessages(uiMessages, {
      ignoreIncompleteToolCalls: true,
    });

    // Should produce valid messages (tool call stripped, only text remains)
    const errors = validateToolCallPairing(modelMessages);
    expect(errors).toEqual([]);
  });

  it("long conversation with multiple tool-using turns", async () => {
    const turn1Parts = simulateDbRoundTrip([
      { type: "step-start" },
      {
        type: "dynamic-tool",
        toolCallId: "toolu_t1",
        toolName: "createPost",
        input: { platform: "twitter", text: "Post 1" },
        state: "output-available",
        output: { postId: "tw_1" },
      },
      { type: "text", text: "Posted on Twitter!" },
    ]);

    const turn2Parts = simulateDbRoundTrip([
      { type: "step-start" },
      {
        type: "dynamic-tool",
        toolCallId: "toolu_t2",
        toolName: "createPost",
        input: { platform: "linkedin", text: "Post 2" },
        state: "output-available",
        output: { postId: "li_1" },
      },
      { type: "text", text: "Posted on LinkedIn!" },
    ]);

    const turn3Parts = simulateDbRoundTrip([
      { type: "step-start" },
      {
        type: "dynamic-tool",
        toolCallId: "toolu_t3",
        toolName: "getAnalytics",
        input: {},
        state: "output-available",
        output: { views: 100, likes: 10 },
      },
      { type: "text", text: "Your analytics look great!" },
    ]);

    const uiMessages = buildUIMessages([
      { id: "m1", role: "user", content: "Post on Twitter", parts: null },
      { id: "m2", role: "assistant", content: "Posted on Twitter!", parts: turn1Parts },
      { id: "m3", role: "user", content: "Now post on LinkedIn", parts: null },
      { id: "m4", role: "assistant", content: "Posted on LinkedIn!", parts: turn2Parts },
      { id: "m5", role: "user", content: "How are my analytics?", parts: null },
      { id: "m6", role: "assistant", content: "Your analytics look great!", parts: turn3Parts },
      { id: "m7", role: "user", content: "What did you post earlier?", parts: null },
    ]);

    const modelMessages = await convertToModelMessages(uiMessages, {
      ignoreIncompleteToolCalls: true,
    });

    const errors = validateToolCallPairing(modelMessages);
    expect(errors).toEqual([]);

    // All 3 tool calls should be present (AI remembers all actions)
    const allToolCalls = modelMessages.flatMap((m) =>
      m.role === "assistant" && Array.isArray(m.content)
        ? m.content.filter((c: any) => c.type === "tool-call")
        : []
    );
    expect(allToolCalls).toHaveLength(3);
  });

  it("mixed old (no parts) and new (with parts) messages", async () => {
    const newParts = simulateDbRoundTrip([
      { type: "step-start" },
      {
        type: "dynamic-tool",
        toolCallId: "toolu_new1",
        toolName: "createPost",
        input: { platform: "twitter" },
        state: "output-available",
        output: { postId: "tw_new" },
      },
      { type: "text", text: "Done!" },
    ]);

    const uiMessages = buildUIMessages([
      { id: "m1", role: "user", content: "Hello", parts: null },
      { id: "m2", role: "assistant", content: "Hi! How can I help?", parts: null }, // old msg, no parts
      { id: "m3", role: "user", content: "Post on Twitter", parts: null },
      { id: "m4", role: "assistant", content: "Done!", parts: newParts },
      { id: "m5", role: "user", content: "Thanks", parts: null },
    ]);

    const modelMessages = await convertToModelMessages(uiMessages, {
      ignoreIncompleteToolCalls: true,
    });

    const errors = validateToolCallPairing(modelMessages);
    expect(errors).toEqual([]);
  });

  it("THE BUG: tool-call + text in same message gets split into separate steps", async () => {
    // This is the exact pattern that caused the production error:
    // assistant message has tool-call THEN text (the error response from the tool)
    // Without splitting, Anthropic gets: assistant([tool_use, text]) which is INVALID
    // because text after tool_use implies the AI responded before getting tool_result
    const savedParts = simulateDbRoundTrip([
      {
        type: "dynamic-tool",
        toolCallId: "toolu_019xyb6MBogyFmS94pDGHere",
        toolName: "createPost",
        input: { platform: "instagram", text: "Hello" },
        state: "output-available",
        output: { error: "Instagram blocked the post" },
      },
      { type: "text", text: "❌ **Erreur :** Instagram bloque la publication" },
    ]);

    // Simulate the server-side parts transformation (split tool+text)
    const filteredParts = filterParts(savedParts);
    const hasToolParts = filteredParts.some(
      (p: any) => p.type === "dynamic-tool" || (typeof p.type === "string" && p.type.startsWith("tool-"))
    );
    const hasTextAfterTool = hasToolParts && filteredParts.some((p: any, i: number) => {
      if (p.type !== "text") return false;
      return filteredParts.slice(0, i).some(
        (prev: any) => prev.type === "dynamic-tool" || (typeof prev.type === "string" && prev.type.startsWith("tool-"))
      );
    });

    let finalParts: UIMessage["parts"];
    if (hasTextAfterTool) {
      const toolParts = filteredParts.filter(
        (p: any) => p.type === "dynamic-tool" || (typeof p.type === "string" && p.type.startsWith("tool-"))
      );
      const textParts = filteredParts.filter((p: any) => p.type === "text");
      finalParts = [
        { type: "step-start" as const },
        ...toolParts,
        { type: "step-start" as const },
        ...textParts,
      ] as UIMessage["parts"];
    } else {
      finalParts = filteredParts;
    }

    const uiMessages: UIMessage[] = [
      { id: "m1", role: "user", content: "Post on Instagram", parts: [{ type: "text", text: "Post on Instagram" }] },
      { id: "m2", role: "assistant", content: "❌ Erreur", parts: finalParts },
      { id: "m3", role: "user", content: "(media attached)", parts: [{ type: "text", text: "(media attached)\n\n[MEDIA: https://example.com/img.jpg]" }] },
    ];

    const modelMessages = await convertToModelMessages(uiMessages, {
      ignoreIncompleteToolCalls: true,
    });

    const errors = validateToolCallPairing(modelMessages);
    expect(errors).toEqual([]);

    // Verify the split: tool-call should be in its own assistant message
    const assistantMessages = modelMessages.filter((m) => m.role === "assistant");
    const toolCallMsg = assistantMessages.find(
      (m) => Array.isArray(m.content) && m.content.some((c: any) => c.type === "tool-call")
    );
    const textMsg = assistantMessages.find(
      (m) => Array.isArray(m.content) && m.content.some((c: any) => c.type === "text" && c.text.includes("Erreur"))
    );
    // They should be DIFFERENT messages (split, not combined)
    expect(toolCallMsg).toBeDefined();
    expect(textMsg).toBeDefined();
    if (toolCallMsg && textMsg) {
      const toolIdx = modelMessages.indexOf(toolCallMsg);
      const textIdx = modelMessages.indexOf(textMsg);
      expect(textIdx).toBeGreaterThan(toolIdx);
    }
  });

  it("tool part with null output (not undefined) passes through correctly", async () => {
    const savedParts = simulateDbRoundTrip([
      { type: "step-start" },
      {
        type: "dynamic-tool",
        toolCallId: "toolu_null",
        toolName: "deletePost",
        input: { postId: "123" },
        state: "output-available",
        output: null, // explicit null (tool returned nothing)
      },
      { type: "text", text: "Deleted!" },
    ]);

    const uiMessages = buildUIMessages([
      { id: "m1", role: "user", content: "Delete that post", parts: null },
      { id: "m2", role: "assistant", content: "Deleted!", parts: savedParts },
      { id: "m3", role: "user", content: "OK", parts: null },
    ]);

    const modelMessages = await convertToModelMessages(uiMessages, {
      ignoreIncompleteToolCalls: true,
    });

    const errors = validateToolCallPairing(modelMessages);
    expect(errors).toEqual([]);
  });
});
