"use client";

import { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";

interface WaveformProps {
  audioUrl: string;
  waveColor?: string;
  progressColor?: string;
}

export function Waveform({ audioUrl, waveColor = "hsl(var(--primary))", progressColor = "hsl(var(--primary) / 0.7)" }: WaveformProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize WaveSurfer
    wavesurferRef.current = WaveSurfer.create({
      container: containerRef.current,
      waveColor,
      progressColor,
      height: 40,
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      cursorWidth: 0,
      normalize: true,
      backend: "WebAudio",
    });

    // Load audio
    const loadAudio = async () => {
      try {
        if (audioUrl) {
          await wavesurferRef.current?.load(audioUrl);
          setIsReady(true);
        }
      } catch (error) {
        console.error("WaveSurfer load error:", error);
        setIsReady(false);
      }
    };

    loadAudio();

    // Handle errors
    wavesurferRef.current?.on("error", (error) => {
      console.error("WaveSurfer error:", error);
      setIsReady(false);
    });

    // Clean up
    return () => {
      if (wavesurferRef.current) {
        wavesurferRef.current.destroy();
        wavesurferRef.current = null;
      }
    };
  }, [audioUrl, waveColor, progressColor]);

  return (
    <div className="w-full">
      <div ref={containerRef} className="w-full" />
      {!isReady && (
        <div className="text-center text-sm text-muted-foreground">
          Loading waveform...
        </div>
      )}
    </div>
  );
}