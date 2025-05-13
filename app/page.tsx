"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VoiceRecorder } from "@/components/voice-recorder";
import { Waveform } from "@/components/ui/waveform";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { transcribeSpeech, generateSpeech, chatWithAI } from "@/lib/openai";
import { Mic, Speaker, Bot, ArrowRight, Download } from "lucide-react";
import { motion } from "framer-motion";

export default function Home() {
  const [activeTab, setActiveTab] = useState("voice-chat");
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [userMessage, setUserMessage] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [userAudioUrl, setUserAudioUrl] = useState("");
  const [aiAudioUrl, setAiAudioUrl] = useState("");
  const [selectedVoice, setSelectedVoice] = useState("alloy");
  const [voiceSpeed, setVoiceSpeed] = useState(1.0);
  const [voiceBrief, setVoiceBrief] = useState("");

  const handleRecordingComplete = async (audioBlob: Blob) => {
    setIsProcessing(true);
    try {
      // Create local URL for the recording
      const audioUrl = URL.createObjectURL(audioBlob);
      setUserAudioUrl(audioUrl);
      
      // Transcribe the speech
      const transcription = await transcribeSpeech(audioBlob);
      setUserMessage(transcription);
      
      // Get AI response
      const response = await chatWithAI([{ role: 'user', content: transcription }]);
      setAiResponse(response);
      
      // Generate speech from response
      const { audioUrl: aiAudio } = await generateSpeech(response, selectedVoice, voiceSpeed);
      setAiAudioUrl(aiAudio);
      
      // Set voice brief if first interaction
      if (!voiceBrief) {
        setVoiceBrief("Brief automatic summary of how this voice can help");
      }
    } catch (error) {
      console.error("Error processing recording:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadAudio = () => {
    if (aiAudioUrl) {
      const link = document.createElement("a");
      link.href = aiAudioUrl;
      link.download = "ai-response.mp3";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <main className="container max-w-4xl mx-auto py-10 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-4xl font-bold text-center mb-2">Voice AI Platform</h1>
        <p className="text-center text-muted-foreground mb-8">
          Speak naturally. Get voice responses.
        </p>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-2 w-full max-w-md mx-auto mb-8">
            <TabsTrigger value="voice-chat" className="flex items-center gap-2">
              <Mic className="h-4 w-4" />
              <span>Voice Chat</span>
            </TabsTrigger>
            <TabsTrigger value="voice-settings" className="flex items-center gap-2">
              <Speaker className="h-4 w-4" />
              <span>Voice Settings</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="voice-chat" className="space-y-8">
            <div className="grid md:grid-cols-2 gap-8">
              <Card>
                <CardHeader>
                  <CardTitle>You</CardTitle>
                  <CardDescription>
                    Record your message
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center pt-6 pb-8">
                  <VoiceRecorder 
                    onRecordingComplete={handleRecordingComplete}
                    isProcessing={isProcessing}
                  />
                  
                  {userAudioUrl && (
                    <div className="w-full mt-6">
                      <Waveform 
                        audioUrl={userAudioUrl}
                        waveColor="hsl(var(--primary))"
                        progressColor="hsl(var(--primary) / 0.7)"
                      />
                      <p className="mt-3 text-sm text-center">
                        {userMessage}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>AI Response</CardTitle>
                  <CardDescription>
                    Generated voice reply
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center min-h-[200px]">
                  {aiAudioUrl ? (
                    <>
                      <Bot className="h-12 w-12 text-primary mb-4" />
                      <Waveform 
                        audioUrl={aiAudioUrl}
                        waveColor="hsl(var(--chart-2))"
                        progressColor="hsl(var(--chart-2) / 0.7)"
                        className="w-full"
                      />
                      <p className="mt-3 text-sm">
                        {aiResponse}
                      </p>
                    </>
                  ) : (
                    <div className="text-center text-muted-foreground">
                      <Bot className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                      <p>Record a message to get an AI response</p>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex justify-center">
                  {aiAudioUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2"
                      onClick={downloadAudio}
                    >
                      <Download className="h-4 w-4" />
                      <span>Download Response</span>
                    </Button>
                  )}
                </CardFooter>
              </Card>
            </div>
            
            {voiceBrief && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bot className="h-5 w-5" />
                    <span>Voice Assistant</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{voiceBrief}</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value="voice-settings">
            <Card>
              <CardHeader>
                <CardTitle>Voice Customization</CardTitle>
                <CardDescription>
                  Adjust how the AI voice sounds
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="voice-model">Voice</Label>
                  <Select value={selectedVoice} onValueChange={setSelectedVoice}>
                    <SelectTrigger id="voice-model">
                      <SelectValue placeholder="Select a voice" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="alloy">Alloy (Balanced)</SelectItem>
                      <SelectItem value="echo">Echo (Baritone)</SelectItem>
                      <SelectItem value="fable">Fable (Warm)</SelectItem>
                      <SelectItem value="onyx">Onyx (Deep)</SelectItem>
                      <SelectItem value="nova">Nova (Friendly)</SelectItem>
                      <SelectItem value="shimmer">Shimmer (Bright)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="speed">Speech Speed: {voiceSpeed.toFixed(1)}x</Label>
                  </div>
                  <Slider
                    id="speed"
                    min={0.5}
                    max={2.0}
                    step={0.1}
                    value={[voiceSpeed]}
                    onValueChange={(values) => setVoiceSpeed(values[0])}
                  />
                </div>
                
                <div className="pt-4">
                  <Button 
                    className="w-full" 
                    onClick={() => {
                      // Preview voice with current settings
                      if (aiResponse) {
                        generateSpeech(aiResponse, selectedVoice, voiceSpeed)
                          .then(({ audioUrl }) => {
                            setAiAudioUrl(audioUrl);
                          })
                          .catch(console.error);
                      } else {
                        generateSpeech("Hello, this is a preview of how I sound with the current settings.", selectedVoice, voiceSpeed)
                          .then(({ audioUrl }) => {
                            setAiAudioUrl(audioUrl);
                          })
                          .catch(console.error);
                      }
                    }}
                  >
                    Preview Voice
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
    </main>
  );
}