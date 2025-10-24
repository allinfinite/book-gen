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
  const [audioLevel, setAudioLevel] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close();
      }
    };
  }, []);

  async function handleStartRecording() {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Set up audio visualization
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      // Start visualization
      const updateLevel = () => {
        if (!analyserRef.current || !mediaRecorderRef.current) return;

        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);

        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        setAudioLevel(average / 255); // Normalize to 0-1

        // Continue animation while recorder is active
        if (mediaRecorderRef.current?.state === "recording") {
          animationFrameRef.current = requestAnimationFrame(updateLevel);
        }
      };
      updateLevel();

      // Try to get the best audio quality
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 128000, // Higher quality
      });

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          console.log("Audio chunk received:", event.data.size, "bytes");
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        console.log("Recording stopped. Total chunks:", chunksRef.current.length);
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        console.log("Blob created:", blob.size, "bytes");

        // Clean up audio context
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        if (audioContextRef.current && audioContextRef.current.state !== "closed") {
          audioContextRef.current.close();
        }

        await transcribeAudio(blob);

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      // Start recording with time slice to ensure we capture all data
      mediaRecorder.start(100); // Capture data every 100ms
      console.log("Recording started with 100ms time slice");
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
      const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
      console.log("Stopping recording. Duration:", duration, "seconds");
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
    console.log("Starting transcription...", audioBlob.size, "bytes");

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
      console.log("Transcription result:", result);

      if (result.text) {
        onTranscriptionComplete(result.text);
        setError(null);
      } else {
        throw new Error("No text returned from transcription");
      }
    } catch (err: any) {
      console.error("Transcription error:", err);
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

        {/* Waveform Visualization */}
        {isRecording && (
          <div className="bg-card border border-border rounded-lg px-4 py-3 shadow-lg">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
              <span className="text-sm font-medium">Recording...</span>
            </div>
            <div className="flex items-center gap-1 h-12">
              {Array.from({ length: 20 }).map((_, i) => (
                <div
                  key={i}
                  className="w-1 bg-primary rounded-full transition-all duration-75"
                  style={{
                    height: `${Math.max(4, audioLevel * 48 * (Math.random() * 0.5 + 0.5))}px`,
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Transcribing Status */}
        {isTranscribing && (
          <div className="bg-card border border-border rounded-lg px-4 py-3 shadow-lg">
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span className="text-sm font-medium">Transcribing audio...</span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              This may take a few seconds
            </div>
          </div>
        )}

        <button
          onClick={isRecording ? handleStopRecording : handleStartRecording}
          disabled={isTranscribing}
          className={`flex items-center gap-2 px-6 py-4 rounded-full shadow-lg transition-all ${
            isRecording
              ? "bg-destructive text-destructive-foreground"
              : "bg-primary text-primary-foreground hover:bg-primary/90"
          } ${isTranscribing ? "opacity-50 cursor-not-allowed" : ""}`}
          title="Press Cmd/Ctrl+R to toggle recording"
        >
          {isTranscribing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Processing...</span>
            </>
          ) : isRecording ? (
            <>
              <Square className="w-5 h-5" />
              <span>Stop</span>
            </>
          ) : (
            <>
              <Mic className="w-5 h-5" />
              <span>Record</span>
            </>
          )}
        </button>

        {isRecording && (
          <div className="text-xs text-muted-foreground bg-card px-3 py-1 rounded-md border border-border">
            Press Cmd/Ctrl+R to stop
          </div>
        )}
      </div>
    </div>
  );
}
