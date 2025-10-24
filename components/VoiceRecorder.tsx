"use client";

import { useState, useRef, useEffect } from "react";
import { useUIStore } from "@/store/useUIStore";
import { Mic, Square, Loader2 } from "lucide-react";

interface VoiceRecorderProps {
  onTranscriptionComplete: (text: string) => void;
  onError?: (error: string) => void;
  inline?: boolean; // If true, render inline instead of floating
}

export function VoiceRecorder({
  onTranscriptionComplete,
  onError,
  inline = false,
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
  const animationFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

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
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  async function handleStartRecording() {
    try {
      setError(null);

      // List available audio devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioDevices = devices.filter(device => device.kind === 'audioinput');
      console.log("Available audio input devices:", audioDevices.map(d => ({
        deviceId: d.deviceId,
        label: d.label,
        groupId: d.groupId
      })));

      // Use simple audio constraints - browser will use defaults
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      streamRef.current = stream;
      console.log("Got media stream, tracks:", stream.getAudioTracks().length);
      const audioTrack = stream.getAudioTracks()[0];
      console.log("Audio track settings:", audioTrack.getSettings());
      console.log("Audio track label:", audioTrack.label);

      // Test: Create an audio element to verify stream has audio
      const audio = new Audio();
      audio.srcObject = stream;
      audio.muted = true; // Mute to avoid feedback
      audio.volume = 0;
      await audio.play().catch(e => console.error("Audio play test failed:", e));
      console.log("Audio element test: playing stream (muted)");

      // DON'T set up audio visualization for now - it interferes with MediaRecorder
      // The AudioContext analyser can consume the stream and prevent MediaRecorder from working
      // We'll just use a simple animation instead

      // Simple pulse animation while recording
      const animatePulse = () => {
        if (!mediaRecorderRef.current || mediaRecorderRef.current.state !== "recording") return;

        // Create a simple pulse effect
        const pulseValue = 0.3 + Math.random() * 0.4;
        setAudioLevel(pulseValue);

        animationFrameRef.current = requestAnimationFrame(animatePulse);
      };
      animatePulse();

      // Try to get the best audio quality
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 128000, // Higher quality
      });

      console.log("MediaRecorder created:", {
        mimeType,
        state: mediaRecorder.state,
        streamActive: stream.active,
        audioTracksEnabled: stream.getAudioTracks()[0].enabled,
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

        // Clean up animation
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }

        await transcribeAudio(blob);

        // Stop all tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
      };

      // Start recording with time slice to ensure we capture all data
      mediaRecorder.start(1000); // Capture data every 1000ms (1 second)
      console.log("Recording started with 1000ms time slice");
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

      // Request final data before stopping
      if (mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.requestData();
      }

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

  // Inline version for use in sidebars
  if (inline) {
    return (
      <div className="space-y-3">
        {error && (
          <div className="bg-destructive/10 text-destructive px-3 py-2 rounded-md text-xs">
            {error}
          </div>
        )}

        {/* Waveform Visualization */}
        {isRecording && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
              <span className="text-xs font-medium">Recording...</span>
            </div>
            <div className="flex-1 flex items-center gap-1 h-8">
              {Array.from({ length: 15 }).map((_, i) => (
                <div
                  key={i}
                  className="w-1 bg-primary rounded-full transition-all duration-75"
                  style={{
                    height: `${Math.max(4, audioLevel * 32 * (Math.random() * 0.5 + 0.5))}px`,
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Transcribing Status */}
        {isTranscribing && (
          <div className="flex items-center gap-2 text-xs">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            <span>Transcribing audio...</span>
          </div>
        )}

        <button
          onClick={isRecording ? handleStopRecording : handleStartRecording}
          disabled={isTranscribing}
          className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-md transition-all text-sm ${
            isRecording
              ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
              : "bg-primary text-primary-foreground hover:bg-primary/90"
          } ${isTranscribing ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          {isTranscribing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Processing...</span>
            </>
          ) : isRecording ? (
            <>
              <Square className="w-4 h-4" />
              <span>Stop Recording</span>
            </>
          ) : (
            <>
              <Mic className="w-4 h-4" />
              <span>Start Recording</span>
            </>
          )}
        </button>
      </div>
    );
  }

  // Floating version (original)
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
