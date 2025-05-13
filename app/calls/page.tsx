import React from "react";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, Phone, PhoneCall, PhoneOff } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CallStatus } from "@/lib/types";
import { motion } from "framer-motion";
import { formatPhoneNumber } from "@/lib/utils";

// Mock function to initiate call (would use Twilio API in production)
const initiateCall = async (phoneNumber: string, script: string) => {
  // This would be an API call to your backend which then uses Twilio
  console.log(`Initiating call to ${phoneNumber} with script: ${script}`);
  
  // For demo purposes, we'll simulate a call status progression
  return { callId: "call-" + Date.now().toString() };
};

export default function CallsPage() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [callId, setCallId] = useState<string | null>(null);
  const [callStatus, setCallStatus] = useState<CallStatus>(CallStatus.IDLE);
  const [callDuration, setCallDuration] = useState(0);
  const [callScript, setCallScript] = useState("");
  const [scriptType, setScriptType] = useState("prompt");
  const [selectedVoice, setSelectedVoice] = useState("nova");
  
  const startCall = async () => {
    if (!phoneNumber) return;
    
    setCallStatus(CallStatus.CONNECTING);
    
    try {
      const { callId } = await initiateCall(phoneNumber, callScript);
      setCallId(callId);
      
      // For demo purposes, we'll simulate the call process
      setTimeout(() => {
        setCallStatus(CallStatus.ACTIVE);
        
        // Simulate a call duration timer
        const intervalId = setInterval(() => {
          setCallDuration(prev => prev + 1);
        }, 1000);
        
        // Simulate call ending after 20 seconds
        setTimeout(() => {
          clearInterval(intervalId);
          setCallStatus(CallStatus.COMPLETED);
        }, 20000);
      }, 3000);
    } catch (error) {
      console.error("Error initiating call:", error);
      setCallStatus(CallStatus.FAILED);
    }
  };
  
  const endCall = () => {
    // In production, this would call the Twilio API to end the call
    setCallStatus(CallStatus.COMPLETED);
  };
  
  const resetCall = () => {
    setCallId(null);
    setCallStatus(CallStatus.IDLE);
    setCallDuration(0);
  };
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const secs = (seconds % 60).toString().padStart(2, "0");
    return `${mins}:${secs}`;
  };

  return (
    <main className="container max-w-4xl mx-auto py-10 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-4xl font-bold text-center mb-2">Phone Calls</h1>
        <p className="text-center text-muted-foreground mb-8">
          Make automated AI calls with natural voice
        </p>
        
        <div className="grid md:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle>Call Settings</CardTitle>
              <CardDescription>
                Configure your outbound call
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  disabled={callStatus !== CallStatus.IDLE}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="voice">AI Voice</Label>
                <Select 
                  value={selectedVoice} 
                  onValueChange={setSelectedVoice}
                  disabled={callStatus !== CallStatus.IDLE}
                >
                  <SelectTrigger id="voice">
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
              
              <div className="space-y-2 pt-2">
                <Label>Script Type</Label>
                <RadioGroup 
                  value={scriptType} 
                  onValueChange={setScriptType}
                  className="flex space-x-4"
                  disabled={callStatus !== CallStatus.IDLE}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="prompt" id="prompt" />
                    <Label htmlFor="prompt">AI Prompt</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="script" id="script" />
                    <Label htmlFor="script">Exact Script</Label>
                  </div>
                </RadioGroup>
              </div>
              
              <div className="space-y-2 pt-2">
                <Label htmlFor="script">
                  {scriptType === "prompt" ? "AI Prompt" : "Call Script"}
                </Label>
                <Textarea
                  id="script"
                  placeholder={
                    scriptType === "prompt"
                      ? "Enter instructions for the AI (e.g., 'Call to confirm appointment for tomorrow at 2pm')"
                      : "Enter the exact script for the AI to read"
                  }
                  className="min-h-[120px]"
                  value={callScript}
                  onChange={(e) => setCallScript(e.target.value)}
                  disabled={callStatus !== CallStatus.IDLE}
                />
                {scriptType === "prompt" && (
                  <p className="text-xs text-muted-foreground">
                    The AI will generate natural conversation based on your instructions
                  </p>
                )}
              </div>
            </CardContent>
            <CardFooter>
              {callStatus === CallStatus.IDLE && (
                <Button 
                  className="w-full" 
                  onClick={startCall}
                  disabled={!phoneNumber || !callScript}
                >
                  <Phone className="mr-2 h-4 w-4" />
                  Start Call
                </Button>
              )}
              
              {callStatus === CallStatus.COMPLETED && (
                <Button 
                  className="w-full" 
                  onClick={resetCall}
                >
                  New Call
                </Button>
              )}
              
              {callStatus === CallStatus.FAILED && (
                <Button 
                  className="w-full" 
                  onClick={resetCall}
                  variant="destructive"
                >
                  Try Again
                </Button>
              )}
            </CardFooter>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Call Status</CardTitle>
              <CardDescription>
                Monitor your current call
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center min-h-[300px]">
              {callStatus === CallStatus.IDLE && !callId && (
                <div className="text-center text-muted-foreground">
                  <Phone className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                  <p>Configure call settings and press Start Call</p>
                </div>
              )}
              
              {callStatus === CallStatus.CONNECTING && (
                <div className="text-center">
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className="relative mx-auto mb-4"
                  >
                    <div className="absolute -inset-4 rounded-full bg-primary/20 animate-pulse" />
                    <PhoneCall className="h-16 w-16 text-primary" />
                  </motion.div>
                  <h3 className="text-xl font-semibold mb-2">Connecting</h3>
                  <p className="text-muted-foreground">
                    Establishing connection to {formatPhoneNumber(phoneNumber)}
                  </p>
                </div>
              )}
              
              {callStatus === CallStatus.ACTIVE && (
                <div className="text-center">
                  <motion.div
                    animate={{ rotate: [0, 5, 0, -5, 0] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="mx-auto mb-4"
                  >
                    <PhoneCall className="h-16 w-16 text-green-500" />
                  </motion.div>
                  <h3 className="text-xl font-semibold mb-2">Call Active</h3>
                  <p className="text-muted-foreground mb-2">
                    Connected to {formatPhoneNumber(phoneNumber)}
                  </p>
                  <div className="text-2xl font-mono">{formatTime(callDuration)}</div>
                  <Button 
                    variant="destructive"
                    size="sm"
                    className="mt-6"
                    onClick={endCall}
                  >
                    <PhoneOff className="mr-2 h-4 w-4" />
                    End Call
                  </Button>
                </div>
              )}
              
              {callStatus === CallStatus.COMPLETED && (
                <div className="text-center">
                  <Phone className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-xl font-semibold mb-2">Call Completed</h3>
                  <p className="text-muted-foreground mb-2">
                    Call to {formatPhoneNumber(phoneNumber)} has ended
                  </p>
                  <p className="text-lg font-mono">Duration: {formatTime(callDuration)}</p>
                </div>
              )}
              
              {callStatus === CallStatus.FAILED && (
                <div className="text-center">
                  <AlertCircle className="h-16 w-16 mx-auto mb-4 text-destructive" />
                  <h3 className="text-xl font-semibold mb-2 text-destructive">Call Failed</h3>
                  <p className="text-muted-foreground">
                    Could not connect to {formatPhoneNumber(phoneNumber)}
                  </p>
                </div>
              )}
            </CardContent>
            <CardFooter>
              {callStatus === CallStatus.CONNECTING && (
                <Alert className="w-full">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    This is a simulation. No actual call is being made.
                  </AlertDescription>
                </Alert>
              )}
            </CardFooter>
          </Card>
        </div>
        
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Tips for Effective AI Calls</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 list-disc pl-5">
              <li>Keep instructions clear and specific when using AI prompts</li>
              <li>Use a casual, conversational tone for more natural-sounding calls</li>
              <li>Test your script with the voice preview feature before making calls</li>
              <li>Include pauses in your script with commas or ellipses for better pacing</li>
              <li>For appointment reminders, always include specific dates and times</li>
            </ul>
          </CardContent>
        </Card>
      </motion.div>
    </main>
  );
}