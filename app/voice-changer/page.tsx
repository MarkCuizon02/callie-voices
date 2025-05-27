"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Download, Mic, Loader2, Play, AlertCircle, RotateCcw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Voice {
  id: string;
  name: string;
}

const fallbackVoices: Voice[] = [
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
  const [stability, setStability] = useState(0.5); // ElevenLabs range: 0 to 1
  const [similarity, setSimilarity] = useState(0.75); // ElevenLabs range: 0 to 1
  const [style, setStyle] = useState(0); // ElevenLabs range: 0 to 1
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [outputUrl, setOutputUrl] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [voices, setVoices] = useState<Voice[]>(fallbackVoices);
  const [isLoadingVoices, setIsLoadingVoices] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Fetch ElevenLabs voices on mount
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY;
    if (!apiKey) {
      setError("ElevenLabs API key not configured. Using fallback voices.");
      setIsLoadingVoices(false);
      return;
    }

    const fetchVoices = async () => {
      try {
        const response = await fetch("https://api.elevenlabs.io/v1/voices", {
          headers: {
            "xi-api-key": apiKey,
          },
        });
        if (!response.ok) {
          throw new Error("Failed to fetch voices");
        }
        const data = await response.json();
        const fetchedVoices = data.voices.map((voice: any) => ({
          id: voice.voice_id,
          name: `${voice.name} (ElevenLabs)`,
        }));
        setVoices([...fallbackVoices, ...fetchedVoices]);
      } catch (err) {
        setError("Failed to load ElevenLabs voices. Using fallback voices.");
      } finally {
        setIsLoadingVoices(false);
      }
    };

    fetchVoices();
  }, []);

  // Revoke object URLs on cleanup
  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (outputUrl) URL.revokeObjectURL(outputUrl);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [audioUrl, outputUrl, previewUrl]);

  const handleGenerate = async (retryCount = 0) => {
    if (!audioFile) {
      setError("Please upload an audio file");
      return;
    }

    const apiKey = process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY;
    if (!apiKey) {
      setError("ElevenLabs API key not configured. Please check your .env.local file.");
      return;
    }

    // Validate file
    const maxSize = 25 * 1024 * 1024; // 25MB (ElevenLabs limit)
    if (audioFile.size > maxSize) {
      setError("Audio file is too large. Maximum size is 25MB.");
      return;
    }
    if (!audioFile.type.startsWith("audio/")) {
      setError("Please upload a valid audio file (e.g., MP3, WAV).");
      return;
    }

    setIsProcessing(true);
    setError("");
    abortControllerRef.current = new AbortController();

    try {
      const formData = new FormData();
      formData.append("file", audioFile);
      formData.append("voice_id", targetVoice);
      formData.append("stability", stability.toString());
      formData.append("similarity_boost", similarity.toString());
      formData.append("style", style.toString());

      const response = await fetch("https://api.elevenlabs.io/v1/voice-conversion", {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
        },
        body: formData,
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const message = errorData.detail?.message || `API request failed: ${response.statusText}`;
        if (retryCount < 2 && response.status >= 500) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          return handleGenerate(retryCount + 1); // Retry up to 2 times for server errors
        }
        throw new Error(message);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setOutputUrl(url);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        setError("Voice conversion was cancelled");
      } else {
        setError(err instanceof Error ? err.message : "An error occurred during voice conversion");
      }
    } finally {
      setIsProcessing(false);
      setUploadProgress(0);
      abortControllerRef.current = null;
    }
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadProgress(0);
      const interval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            return 100;
          }
          return prev + 10;
        });
      }, 200);

      if (audioUrl) URL.revokeObjectURL(audioUrl);
      setAudioFile(file);
      setAudioUrl(URL.createObjectURL(file));
      setOutputUrl("");
      setError("");
    }
  };

  const handleReset = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    if (outputUrl) URL.revokeObjectURL(outputUrl);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setAudioFile(null);
    setAudioUrl("");
    setOutputUrl("");
    setPreviewUrl("");
    setTargetVoice("alloy");
    setStability(0.5);
    setSimilarity(0.75);
    setStyle(0);
    setError("");
    setUploadProgress(0);
  };

  const handlePreviewVoice = async () => {
    setError("");
    const apiKey = process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY;
    if (!apiKey) {
      setError("ElevenLabs API key not configured for preview.");
      return;
    }

    try {
      const response = await fetch("https://api.elevenlabs.io/v1/text-to-speech/" + targetVoice, {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: "This is a preview of the selected voice.",
          model_id: "eleven_monolingual_v1",
          voice_settings: {
            stability,
            similarity_boost: similarity,
            style,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail?.message || "Failed to generate voice preview");
      }

      const blob = await response.blob();
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(blob));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load voice preview");
    }
  };

  return (
    <TooltipProvider>
      <div className="flex flex-col items-center justify-center min-h-screen bg-background py-8 px-2">
        <Card className="w-full max-w-2xl shadow-xl border rounded-2xl">
          <CardHeader>
            <CardTitle>Voice Changer</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            {/* Upload audio */}
            <div className="flex flex-col gap-2">
              <label className="font-medium">Upload Audio</label>
              <div className="flex gap-2">
                <Input
                  type="file"
                  accept="audio/*"
                  onChange={handleFileChange}
                  aria-label="Upload audio file"
                />
                <Button variant="outline" type="button" disabled aria-disabled="true">
                  <Mic className="h-5 w-5 mr-2" /> Record (coming soon)
                </Button>
              </div>
              {uploadProgress > 0 && uploadProgress < 100 && (
                <Progress value={uploadProgress} className="mt-2" aria-label="Upload progress" />
              )}
              {audioUrl && (
                <audio controls src={audioUrl} className="mt-2 w-full" aria-label="Input audio preview" />
              )}
            </div>
            {/* Voice selection */}
            <div className="flex flex-col gap-2">
              <label className="font-medium">Target Voice</label>
              <div className="flex gap-2 items-center">
                <Select value={targetVoice} onValueChange={setTargetVoice} disabled={isLoadingVoices}>
                  <SelectTrigger className="w-64" aria-label="Select target voice">
                    <SelectValue placeholder={isLoadingVoices ? "Loading voices..." : "Select a voice"} />
                  </SelectTrigger>
                  <SelectContent>
                    {voices.map((voice) => (
                      <SelectItem key={voice.id} value={voice.id}>{voice.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={handlePreviewVoice} disabled={isLoadingVoices}>
                  <Play className="h-5 w-5 mr-2" /> Preview
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Selected: {voices.find(v => v.id === targetVoice)?.name || "None"}
              </p>
              {previewUrl && (
                <audio controls src={previewUrl} className="mt-2 w-full" aria-label="Voice preview" />
              )}
            </div>
            {/* Settings sliders */}
            <div className="flex flex-col gap-4">
              <div>
                <div className="flex justify-between text-sm font-medium mb-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>Stability</span>
                    </TooltipTrigger>
                    <TooltipContent>
                      Controls voice consistency (0 = more variable, 1 = more stable)
                    </TooltipContent>
                  </Tooltip>
                  <span>{(stability * 100).toFixed(0)}%</span>
                </div>
                <Slider
                  min={0}
                  max={1}
                  step={0.01}
                  value={[stability]}
                  onValueChange={v => setStability(v[0])}
                  aria-label="Voice stability"
                />
              </div>
              <div>
                <div className="flex justify-between text-sm font-medium mb-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>Similarity Boost</span>
                    </TooltipTrigger>
                    <TooltipContent>
                      Enhances how closely the output matches the target voice (0 = less similar, 1 = more similar)
                    </TooltipContent>
                  </Tooltip>
                  <span>{(similarity * 100).toFixed(0)}%</span>
                </div>
                <Slider
                  min={0}
                  max={1}
                  step={0.01}
                  value={[similarity]}
                  onValueChange={v => setSimilarity(v[0])}
                  aria-label="Similarity boost"
                />
              </div>
              <div>
                <div className="flex justify-between text-sm font-medium mb-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>Style Exaggeration</span>
                    </TooltipTrigger>
                    <TooltipContent>
                      Amplifies stylistic elements of the target voice (0 = neutral, 1 = exaggerated)
                    </TooltipContent>
                  </Tooltip>
                  <span>{(style * 100).toFixed(0)}%</span>
                </div>
                <Slider
                  min={0}
                  max={1}
                  step={0.01}
                  value={[style]}
                  onValueChange={v => setStyle(v[0])}
                  aria-label="Style exaggeration"
                />
              </div>
            </div>
            {/* Error message */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
          <CardFooter className="flex flex-col gap-4 items-stretch">
            <div className="flex gap-2">
              <Button
                className="w-full flex items-center justify-center gap-2"
                onClick={() => handleGenerate()}
                disabled={!audioUrl || isProcessing || isLoadingVoices}
                aria-label="Generate voice conversion"
              >
                {isProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Play className="h-5 w-5" />}
                Generate
              </Button>
              {isProcessing && (
                <Button
                  variant="destructive"
                  className="w-fit flex items-center gap-2"
                  onClick={handleCancel}
                  aria-label="Cancel voice conversion"
                >
                  Cancel
                </Button>
              )}
              <Button
                variant="outline"
                className="w-fit flex items-center gap-2"
                onClick={handleReset}
                aria-label="Reset form"
              >
                <RotateCcw className="h-5 w-5" /> Reset
              </Button>
            </div>
            {outputUrl && (
              <div className="flex flex-col gap-2">
                <label className="font-medium">Transformed Audio</label>
                <audio
                  ref={audioRef}
                  controls
                  src={outputUrl}
                  className="w-full"
                  aria-label="Transformed audio output"
                />
                <Button
                  variant="outline"
                  className="w-fit flex items-center gap-2"
                  onClick={() => {
                    const link = document.createElement("a");
                    link.href = outputUrl;
                    link.download = `voice-changed-${targetVoice}.wav`;
                    link.click();
                  }}
                  aria-label="Download transformed audio"
                >
                  <Download className="h-5 w-5" /> Download
                </Button>
              </div>
            )}
          </CardFooter>
        </Card>
      </div>
    </TooltipProvider>
  );
}