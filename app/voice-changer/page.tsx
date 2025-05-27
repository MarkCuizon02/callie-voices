"use client";

import { useState, useRef, useEffect } from "react";
import { useState, useRef, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Download, Mic, Upload, Loader2, Play, Trash2 } from "lucide-react";
import { generateSpeech } from "@/lib/openai";
import { generateElevenLabsSpeech, getElevenLabsVoices } from "@/lib/elevenlabs";
import { toast } from "@/components/ui/use-toast";
import { Download, Mic, Loader2, Play, AlertCircle, RotateCcw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Voice {
  id: string;
  name: string;
}

// OpenAI voices
const openaiVoices = [
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
  const [selectedModel, setSelectedModel] = useState("openai");
  const [elevenLabsVoices, setElevenLabsVoices] = useState<Array<{ voice_id: string; name: string }>>([]);
  const [isLoadingVoices, setIsLoadingVoices] = useState(false);
  const [speed, setSpeed] = useState(1.0);
  const [error, setError] = useState<string>("");
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [voices, setVoices] = useState<Voice[]>(fallbackVoices);
  const [isLoadingVoices, setIsLoadingVoices] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [audioLevel, setAudioLevel] = useState(0);
  const audioLevelRef = useRef<number>(0);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Fetch ElevenLabs voices when model changes
  useEffect(() => {
    if (selectedModel === 'elevenlabs') {
      setIsLoadingVoices(true);
      getElevenLabsVoices()
        .then(voices => {
          setElevenLabsVoices(voices);
          if (voices.length > 0) {
            setTargetVoice(voices[0].voice_id);
          }
        })
        .catch(error => {
          toast({
            title: "Error",
            description: "Failed to load ElevenLabs voices. Please try again.",
            variant: "destructive",
          });
        })
        .finally(() => {
          setIsLoadingVoices(false);
        });
    } else if (selectedModel === 'openai') {
      setTargetVoice(openaiVoices[0].id);
    }
  }, [selectedModel]);

  // Handle recording logic
  useEffect(() => {
    if (!isRecording) {
      setAudioLevel(0);
      return;
    }
    let recorder: MediaRecorder;
    let stream: MediaStream;
    let audioContext: AudioContext;
    let analyser: AnalyserNode;
    let dataArray: Uint8Array;
    let rafId: number;
    // Choose the most compatible MIME type
    let mimeType = '';
    if (window.MediaRecorder && MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
      mimeType = 'audio/webm;codecs=opus';
    } else if (window.MediaRecorder && MediaRecorder.isTypeSupported('audio/webm')) {
      mimeType = 'audio/webm';
    } else if (window.MediaRecorder && MediaRecorder.isTypeSupported('audio/wav')) {
      mimeType = 'audio/wav';
    } else {
      mimeType = '';
    }
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioStreamRef.current = stream;
        recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
        setMediaRecorder(recorder);
        setRecordedChunks([]);
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) setRecordedChunks((prev) => [...prev, e.data]);
        };
        recorder.onstop = () => {
          stream.getTracks().forEach((track) => track.stop());
          audioStreamRef.current = null;
          if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close();
            audioContextRef.current = null;
          }
          // Use the correct extension and type for the file
          let extension = 'webm';
          let type = mimeType || 'audio/webm';
          if (type.includes('wav')) extension = 'wav';
          const blob = new Blob(recordedChunks, { type });
          const file = new File([blob], `recording.${extension}`, { type });
          setAudioFile(file);
          setAudioUrl(URL.createObjectURL(blob));
          setOutputUrl("");
        };
        recorder.start();
        // Audio level visualization
        audioContext = new AudioContext();
        audioContextRef.current = audioContext;
        const source = audioContext.createMediaStreamSource(stream);
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        dataArray = new Uint8Array(analyser.frequencyBinCount);
        source.connect(analyser);
        const updateLevel = () => {
          analyser.getByteTimeDomainData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            const val = (dataArray[i] - 128) / 128;
            sum += val * val;
          }
          const rms = Math.sqrt(sum / dataArray.length);
          const level = Math.min(1, rms * 2);
          setAudioLevel(level);
          rafId = requestAnimationFrame(updateLevel);
        };
        updateLevel();
      } catch (err) {
        toast({ title: "Error", description: "Microphone access denied or unavailable.", variant: "destructive" });
        setIsRecording(false);
      }
    })();
    return () => {
      if (recorder && recorder.state !== 'inactive') recorder.stop();
      if (stream) stream.getTracks().forEach((track) => track.stop());
      if (rafId) cancelAnimationFrame(rafId);
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      setAudioLevel(0);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRecording]);

  const handleGenerate = async () => {
    if (!audioFile) {
      toast({
        title: "Error",
        description: "Please upload an audio file first",
        variant: "destructive",
      });
      return;
    }

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
    try {
      // First, transcribe the audio to text
      const formData = new FormData();
      formData.append('file', audioFile);

      const transcriptionResponse = await fetch('/api/openai/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!transcriptionResponse.ok) {
        throw new Error('Failed to transcribe audio');
      }

      const { text } = await transcriptionResponse.json();

      // Then, generate speech with the target voice
      let result;
      if (selectedModel === 'openai') {
        result = await generateSpeech(text, targetVoice, speed);
      } else {
        result = await generateElevenLabsSpeech(
          text,
          targetVoice,
          stability,
          similarity,
          style
        );
      }

      setOutputUrl(result.audioUrl);
      toast({
        title: "Success",
        description: "Voice transformation completed successfully",
      });
    } catch (error) {
      console.error('Error in voice transformation:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to transform voice",
        variant: "destructive",
      });
    } finally {
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
    }
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

  const handleRecordClick = () => {
    if (isRecording && mediaRecorder) {
      mediaRecorder.stop();
      setIsRecording(false);
    } else {
      setIsRecording(true);
    }
  };

  const handleDeleteAudio = () => {
    setAudioFile(null);
    setAudioUrl("");
    setOutputUrl("");
    setRecordedChunks([]);
  };

  const handleRecordClick = () => {
    if (isRecording && mediaRecorder) {
      mediaRecorder.stop();
      setIsRecording(false);
    } else {
      setIsRecording(true);
    }
  };

  const handleDeleteAudio = () => {
    setAudioFile(null);
    setAudioUrl("");
    setOutputUrl("");
    setRecordedChunks([]);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background py-8 px-2">
      <Card className="w-full max-w-2xl shadow-xl border rounded-2xl">
        <CardHeader>
          <CardTitle>Voice Changer</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {/* Model Selection */}
          <div className="flex flex-col gap-2">
            <label className="font-medium">AI Model</label>
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger className="w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openai">OpenAI</SelectItem>
                <SelectItem value="elevenlabs">ElevenLabs</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Upload or record audio */}
          <div className="flex flex-col gap-2">
            <label className="font-medium">Upload or Record Audio</label>
            <div className="flex gap-2 items-center">
              <Input type="file" accept="audio/*" onChange={handleFileChange} />
              <Button
                variant="outline"
                type="button"
                onClick={handleRecordClick}
                disabled={isProcessing}
                className={isRecording ? "bg-red-100 text-red-700" : ""}
              >
                <Mic className="h-5 w-5 mr-2" /> {isRecording ? "Stop Recording" : "Record"}
              </Button>
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
                  className="h-2 bg-red-500 rounded"
                  style={{ width: `${Math.round(audioLevel * 100)}%`, transition: 'width 0.1s' }}
                />
              </div>
            )}
            {audioUrl && (
              <div className="flex items-center gap-2 mt-2">
                <audio controls src={audioUrl} className="w-full" />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleDeleteAudio}
                  title="Delete audio"
                >
                  <Trash2 className="h-5 w-5 text-red-500" />
                </Button>
              </div>
            )}
          </div>

          {/* Voice selection */}
          <div className="flex flex-col gap-2">
            <label className="font-medium">Target Voice</label>
            <Select value={targetVoice} onValueChange={setTargetVoice} disabled={isLoadingVoices}>
              <SelectTrigger className="w-64">
                <div className="flex items-center gap-2">
                  {isLoadingVoices && <Loader2 className="h-4 w-4 animate-spin" />}
                  <SelectValue />
                </div>
              </SelectTrigger>
              <SelectContent>
                {selectedModel === 'openai' ? (
                  openaiVoices.map((voice) => (
                    <SelectItem key={voice.id} value={voice.id}>{voice.name}</SelectItem>
                  ))
                ) : (
                  isLoadingVoices ? (
                    <div className="flex items-center justify-center py-2">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      <span>Loading voices...</span>
                    </div>
                  ) : (
                    elevenLabsVoices.map((voice) => (
                      <SelectItem key={voice.voice_id} value={voice.voice_id}>{voice.name}</SelectItem>
                    ))
                  )
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Settings sliders - only show for ElevenLabs */}
          {selectedModel === 'elevenlabs' && (
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
          )}
          {/* Speed slider for OpenAI */}
          {selectedModel === 'openai' && (
            <div className="flex flex-col gap-4">
              <div>
                <div className="flex justify-between text-sm font-medium mb-1">
                  <span>Speed</span>
                  <span>{speed.toFixed(2)}x</span>
                </div>
                <Slider min={0.5} max={2.0} step={0.01} value={[speed]} onValueChange={v => setSpeed(v[0])} />
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-4 items-stretch">
          <Button
            className="w-full flex items-center justify-center gap-2"
            onClick={handleGenerate}
            disabled={!audioUrl || isProcessing || isLoadingVoices}
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