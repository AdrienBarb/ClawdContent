"use client";

import { useState, useRef, useCallback } from "react";
import { appRouter } from "@/lib/constants/appRouter";

interface UseVoiceRecorderReturn {
  isRecording: boolean;
  isTranscribing: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  error: string | null;
}

function getSupportedMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "audio/webm";
  if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus"))
    return "audio/webm;codecs=opus";
  if (MediaRecorder.isTypeSupported("audio/webm")) return "audio/webm";
  if (MediaRecorder.isTypeSupported("audio/mp4")) return "audio/mp4";
  return "audio/webm";
}

function getFileExtension(mimeType: string): string {
  if (mimeType.includes("mp4")) return "mp4";
  return "webm";
}

export function useVoiceRecorder(
  onTranscript: (text: string) => void
): UseVoiceRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  }, []);

  const startRecording = useCallback(async () => {
    setError(null);

    if (typeof navigator === "undefined" || !navigator.mediaDevices) {
      setError("Your browser does not support audio recording");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = getSupportedMimeType();
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        // Release microphone
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;

        const audioBlob = new Blob(chunksRef.current, { type: mimeType });

        if (audioBlob.size === 0) return;

        setIsTranscribing(true);
        try {
          const formData = new FormData();
          formData.append(
            "audio",
            audioBlob,
            `recording.${getFileExtension(mimeType)}`
          );

          const response = await fetch(appRouter.api.transcribe, {
            method: "POST",
            body: formData,
          });

          if (!response.ok) {
            const body = await response.json().catch(() => null);
            throw new Error(body?.error || "Transcription failed");
          }

          const { text } = await response.json();
          if (text?.trim()) onTranscript(text.trim());
        } catch (err) {
          setError(
            err instanceof Error ? err.message : "Failed to transcribe audio"
          );
        } finally {
          setIsTranscribing(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch {
      setError("Microphone access denied");
    }
  }, [onTranscript]);

  return { isRecording, isTranscribing, startRecording, stopRecording, error };
}
