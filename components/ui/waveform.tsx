"use client";

import { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import { Button } from "@/components/ui/button";
import { Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";

interface WaveformProps {
  audioUrl: string;
  waveColor?: string;
  progressColor?: string;
  className?: string;
}

export function Waveform({
  audioUrl,
  waveColor = "hsl(var(--primary))",
  progressColor = "hsl(var(--primary) / 0.5)",
  className,
}: WaveformProps) {
  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurfer = useRef<WaveSurfer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (!waveformRef.current) return;

    // Destroy previous instance
    if (wavesurfer.current) {
      wavesurfer.current.destroy();
    }

    // Create new WaveSurfer instance
    const ws = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: waveColor,
      progressColor: progressColor,
      height: 50,
      cursorWidth: 1,
      cursorColor: "transparent",
      barWidth: 2,
      barGap: 2,
      barRadius: 2,
    });

    ws.load(audioUrl);

    ws.on("ready", () => {
      wavesurfer.current = ws;
    });

    ws.on("play", () => setIsPlaying(true));
    ws.on("pause", () => setIsPlaying(false));
    ws.on("finish", () => setIsPlaying(false));

    // Cleanup
    return () => {
      if (wavesurfer.current) {
        wavesurfer.current.destroy();
      }
    };
  }, [audioUrl, waveColor, progressColor]);

  const togglePlayPause = () => {
    if (!wavesurfer.current) return;
    
    if (isPlaying) {
      wavesurfer.current.pause();
    } else {
      wavesurfer.current.play();
    }
  };

  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 rounded-full"
        onClick={togglePlayPause}
      >
        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </Button>
      <div ref={waveformRef} className="flex-1 min-h-[50px]" />
    </div>
  );
}