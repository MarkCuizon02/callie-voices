import React from "react";

export function SpeakingWaveform({ className = "", active = false }: { className?: string; active?: boolean }) {
  return (
    <>
      <style>{`
        @keyframes waveform {
          0%, 100% { height: 30%; }
          50% { height: 100%; }
        }
        .animate-waveform {
          animation: waveform 1s infinite ease-in-out;
        }
      `}</style>
      <div className={`flex items-end gap-1 h-6 ${className}`}>
        {[1, 2, 3, 4, 5, 6, 7, 8].map((bar, i) => (
          <div
            key={i}
            className={`w-1 rounded bg-green-500 ${active ? "animate-waveform" : ""}`}
            style={{
              animationDelay: `${i * 0.1}s`,
              height: active ? "100%" : `${12 + (i % 2 === 0 ? 10 : 0)}px`,
              minHeight: active ? `${8 + Math.random() * 24}px` : undefined,
              transition: "height 0.3s"
            }}
          />
        ))}
      </div>
    </>
  );
} 