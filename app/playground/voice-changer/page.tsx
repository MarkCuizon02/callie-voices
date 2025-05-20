"use client";

import { useState, useRef } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Download, Mic, Upload, Loader2, Play } from "lucide-react";

const voices = [
  { id: "alloy", name: "Alloy" },
  { id: "echo", name: "Echo" },
  { id: "fable", name: "Fable" },
  { id: "nova", name: "Nova" },
  { id: "onyx", name: "Onyx" },
  { id: "shimmer", name: "Shimmer" },
];

export default function VoiceChangerPage() {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string>("");
  const [targetVoice, setTargetVoice] = useState("alloy");
  const [stability, setStability] = useState(80);
  const [similarity, setSimilarity] = useState(70);
  const [style, setStyle] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [outputUrl, setOutputUrl] = useState<string>("");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Placeholder for actual transformation logic
  const handleGenerate = async () => {
    setIsProcessing(true);
    setTimeout(() => {
      setOutputUrl(audioUrl); // Just echo input for now
      setIsProcessing(false);
    }, 1500);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAudioFile(file);
      setAudioUrl(URL.createObjectURL(file));
      setOutputUrl("");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background py-8 px-2">
      <Card className="w-full max-w-2xl shadow-xl border rounded-2xl">
        <CardHeader>
          <CardTitle>Voice Changer</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {/* Upload or record audio */}
          <div className="flex flex-col gap-2">
            <label className="font-medium">Upload or Record Audio</label>
            <div className="flex gap-2">
              <Input type="file" accept="audio/*" onChange={handleFileChange} />
              <Button variant="outline" type="button" disabled>
                <Mic className="h-5 w-5 mr-2" /> Record (coming soon)
              </Button>
            </div>
            {audioUrl && (
              <audio controls src={audioUrl} className="mt-2 w-full" />
            )}
          </div>
          {/* Voice selection */}
          <div className="flex flex-col gap-2">
            <label className="font-medium">Target Voice</label>
            <Select value={targetVoice} onValueChange={setTargetVoice}>
              <SelectTrigger className="w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {voices.map((voice) => (
                  <SelectItem key={voice.id} value={voice.id}>{voice.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {/* Settings sliders */}
          <div className="flex flex-col gap-4">
            <div>
              <div className="flex justify-between text-sm font-medium mb-1">
                <span>Stability</span>
                <span>{stability}%</span>
              </div>
              <Slider min={0} max={100} step={1} value={[stability]} onValueChange={v => setStability(v[0])} />
            </div>
            <div>
              <div className="flex justify-between text-sm font-medium mb-1">
                <span>Similarity</span>
                <span>{similarity}%</span>
              </div>
              <Slider min={0} max={100} step={1} value={[similarity]} onValueChange={v => setSimilarity(v[0])} />
            </div>
            <div>
              <div className="flex justify-between text-sm font-medium mb-1">
                <span>Style Exaggeration</span>
                <span>{style}%</span>
              </div>
              <Slider min={0} max={100} step={1} value={[style]} onValueChange={v => setStyle(v[0])} />
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4 items-stretch">
          <Button
            className="w-full flex items-center justify-center gap-2"
            onClick={handleGenerate}
            disabled={!audioUrl || isProcessing}
          >
            {isProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Play className="h-5 w-5" />}
            Generate
          </Button>
          {outputUrl && (
            <div className="flex flex-col gap-2">
              <label className="font-medium">Transformed Audio</label>
              <audio ref={audioRef} controls src={outputUrl} className="w-full" />
              <Button
                variant="outline"
                className="w-fit flex items-center gap-2"
                onClick={() => {
                  const link = document.createElement("a");
                  link.href = outputUrl;
                  link.download = "voice-changed.wav";
                  link.click();
                }}
              >
                <Download className="h-5 w-5" /> Download
              </Button>
            </div>
          )}
        </CardFooter>
      </Card>
    </div>
  );
} 