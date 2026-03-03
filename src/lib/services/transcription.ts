const OPENAI_TRANSCRIPTION_URL =
  "https://api.openai.com/v1/audio/transcriptions";

export async function transcribeAudio(audioFile: File): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const formData = new FormData();
  formData.append("file", audioFile);
  formData.append("model", "gpt-4o-mini-transcribe");

  const response = await fetch(OPENAI_TRANSCRIPTION_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("OpenAI transcription error:", response.status, errorBody);
    throw new Error("Transcription API request failed");
  }

  const result = await response.json();
  return result.text;
}
