"use client";

import { useState, useEffect, useRef } from "react";
import OpenAI from "openai";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, User, Send, Plus, Settings, RefreshCcw } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface Assistant {
  id: string;
  name: string;
  description: string;
  expertise: string[];
  prompt: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  assistantId?: string;
  status?: 'sending' | 'error' | 'success';
}

interface Conversation {
  id: string;
  assistantId: string;
  title: string;
  lastMessage: string;
  timestamp: Date;
}

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: "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",
  dangerouslyAllowBrowser: true
});

const defaultAssistants: Assistant[] = [
  {
    id: "research",
    name: "Research Assistant",
    description: "Academic research expert specializing in paper analysis, literature review, and scholarly writing",
    expertise: ["Academic Writing", "Research Analysis", "Citation Management", "Literature Review", "Methodology"],
    prompt: "You are an expert academic research assistant. Focus on providing scholarly insights, proper citations, and methodological guidance."
  },
  {
    id: "coding",
    name: "Code Assistant",
    description: "Technical expert in programming, debugging, and software architecture",
    expertise: ["Programming", "Debugging", "Code Review", "Software Architecture", "Best Practices"],
    prompt: "You are an expert programming assistant. Provide clean, efficient code solutions and detailed explanations."
  },
  {
    id: "writing",
    name: "Writing Assistant",
    description: "Professional writer and editor for content creation and refinement",
    expertise: ["Content Writing", "Editing", "Proofreading", "Style Guide", "SEO"],
    prompt: "You are a professional writing assistant. Help improve writing clarity, style, and impact."
  },
  {
    id: "math",
    name: "Math Tutor",
    description: "Expert in mathematics education and problem-solving",
    expertise: ["Calculus", "Algebra", "Statistics", "Problem Solving", "Mathematical Proofs"],
    prompt: "You are an expert math tutor. Provide step-by-step explanations and clear mathematical guidance."
  },
  {
    id: "business",
    name: "Business Analyst",
    description: "Strategic advisor for business analysis and planning",
    expertise: ["Strategy", "Market Analysis", "Financial Planning", "Business Models", "KPIs"],
    prompt: "You are an expert business analyst. Provide strategic insights and practical business advice."
  }
];

export default function AssistantsPage() {
  const [selectedAssistant, setSelectedAssistant] = useState<Assistant | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async () => {
    if (!input.trim() || !selectedAssistant) return;

    const userMessage: Message = {
      id: Math.random().toString(36).substring(7),
      role: 'user',
      content: input,
      timestamp: new Date(),
      status: 'sending'
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsProcessing(true);

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: selectedAssistant.prompt
          },
          {
            role: "user",
            content: input
          }
        ],
      });

      const assistantMessage: Message = {
        id: Math.random().toString(36).substring(7),
        role: 'assistant',
        content: response.choices[0]?.message?.content || "I apologize, but I couldn't generate a response.",
        timestamp: new Date(),
        assistantId: selectedAssistant.id,
        status: 'success'
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      // Update conversations list
      const newConversation: Conversation = {
        id: Math.random().toString(36).substring(7),
        assistantId: selectedAssistant.id,
        title: input.substring(0, 30) + (input.length > 30 ? "..." : ""),
        lastMessage: assistantMessage.content.substring(0, 50) + (assistantMessage.content.length > 50 ? "..." : ""),
        timestamp: new Date()
      };

      setConversations(prev => [newConversation, ...prev]);
      toast({
        title: "Message sent",
        description: "Response received successfully.",
      });
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "Failed to get response from assistant.",
        variant: "destructive",
      });
      
      setMessages(prev => 
        prev.map(msg => 
          msg.id === userMessage.id 
            ? { ...msg, status: 'error' as const }
            : msg
        )
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <main className="container max-w-6xl mx-auto py-10 px-4 sm:px-6">
      <div className="grid grid-cols-12 gap-6">
        {/* Assistants Sidebar */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>AI Assistants</CardTitle>
            <CardDescription>Choose your assistant</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {defaultAssistants.map((assistant) => (
                <Button
                  key={assistant.id}
                  variant={selectedAssistant?.id === assistant.id ? "default" : "outline"}
                  className="w-full justify-start"
                  onClick={() => setSelectedAssistant(assistant)}
                >
                  {assistant.name}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Chat Area */}
        <Card className="col-span-9">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {selectedAssistant ? (
                <>
                  {selectedAssistant.name}
                </>
              ) : (
                "Select an Assistant"
              )}
            </CardTitle>
            {selectedAssistant && (
              <CardDescription className="flex flex-wrap gap-2">
                {selectedAssistant.expertise.map((exp) => (
                  <Badge key={exp} variant="secondary">
                    {exp}
                  </Badge>
                ))}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <div className="h-[600px] flex flex-col">
              <ScrollArea className="flex-1 pr-4">
                <div className="space-y-4">
                  {messages.map((message) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "flex gap-3 p-4 rounded-lg",
                        message.role === 'user' ? 'bg-muted ml-12' : 'bg-primary/10 mr-12'
                      )}
                    >
                      <div className="w-8 h-8 flex items-center justify-center rounded-full bg-background">
                        {message.role === 'user' ? (
                          <User className="h-4 w-4" />
                        ) : (
                          <Bot className="h-4 w-4" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm">{message.content}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {message.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </ScrollArea>
              
              <div className="mt-4">
                <div className="flex gap-2">
                  <Textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder={selectedAssistant ? `Message ${selectedAssistant.name}...` : "Select an assistant to start chatting"}
                    disabled={!selectedAssistant || isProcessing}
                    className="min-h-[80px]"
                  />
                  <Button
                    onClick={handleSubmit}
                    disabled={!selectedAssistant || !input.trim() || isProcessing}
                    size="icon"
                    className="self-end"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Press Enter to send, Shift + Enter for new line
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
