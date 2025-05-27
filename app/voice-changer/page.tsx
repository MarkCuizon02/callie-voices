"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Download, Mic, Upload, Loader2, Play, Trash2, AlertCircle, RotateCcw } from "lucide-react";
import { generateSpeech } from "@/lib/openai";
import { generateElevenLabsSpeech, getElevenLabsVoices } from "@/lib/elevenlabs";
import { toast } from "@/components/ui/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Voice {
  id: string;
  name: string;
}

interface ElevenLabsVoice {
  voice_id: string;
  name: string;
}

// OpenAI voices
const openaiVoices: Voice[] = [
  { id: "alloy", name: "Alloy" },
  { id: "echo", name: "Echo" },
  { id: "fable", name: "Fable" },
  { id: "nova", name: "Nova" },
  { id: "onyx", name: "Onyx" },
  { id: "shimmer", name: "Shimmer" },
];

const fallbackVoices: Voice[] = [...openaiVoices];

export default function VoiceChangerPage() {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string>("");
  const [targetVoice, setTargetVoice] = useState<string>("alloy");
  const [stability, setStability] = useState<number>(0.5);
  const [similarity, setSimilarity] = useState<number>(0.75);
  const [style, setStyle] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [outputUrl, setOutputUrl] = useState<string>("");
  const [selectedModel, setSelectedModel] = useState<"openai" | "elevenlabs">("openai");
  const [elevenLabsVoices, setElevenLabsVoices] = useState<ElevenLabsVoice[]>([]);
  const [isLoadingVoices, setIsLoadingVoices] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(1.0);
  const [error, setError] = useState<string>("");
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Fetch ElevenLabs voices when model changes
  useEffect(() => {
    let mounted = true;
    if (selectedModel === "elevenlabs") {
      setIsLoadingVoices(true);
      getElevenLabsVoices()
        .then((voices) => {
          if (mounted) {
            setElevenLabsVoices(voices);
            if (voices.length > 0) {
              setTargetVoice(voices[0].voice_id);
            }
          }
        })
        .catch((error) => {
          if (mounted) {
            toast({
              title: "Error",
              description: "Failed to load ElevenLabs voices. Please try again.",
              variant: "destructive",
            });
            setError("Failed to load ElevenLabs voices.");
          }
        })
        .finally(() => {
          if (mounted) {
            setIsLoadingVoices(false);
          }
        });
    } else {
      setTargetVoice(openaiVoices[0].id);
      setElevenLabsVoices([]);
    }
    return () => {
      mounted = false;
    };
  }, [selectedModel]);

  // Handle recording logic
  useEffect(() => {
    if (!isRecording) {
      setAudioLevel(0);
      return;
    }

    let rafId: number;
    const setupRecorder = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioStreamRef.current = stream;

        // Choose the most compatible MIME type
        let mimeType = "";
        if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
          mimeType = "audio/webm;codecs=opus";
        } else if (MediaRecorder.isTypeSupported("audio/webm")) {
          mimeType = "audio/webm";
        } else if (MediaRecorder.isTypeSupported("audio/wav")) {
          mimeType = "audio/wav";
        }

        const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
        mediaRecorderRef.current = recorder;
        setRecordedChunks([]);

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            setRecordedChunks((prev) => [...prev, e.data]);
          }
        };

        recorder.onstop = () => {
          stream.getTracks().forEach((track) => track.stop());
          audioStreamRef.current = null;
          if (audioContextRef.current && audioContextRef.current.state !== "closed") {
            audioContextRef.current.close();
            audioContextRef.current = null;
          }

          const extension = mimeType.includes("wav") ? "wav" : "webm";
          const type = mimeType || "audio/webm";
          const blob = new Blob(recordedChunks, { type });
          const file = new File([blob], `recording.${extension}`, { type });
          setAudioFile(file);
          setAudioUrl(URL.createObjectURL(blob));
          setOutputUrl("");
        };

        recorder.start();

        // Audio level visualization
        const audioContext = new AudioContext();
        audioContextRef.current = audioContext;
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);

        const updateLevel = () => {
          const buffer = new Uint8Array(analyser.frequencyBinCount);
          analyser.getByteTimeDomainData(buffer);
          let sum = 0;
          for (let i = 0; i < buffer.length; i++) {
            const val = (buffer[i] - 128) / 128;
            sum += val * val;
          }
          const rms = Math.sqrt(sum / buffer.length);
          const level = Math.min(1, rms * 2);
          setAudioLevel(level);
          rafId = requestAnimationFrame(updateLevel);
        };
        updateLevel();
      } catch (err) {
        toast({
          title: "Error",
          description: "Microphone access denied or unavailable.",
          variant: "destructive",
        });
        setIsRecording(false);
      }
    };

    setupRecorder();

    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((track) => track.stop());
        audioStreamRef.current = null;
      }
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      setAudioLevel(0);
    };
  }, [isRecording]);

  // Cleanup audio URLs on component unmount
  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (outputUrl) URL.revokeObjectURL(outputUrl);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [audioUrl, outputUrl, previewUrl]);

  const handleGenerate = async () => {
    if (!audioFile) {
      toast({
        title: "Error",
        description: "Please upload or record an audio file first.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setError("");
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      // Validate file size (e.g., max 25MB)
      if (audioFile.size > 25 * 1024 * 1024) {
        throw new Error("Audio file size exceeds 25MB limit.");
      }

      // Transcribe the audio to text
      const formData = new FormData();
      formData.append("file", audioFile);

      const transcriptionResponse = await fetch("/api/openai/transcribe", {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });

      if (!transcriptionResponse.ok) {
        throw new Error("Failed to transcribe audio.");
      }

      const { text } = await transcriptionResponse.json();

      // Generate speech with the target voice
      let result;
      if (selectedModel === "openai") {
        result = await generateSpeech(text, targetVoice, speed);
      } else {
        result = await generateElevenLabsSpeech(text, targetVoice, stability, similarity, style);
      }

      setOutputUrl(result.audioUrl);
      toast({
        title: "Success",
        description: "Voice transformation completed successfully.",
      });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        toast({
          title: "Cancelled",
          description: "Voice transformation was cancelled.",
          variant: "default",
        });
      } else {
        console.error("Error in voice transformation:", error);
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to transform voice.",
          variant: "destructive",
        });
        setError(error instanceof Error ? error.message : "Failed to transform voice.");
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
      setIsProcessing(false);
      setUploadProgress(0);
      toast({
        title: "Cancelled",
        description: "Voice transformation process was cancelled.",
        variant: "default",
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ["audio/mpeg", "audio/wav", "audio/webm", "audio/mp3"];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Error",
        description: "Please upload a valid audio file (MP3, WAV, or WebM).",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (e.g., max 25MB)
    if (file.size > 25 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "Audio file size exceeds 25MB limit.",
        variant: "destructive",
      });
      return;
    }

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
    setIsRecording(false);
    setRecordedChunks([]);
    toast({
      title: "Reset",
      description: "All settings and audio have been reset.",
    });
  };

  const handlePreviewVoice = async () => {
    setError("");
    setPreviewUrl("");

    try {
      let blob: Blob;
      if (selectedModel === "openai") {
        const result = await generateSpeech("This is a preview of the selected voice.", targetVoice, speed);
        blob = await fetch(result.audioUrl).then((res) => res.blob());
      } else {
        const apiKey = process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY;
        if (!apiKey) {
          throw new Error("ElevenLabs API key not configured for preview.");
        }

        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${targetVoice}`, {
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
          throw new Error(errorData.detail?.message || "Failed to generate voice preview.");
        }

        blob = await response.blob();
      }

      if (previewUrl) URL.revokeObjectURL(previewUrl);
      const newPreviewUrl = URL.createObjectURL(blob);
      setPreviewUrl(newPreviewUrl);

      // Auto-play preview
      if (audioRef.current) {
        audioRef.current.src = newPreviewUrl;
        audioRef.current.play().catch((err) => {
          console.error("Failed to play preview:", err);
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load voice preview.");
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to load voice preview.",
        variant: "destructive",
      });
    }
  };

  const handleRecordClick = () => {
    if (isRecording && mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    } else {
      setIsRecording(true);
    }
  };

  const handleDeleteAudio = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioFile(null);
    setAudioUrl("");
    setOutputUrl("");
    setRecordedChunks([]);
    toast({
      title: "Audio Deleted",
      description: "The uploaded or recorded audio has been removed.",
    });
  };

  return (
    <TooltipProvider>
      <div className="flex flex-col items-center justify-center min-h-screen bg-background py-8 px-4">
        <Card className="w-full max-w-2xl shadow-xl border rounded-2xl">
          <CardHeader>
            <CardTitle>Voice Changer</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Model Selection */}
            <div className="flex flex-col gap-2">
              <label className="font-medium" htmlFor="model-select">
                AI Model
              </label>
              <Select value={selectedModel} onValueChange={(value) => setSelectedModel(value as "openai" | "elevenlabs")}>
                <SelectTrigger id="model-select" className="w-64">
                  <SelectValue placeholder="Select AI Model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="elevenlabs">ElevenLabs</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Upload or record audio */}
            <div className="flex flex-col gap-2">
              <label className="font-medium" htmlFor="audio-input">
                Upload or Record Audio
              </label>
              <div className="flex flex-col sm:flex-row gap-2 items-center">
                <Input
                  id="audio-input"
                  type="file"
                  accept="audio/mpeg,audio/wav,audio/webm"
                  onChange={handleFileChange}
                  disabled={isProcessing || isRecording}
                  className="w-full sm:w-auto"
                />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      onClick={handleRecordClick}
                      disabled={isProcessing}
                      className={isRecording ? "bg-red-100 text-red-700" : ""}
                      aria-label={isRecording ? "Stop Recording" : "Start Recording"}
                    >
                      <Mic className="h-5 w-5 mr-2" />
                      {isRecording ? "Stop Recording" : "Record"}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {isRecording ? "Stop recording audio" : "Start recording audio"}
                  </TooltipContent>
                </Tooltip>
                {isRecording && (
                  <div className="flex items-center ml-2">
                    <span className="h-3 w-3 rounded-full bg-red-500 animate-pulse mr-2" />
                    <span className="text-red-600 font-semibold">Recording…</span>
                  </div>
                )}
              </div>
              {isRecording && (
                <div className="w-full h-2 bg-gray-200 rounded mt-2">
                  <div
                    className="h-2 bg-red-500 rounded transition-all duration-100"
                    style={{ width: `${Math.round(audioLevel * 100)}%` }}
                  />
                </div>
              )}
              {uploadProgress > 0 && uploadProgress < 100 && (
                <Progress value={uploadProgress} className="w-full mt-2" />
              )}
              {audioUrl && (
                <div className="flex items-center gap-2 mt-2">
                  <audio controls src={audioUrl} className="w-full" aria-label="Uploaded or recorded audio" />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleDeleteAudio}
                        aria-label="Delete audio"
                      >
                        <Trash2 className="h-5 w-5 text-red-500" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Delete audio</TooltipContent>
                  </Tooltip>
                </div>
              )}
            </div>

            {/* Voice selection */}
            <div className="flex flex-col gap-2">
              <label className="font-medium" htmlFor="voice-select">
                Target Voice
              </label>
              <Select
                value={targetVoice}
                onValueChange={setTargetVoice}
                disabled={isLoadingVoices || isProcessing}
              >
                <SelectTrigger id="voice-select" className="w-64">
                  <div className="flex items-center gap-2">
                    {isLoadingVoices && <Loader2 className="h-4 w-4 animate-spin" />}
                    <SelectValue placeholder="Select Voice" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {selectedModel === "openai" ? (
                    openaiVoices.map((voice) => (
                      <SelectItem key={voice.id} value={voice.id}>
                        {voice.name}
                      </SelectItem>
                    ))
                  ) : isLoadingVoices ? (
                    <div className="flex items-center justify-center py-2">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      <span>Loading voices...</span>
                    </div>
                  ) : (
                    elevenLabsVoices.map((voice) => (
                      <SelectItem key={voice.voice_id} value={voice.voice_id}>
                        {voice.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                onClick={handlePreviewVoice}
                disabled={isLoadingVoices || isProcessing}
                className="mt-2 w-fit"
              >
                <Play className="h-5 w-5 mr-2" />
                Preview Voice
              </Button>
              {previewUrl && (
                <audio ref={audioRef} controls src={previewUrl} className="w-full mt-2" aria-label="Voice preview" />
              )}
            </div>

            {/* Settings sliders */}
            {selectedModel === "elevenlabs" && (
              <div className="flex flex-col gap-4">
                <div>
                  <div className="flex justify-between text-sm font-medium mb-1">
                    <span>Stability</span>
                    <span>{(stability * 100).toFixed(0)}%</span>
                  </div>
                  <Slider
                    min={0}
                    max={1}
                    step={0.01}
                    value={[stability]}
                    onValueChange={(v) => setStability(v[0])}
                    disabled={isProcessing}
                    aria-label="Stability slider"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-sm font-medium mb-1">
                    <span>Similarity</span>
                    <span>{(similarity * 100).toFixed(0)}%</span>
                  </div>
                  <Slider
                    min={0}
                    max={1}
                    step={0.01}
                    value={[similarity]}
                    onValueChange={(v) => setSimilarity(v[0])}
                    disabled={isProcessing}
                    aria-label="Similarity slider"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-sm font-medium mb-1">
                    <span>Style Exaggeration</span>
                    <span>{(style * 100).toFixed(0)}%</span>
                  </div>
                  <Slider
                    min={0}
                    max={1}
                    step={0.01}
                    value={[style]}
                    onValueChange={(v) => setStyle(v[0])}
                    disabled={isProcessing}
                    aria-label="Style exaggeration slider"
                  />
                </div>
              </div>
            )}
            {selectedModel === "openai" && (
              <div className="flex flex-col gap-4">
                <div>
                  <div className="flex justify-between text-sm font-medium mb-1">
                    <span>Speed</span>
                    <span>{speed.toFixed(2)}x</span>
                  </div>
                  <Slider
                    min={0.5}
                    max={2.0}
                    step={0.01}
                    value={[speed]}
                    onValueChange={(v) => setSpeed(v[0])}
                    disabled={isProcessing}
                    aria-label="Speed slider"
                  />
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-col gap-4 items-stretch">
            <div className="flex gap-2">
              <Button
                className="w-full flex items-center justify-center gap-2"
                onClick={handleGenerate}
                disabled={!audioUrl || isProcessing || isLoadingVoices}
                aria-label="Generate transformed audio"
              >
                {isProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Play className="h-5 w-5" />}
                Generate
              </Button>
              {isProcessing && (
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  className="w-fit"
                  aria-label="Cancel generation"
                >
                  Cancel
                </Button>
              )}
              <Button
                variant="outline"
                onClick={handleReset}
                disabled={isProcessing}
                className="w-fit"
                aria-label="Reset all settings"
              >
                <RotateCcw className="h-5 w-5 mr-2" />
                Reset
              </Button>
            </div>
            {outputUrl && (
              <div className="flex flex-col gap-2">
                <label className="font-medium" htmlFor="transformed-audio">
                  Transformed Audio
                </label>
                <audio
                  id="transformed-audio"
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
                    link.download = "voice-changed.wav";
                    link.click();
                  }}
                  aria-label="Download transformed audio"
                >
                  <Download className="h-5 w-5" />
                  Download
                </Button>
              </div>
            )}
          </CardFooter>
        </Card>
      </div>
    </TooltipProvider>
  );
}