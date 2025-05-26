"use client";

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

// OpenAI voices
const openaiVoices = [
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
  const [selectedModel, setSelectedModel] = useState("openai");
  const [elevenLabsVoices, setElevenLabsVoices] = useState<Array<{ voice_id: string; name: string }>>([]);
  const [isLoadingVoices, setIsLoadingVoices] = useState(false);
  const [speed, setSpeed] = useState(1.0);
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
      setIsProcessing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAudioFile(file);
      setAudioUrl(URL.createObjectURL(file));
      setOutputUrl("");
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
  );
} 