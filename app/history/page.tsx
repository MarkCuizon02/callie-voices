"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Waveform } from "@/components/ui/waveform";
import { format } from "date-fns";
import { ChevronDown, ChevronUp, Phone, Search, Mic, Calendar, Download } from "lucide-react";
import { CallStatus } from "@/lib/types";
import { formatPhoneNumber, formatDuration } from "@/lib/utils";
import { motion } from "framer-motion";

// Mock data for demonstration
const voiceHistory = [
  {
    id: "msg1",
    date: new Date(2025, 3, 1, 14, 32),
    userMessage: "What's the weather forecast for San Francisco tomorrow?",
    aiResponse: "Tomorrow in San Francisco will be sunny with temperatures between 65°F and 72°F. There's a light breeze expected in the afternoon.",
    audioUrl: "https://example.com/audio1.mp3"
  },
  {
    id: "msg2",
    date: new Date(2025, 3, 1, 10, 15),
    userMessage: "Can you summarize the latest tech news?",
    aiResponse: "The latest tech news includes Apple announcing their new AR glasses, Tesla releasing a software update for autonomous driving, and Google launching a new AI research center in Tokyo.",
    audioUrl: "https://example.com/audio2.mp3"
  },
  {
    id: "msg3",
    date: new Date(2025, 2, 28, 16, 45),
    userMessage: "What's a good recipe for dinner tonight?",
    aiResponse: "How about a quick pasta primavera? You'll need pasta, seasonal vegetables like bell peppers, zucchini, and cherry tomatoes, olive oil, garlic, and parmesan cheese. Sauté the veggies, cook the pasta, combine with some pasta water and cheese.",
    audioUrl: "https://example.com/audio3.mp3"
  }
];

const callHistory = [
  {
    id: "call1",
    phoneNumber: "+12125551234",
    date: new Date(2025, 3, 1, 9, 30),
    duration: 142,
    status: CallStatus.COMPLETED,
    transcript: "Hello, this is a reminder about your appointment tomorrow at 2:00 PM with Dr. Smith. Please arrive 15 minutes early to complete paperwork. Would you like to confirm this appointment?",
    recording: "https://example.com/recording1.mp3"
  },
  {
    id: "call2",
    phoneNumber: "+13105557890",
    date: new Date(2025, 2, 29, 11, 15),
    duration: 98,
    status: CallStatus.COMPLETED,
    transcript: "Hi, I'm calling to inform you that your order #12345 has been shipped and will arrive on Tuesday. You can track your package using the link sent to your email. Do you have any questions about your order?",
    recording: "https://example.com/recording2.mp3"
  },
  {
    id: "call3",
    phoneNumber: "+14155559876",
    date: new Date(2025, 2, 28, 15, 45),
    duration: 0,
    status: CallStatus.FAILED,
    transcript: "",
    recording: ""
  }
];

