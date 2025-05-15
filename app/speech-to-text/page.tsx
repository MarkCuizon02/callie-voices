"use client";

import { useState, useRef, useEffect } from "react";
import OpenAI from "openai";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VoiceRecorder } from "@/components/voice-recorder";
import { Waveform } from "@/components/ui/waveform";
import { toast } from "@/components/ui/use-toast";
import { Mic, Download, Trash2, Copy, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
});

interface Transcription {
  content: string;
  audioUrl: string;
  timestamp: string;
  id: string;
}

async function transcribeSpeech(audioBlob: Blob, retries: number = 3): Promise<string> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const audioFile = new File([audioBlob], "recording.webm", { type: audioBlob.type });
      const response = await openai.audio.transcriptions.create({
        file: audioFile,
        model: "whisper-1",
      });
      return response.text;
    } catch (error) {
      console.error(`Transcription attempt ${attempt} failed:`, error);
      if (attempt === retries) {
        throw new Error("Failed to transcribe audio after multiple attempts");
      }
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
  return "";
}

export default function SpeechToText() {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [transcriptions, setTranscriptions] = useState<Transcription[]>([]);
  const [audioUrl, setAudioUrl] = useState<string>("");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (audioUrl && audioRef.current) {
      audioRef.current.play().catch((error) => {
        console.error("Auto-play error:", error);
        toast({
          title: "Auto-Play Failed",
          description: "Browser restrictions prevented audio playback.",
          variant: "destructive",
        });
      });
    }
  }, [audioUrl]);

  const generateId = () => crypto.randomUUID();

  const handleRecordingComplete = async (audioBlob: Blob) => {
    setIsProcessing(true);
    try {
      const audioUrl = URL.createObjectURL(audioBlob);
      setAudioUrl(audioUrl);

      const transcription = await transcribeSpeech(audioBlob);
      if (!transcription) throw new Error("Transcription failed");

      const newTranscription: Transcription = {
        content: transcription,
        audioUrl,
        timestamp: new Date().toISOString(),
        id: generateId(),
      };
      setTranscriptions((prev) => [...prev, newTranscription]);

      toast({ title: "Success", description: "Audio transcribed successfully." });
    } catch (error) {
      console.error("Error processing recording:", error);
      toast({
        title: "Error",
        description: "Failed to transcribe audio. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !["audio/mp3", "audio/wav", "audio/webm"].includes(file.type)) {
      toast({
        title: "Invalid File",
        description: "Please upload an MP3, WAV, or WebM audio file.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      const audioUrl = URL.createObjectURL(file);
      setAudioUrl(audioUrl);

      const transcription = await transcribeSpeech(file);
      if (!transcription) throw new Error("Transcription failed");

      const newTranscription: Transcription = {
        content: transcription,
        audioUrl,
        timestamp: new Date().toISOString(),
        id: generateId(),
      };
      setTranscriptions((prev) => [...prev, newTranscription]);

      toast({ title: "Success", description: "Audio file transcribed successfully." });
    } catch (error) {
      console.error("Error processing file:", error);
      toast({
        title: "Error",
        description: "Failed to transcribe audio file. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadAudio = (audioUrl: string, filename: string) => {
    const link = document.createElement("a");
    link.href = audioUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadText = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = (content: string) => {
    navigator.clipboard.writeText(content).then(() => {
      toast({ title: "Copied", description: "Transcription copied to clipboard." });
    }).catch(() => {
      toast({
        title: "Error",
        description: "Failed to copy transcription.",
        variant: "destructive",
      });
    });
  };

  const deleteTranscription = (id: string, audioUrl: string) => {
    URL.revokeObjectURL(audioUrl);
    setTranscriptions((prev) => prev.filter((t) => t.id !== id));
    if (audioUrl === audioUrl) setAudioUrl("");
    toast({ title: "Deleted", description: "Transcription removed." });
  };

  const clearTranscriptions = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    transcriptions.forEach((t) => URL.revokeObjectURL(t.audioUrl));
    setTranscriptions([]);
    setAudioUrl("");
    toast({ title: "History Cleared", description: "All transcriptions and audio have been reset." });
  };

  const getWordCount = (text: string): number => {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  };

  return (
    <main className="container max-w-4xl mx-auto py-10 px-4 sm:px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-8"
      >
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-2">Speech-to-Text Converter</h1>
          <p className="text-muted-foreground">Record or upload audio to instantly transcribe into text</p>
        </div>

        <Card className="border-2 border-primary/20">
          <CardHeader>
            <CardTitle>Record or Upload Audio</CardTitle>
            <CardDescription>Capture live audio or upload an audio file to transcribe</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col items-center gap-4">
              {isProcessing ? (
                <Button disabled className="bg-primary/80">
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </Button>
              ) : (
                <VoiceRecorder
                  onRecordingComplete={handleRecordingComplete}
                  isProcessing={isProcessing}
                  aria-label="Record audio for transcription"
                  className={cn(
                    "transition-all duration-300",
                    isRecording && "ring-2 ring-primary animate-pulse"
                  )}
                />
              )}
              <div className="w-full max-w-md">
                <Label htmlFor="audio-upload" className="text-sm font-medium">Upload Audio File</Label>
                <Input
                  id="audio-upload"
                  type="file"
                  accept="audio/mp3,audio/wav,audio/webm"
                  onChange={handleFileUpload}
                  disabled={isProcessing}
                  aria-label="Upload audio file for transcription"
                  className="mt-1"
                />
              </div>
            </div>
            {audioUrl && (
              <div className="w-full mt-6 p-4 bg-muted rounded-lg">
                <audio ref={audioRef} src={audioUrl} hidden />
                <Waveform
                  audioUrl={audioUrl}
                  waveColor="hsl(var(--primary))"
                  progressColor="hsl(var(--primary) / 0.7)"
                />
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">
                    Latest Transcription ({getWordCount(transcriptions[transcriptions.length - 1]?.content || "")} words)
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(transcriptions[transcriptions.length - 1]?.content || "")}
                    aria-label="Copy latest transcription"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="mt-2 text-sm">{transcriptions[transcriptions.length - 1]?.content}</p>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex gap-2">
            {audioUrl && (
              <Button
                variant="outline"
                onClick={() => downloadAudio(audioUrl, "recorded-audio.mp3")}
                aria-label="Download recorded audio"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Audio
              </Button>
            )}
            {transcriptions.length > 0 && (
              <Button
                variant="outline"
                onClick={() => downloadText(transcriptions[transcriptions.length - 1].content, "transcription.txt")}
                aria-label="Download transcription text"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Text
              </Button>
            )}
          </CardFooter>
        </Card>

        {transcriptions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Mic className="h-5 w-5" />
                  Transcription History
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearTranscriptions}
                  aria-label="Clear transcription history"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <AnimatePresence>
                {transcriptions.map((transcription) => (
                  <motion.div
                    key={transcription.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                    className="p-4 rounded-md bg-muted"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium">
                        Transcription ({getWordCount(transcription.content)} words)
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(transcription.content)}
                          aria-label="Copy transcription"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteTranscription(transcription.id, transcription.audioUrl)}
                          aria-label="Delete transcription"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {new Date(transcription.timestamp).toLocaleString()}
                    </p>
                    <p className="text-sm">{transcription.content}</p>
                    <div className="flex gap-2 mt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadAudio(transcription.audioUrl, `audio-${transcription.id}.mp3`)}
                        aria-label="Download transcription audio"
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Audio
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadText(transcription.content, `transcription-${transcription.id}.txt`)}
                        aria-label="Download transcription text"
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Text
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </CardContent>
          </Card>
        )}
      </motion.div>
    </main>
  );
}