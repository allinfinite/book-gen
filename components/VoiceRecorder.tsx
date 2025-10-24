"use client";

import { useState, useRef, useEffect } from "react";
import { useUIStore } from "@/store/useUIStore";
import { Mic, Square, Loader2 } from "lucide-react";

interface VoiceRecorderProps {
  onTranscriptionComplete: (text: string) => void;
  onError?: (error: string) => void;
}

export function VoiceRecorder({
  onTranscriptionComplete,
  onError,
}: VoiceRecorderProps) {
  const { isRecording, startRecording, stopRecording, updateRecordingDuration } =
    useUIStore();
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    // Keyboard shortcut: R key
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "r" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (isRecording) {
          handleStopRecording();
        } else {
          handleStartRecording();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isRecording]);

  async function handleStartRecording() {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      });

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        await transcribeAudio(blob);

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      startRecording();
      startTimeRef.current = Date.now();

      // Update duration timer
      timerRef.current = setInterval(() => {
        const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
        updateRecordingDuration(duration);
      }, 1000);
    } catch (err: any) {
      const errorMessage = err.message || "Failed to access microphone";
      setError(errorMessage);
      onError?.(errorMessage);
    }
  }

  function handleStopRecording() {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      stopRecording();

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }

  async function transcribeAudio(audioBlob: Blob) {
    setIsTranscribing(true);

    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");
      formData.append("language", "en");

      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Transcription failed");
      }

      const result = await response.json();
      onTranscriptionComplete(result.text);
      setError(null);
    } catch (err: any) {
      const errorMessage = err.message || "Transcription failed";
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsTranscribing(false);
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div className="flex flex-col items-end gap-2">
        {error && (
          <div className="bg-destructive text-destructive-foreground px-4 py-2 rounded-md text-sm max-w-xs">
            {error}
          </div>
        )}

        <button
          onClick={isRecording ? handleStopRecording : handleStartRecording}
          disabled={isTranscribing}
          className={`flex items-center gap-2 px-6 py-4 rounded-full shadow-lg transition-all ${
            isRecording
              ? "bg-destructive text-destructive-foreground animate-pulse"
              : "bg-primary text-primary-foreground hover:bg-primary/90"
          } ${isTranscribing ? "opacity-50 cursor-not-allowed" : ""}`}
          title="Press Cmd/Ctrl+R to toggle recording"
        >
          {isTranscribing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Transcribing...</span>
            </>
          ) : isRecording ? (
            <>
              <Square className="w-5 h-5" />
              <span>Stop Recording</span>
            </>
          ) : (
            <>
              <Mic className="w-5 h-5" />
              <span>Start Recording</span>
            </>
          )}
        </button>

        {isRecording && (
          <div className="text-sm text-muted-foreground bg-card px-3 py-1 rounded-md border border-border">
            Press Cmd/Ctrl+R to stop
          </div>
        )}
      </div>
    </div>
  );
}