export default function HistoryPage() {
  const [activeTab, setActiveTab] = useState("voice-chat");
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedVoiceItem, setExpandedVoiceItem] = useState<string | null>(null);
  const [expandedCallItem, setExpandedCallItem] = useState<string | null>(null);
  
  const toggleVoiceItem = (id: string) => {
    setExpandedVoiceItem(expandedVoiceItem === id ? null : id);
  };
  
  const toggleCallItem = (id: string) => {
    setExpandedCallItem(expandedCallItem === id ? null : id);
  };
  
  // Filter history items based on search term
  const filteredVoiceHistory = voiceHistory.filter(item => 
    item.userMessage.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.aiResponse.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const filteredCallHistory = callHistory.filter(item => 
    item.phoneNumber.includes(searchTerm) ||
    (item.transcript && item.transcript.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <main className="container max-w-4xl mx-auto py-10 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-4xl font-bold text-center mb-2">History</h1>
        <p className="text-center text-muted-foreground mb-8">
          View your past voice interactions and calls
        </p>
        
        <div className="flex items-center mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search history..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-2 w-full max-w-md mx-auto mb-8">
            <TabsTrigger value="voice-chat" className="flex items-center gap-2">
              <Mic className="h-4 w-4" />
              <span>Voice Chats</span>
            </TabsTrigger>
            <TabsTrigger value="calls" className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              <span>Phone Calls</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="voice-chat">
            {filteredVoiceHistory.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <Mic className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">
                    {searchTerm ? "No matching voice chats found" : "No voice chat history yet"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredVoiceHistory.map((item) => (
                  <Card key={item.id} className="overflow-hidden">
                    <CardHeader className="py-4 cursor-pointer" onClick={() => toggleVoiceItem(item.id)}>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <Mic className="h-5 w-5 text-primary" />
                          <div>
                            <CardTitle className="text-base">
                              {item.userMessage.length > 50
                                ? item.userMessage.substring(0, 50) + "..."
                                : item.userMessage}
                            </CardTitle>
                            <CardDescription>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-3 w-3" />
                                <span>{format(item.date, "MMM d, yyyy - h:mm a")}</span>
                              </div>
                            </CardDescription>
                          </div>
                        </div>
                        {expandedVoiceItem === item.id ? (
                          <ChevronUp className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                    </CardHeader>
                    
                    {expandedVoiceItem === item.id && (
                      <CardContent className="pt-0 pb-4">
                        <div className="space-y-4">
                          <div>
                            <h4 className="text-sm font-medium mb-1">Your Message</h4>
                            <p className="text-sm text-muted-foreground mb-2">{item.userMessage}</p>
                            <div className="rounded-md bg-muted p-2">
                              <Waveform
                                audioUrl={item.audioUrl}
                                waveColor="hsl(var(--primary))"
                                progressColor="hsl(var(--primary) / 0.7)"
                              />
                            </div>
                          </div>
                          
                          <div>
                            <h4 className="text-sm font-medium mb-1">AI Response</h4>
                            <p className="text-sm text-muted-foreground mb-2">{item.aiResponse}</p>
                            <div className="rounded-md bg-muted p-2">
                              <Waveform
                                audioUrl={item.audioUrl} // Using same URL for demo purposes
                                waveColor="hsl(var(--chart-2))"
                                progressColor="hsl(var(--chart-2) / 0.7)"
                              />
                            </div>
                          </div>
                          
                          <div className="flex justify-end">
                            <Button variant="outline" size="sm" className="flex items-center gap-2">
                              <Download className="h-4 w-4" />
                              <span>Download</span>
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="calls">
            {filteredCallHistory.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <Phone className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">
                    {searchTerm ? "No matching calls found" : "No call history yet"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Call History</CardTitle>
                  <CardDescription>Your recent phone calls</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Phone Number</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCallHistory.map((call) => (
                        <React.Fragment key={call.id}>
                          <TableRow className="cursor-pointer" onClick={() => toggleCallItem(call.id)}>
                            <TableCell>{formatPhoneNumber(call.phoneNumber)}</TableCell>
                            <TableCell>{format(call.date, "MMM d, yyyy - h:mm a")}</TableCell>
                            <TableCell>
                              {call.duration > 0 ? formatDuration(call.duration) : "—"}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  call.status === CallStatus.COMPLETED
                                    ? "outline"
                                    : call.status === CallStatus.FAILED
                                    ? "destructive"
                                    : "secondary"
                                }
                              >
                                {call.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {expandedCallItem === call.id ? (
                                <ChevronUp className="h-5 w-5 text-muted-foreground" />
                              ) : (
                                <ChevronDown className="h-5 w-5 text-muted-foreground" />
                              )}
                            </TableCell>
                          </TableRow>
                          
                          {expandedCallItem === call.id && call.status === CallStatus.COMPLETED && (
                            <TableRow>
                              <TableCell colSpan={5} className="p-0">
                                <div className="bg-muted/50 p-4 space-y-4">
                                  <div>
                                    <h4 className="text-sm font-medium mb-2">Call Transcript</h4>
                                    <p className="text-sm text-muted-foreground">
                                      {call.transcript}
                                    </p>
                                  </div>
                                  
                                  <div>
                                    <h4 className="text-sm font-medium mb-2">Recording</h4>
                                    <Waveform
                                      audioUrl={call.recording}
                                      waveColor="hsl(var(--chart-3))"
                                      progressColor="hsl(var(--chart-3) / 0.7)"
                                    />
                                  </div>
                                  
                                  <div className="flex justify-end">
                                    <Button variant="outline" size="sm" className="flex items-center gap-2">
                                      <Download className="h-4 w-4" />
                                      <span>Download Recording</span>
                                    </Button>
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </motion.div>
    </main>
  );
}