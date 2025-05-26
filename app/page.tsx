"use client";

import { useState, useRef, useEffect } from "react";
import OpenAI from "openai";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VoiceRecorder } from "@/components/voice-recorder";
import { Waveform } from "@/components/ui/waveform";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import { Mic, Speaker, Bot, ArrowRight, Download, Trash2, Play, Pause, Copy, Loader2, User, Smile, Frown, Meh, Angry, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { format } from "date-fns";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from "@/components/ui/sheet";
import { SpeakingWaveform } from "@/components/ui/SpeakingWaveform";
import { generateSpeech as generateSpeechPreview } from "@/lib/openai";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { getElevenLabsVoices, generateElevenLabsSpeech } from "@/lib/elevenlabs";

// Initialize OpenAI client with API key from environment variable
const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true, // Allow client-side API calls
});

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  audioUrl?: string;
  timestamp: string;
}

interface VoiceSample {
  type: string;
  text: string;
}

interface VoiceLanguageSamples {
  [key: string]: VoiceSample[];
}

interface VoiceExample {
  samples: VoiceLanguageSamples;
  languages: string[];
  specialties: string[];
}

interface VoiceExamples {
  [key: string]: VoiceExample;
}

// Add this new interface for voice personality
interface VoicePersonality {
  id: string;
  name: string;
  description: string;
  icon: JSX.Element;
  prompt: string;
}

// Add this before the Home component
const voicePersonalities: VoicePersonality[] = [
  {
    id: "alloy",
    name: "Alloy",
    description: "Neutral & Versatile",
    icon: <Bot className="h-5 w-5" />,
    prompt: "Generate a professional and balanced response that's clear and informative."
  },
  {
    id: "echo",
    name: "Echo",
    description: "Expressive & Engaging",
    icon: <Mic className="h-5 w-5" />,
    prompt: "Create an enthusiastic and engaging response with a warm, friendly tone."
  },
  {
    id: "fable",
    name: "Fable",
    description: "Warm & Friendly",
    icon: <Speaker className="h-5 w-5" />,
    prompt: "Create a warm and friendly response with a gentle, approachable tone."
  },
  {
    id: "nova",
    name: "Nova",
    description: "Energetic & Bright",
    icon: <Speaker className="h-5 w-5" />,
    prompt: "Respond with high energy and excitement, perfect for dynamic content."
  },
  {
    id: "onyx",
    name: "Onyx",
    description: "Deep & Authoritative",
    icon: <User className="h-5 w-5" />,
    prompt: "Provide an authoritative and professional response with gravitas."
  },
  {
    id: "shimmer",
    name: "Shimmer",
    description: "Clear & Professional",
    icon: <Bot className="h-5 w-5" />,
    prompt: "Deliver a crisp, professional response focused on clarity and precision."
  }
];

interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category: string;
  description: string;
  preview_url: string;
}

// Transcription function using OpenAI Whisper API
async function transcribeSpeech(audioBlob: Blob): Promise<string> {
  try {
    const audioFile = new File([audioBlob], "recording.webm", { type: audioBlob.type });

    const response = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
    });

    return response.text;
  } catch (error) {
    console.error("Transcription error:", error);
    throw new Error("Failed to transcribe audio");
  }
}

// Speech generation function using OpenAI TTS API
async function generateSpeech(text: string, voice: string = "alloy", speed: number = 1.0): Promise<{ audioUrl: string; duration: number }> {
  try {
    const response = await openai.audio.speech.create({
      model: "tts-1",
      input: text,
      voice: voice as any,
      speed
    });

    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    
    // Create a temporary audio element to get duration
    const audio = new Audio(audioUrl);
    const duration = await new Promise<number>((resolve) => {
      audio.addEventListener('loadedmetadata', () => {
        resolve(audio.duration);
      });
    });

    return { audioUrl, duration };
  } catch (error) {
    console.error("Speech generation error:", error);
    throw new Error("Failed to generate speech");
  }
}

// Chat function using OpenAI Chat API
async function chatWithAI(messages: Message[]): Promise<string> {
  try {
    const chatMessages = messages.map(({ role, content }) => ({ role, content }));
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: chatMessages as any, // Type cast to bypass strict typing
    });

    console.log("AI Response:", response); // Debugging log for AI response

    return response.choices[0]?.message?.content || "";
  } catch (error) {
    console.error("Chat error:", error);
    throw new Error("Failed to get AI response");
  }
}

const models = [
  { id: "openai", name: "OpenAI" },
  { id: "elevenlabs", name: "ElevenLabs" },
];

// Helper to get icon for ElevenLabs voice (can be extended by category)
function getElevenLabsVoiceIcon(category: string) {
  // You can map category to different icons here if desired
  return <Speaker className="h-5 w-5" />;
}

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
  const [messages, setMessages] = useState<Message[]>([]);
  const [textInput, setTextInput] = useState("");
  const userAudioRef = useRef<HTMLAudioElement | null>(null);
  const aiAudioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlayingUser, setIsPlayingUser] = useState(false);
  const [isPlayingAI, setIsPlayingAI] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState("English");
  const [voiceExamples] = useState<VoiceExamples>({
    alloy: {
      samples: {
        English: [
          { type: "storytelling", text: "Once upon a time, in a world where technology and magic intertwined..." },
          { type: "general", text: "Welcome! I'm Alloy, and I can help you with tasks, answer questions, or just chat." },
          { type: "business", text: "In today's meeting, we'll discuss the quarterly results and future projections." }
        ],
        Spanish: [
          { type: "storytelling", text: "Había una vez, en un mundo donde la tecnología y la magia se entrelazaban..." },
          { type: "general", text: "¡Bienvenido! Soy Alloy, y puedo ayudarte con tareas, responder preguntas o simplemente charlar." },
          { type: "business", text: "En la reunión de hoy, discutiremos los resultados trimestrales y las proyecciones futuras." }
        ],
        French: [
          { type: "storytelling", text: "Il était une fois, dans un monde où la technologie et la magie s'entremêlaient..." },
          { type: "general", text: "Bienvenue ! Je suis Alloy, et je peux vous aider avec des tâches, répondre à des questions ou simplement discuter." },
          { type: "business", text: "Lors de la réunion d'aujourd'hui, nous discuterons des résultats trimestriels et des projections futures." }
        ]
      },
      languages: ["English", "Spanish", "French"],
      specialties: ["Professional Communication", "Storytelling", "Business"]
    },
    echo: {
      samples: {
        English: [
          { type: "entertainment", text: "Let me tell you about the most amazing show I've ever seen!" },
          { type: "general", text: "Hi there! I'm Echo, your expressive and engaging AI companion." },
          { type: "creative", text: "The sunset painted the sky in brilliant hues of orange and purple..." }
        ],
        German: [
          { type: "entertainment", text: "Lass mich dir von der erstaunlichsten Show erzählen, die ich je gesehen habe!" },
          { type: "general", text: "Hallo! Ich bin Echo, dein ausdrucksstarker und engagierter KI-Begleiter." },
          { type: "creative", text: "Der Sonnenuntergang malte den Himmel in brillanten Orange- und Lilatönen..." }
        ],
        Italian: [
          { type: "entertainment", text: "Lascia che ti racconti dello spettacolo più incredibile che abbia mai visto!" },
          { type: "general", text: "Ciao! Sono Echo, il tuo compagno AI espressivo e coinvolgente." },
          { type: "creative", text: "Il tramonto dipingeva il cielo di brillanti sfumature arancioni e viola..." }
        ]
      },
      languages: ["English", "German", "Italian"],
      specialties: ["Entertainment", "Creative Expression", "Storytelling"]
    },
    nova: {
      samples: {
        English: [
          { type: "gaming", text: "Player one, your adventure begins now! Choose your path wisely..." },
          { type: "general", text: "Hey! I'm Nova, bringing energy and excitement to every interaction!" },
          { type: "dynamic", text: "3... 2... 1... Let's get this party started!" }
        ],
        Japanese: [
          { type: "gaming", text: "プレイヤー1、あなたの冒険が今始まります！賢明に道を選んでください..." },
          { type: "general", text: "こんにちは！私はノヴァです。すべてのやり取りにエネルギーと興奮をもたらします！" },
          { type: "dynamic", text: "3... 2... 1... パーティーを始めましょう！" }
        ],
        Korean: [
          { type: "gaming", text: "플레이어 원, 당신의 모험이 지금 시작됩니다! 현명하게 길을 선택하세요..." },
          { type: "general", text: "안녕하세요! 저는 노바입니다. 모든 상호작용에 에너지와 흥분을 불어넀습니다!" },
          { type: "dynamic", text: "3... 2... 1... 파티를 시작합시다!" }
        ]
      },
      languages: ["English", "Japanese", "Korean"],
      specialties: ["Gaming", "Entertainment", "Dynamic Content"]
    },
    onyx: {
      samples: {
        English: [
          { type: "professional", text: "Today's market analysis shows promising growth in key sectors..." },
          { type: "general", text: "Greetings, I'm Onyx. How may I assist you with your business needs?" },
          { type: "formal", text: "Ladies and gentlemen, welcome to our annual shareholders meeting." }
        ],
        Mandarin: [
          { type: "professional", text: "今天的市场分析显示关键部门有望增长..." },
          { type: "general", text: "您好，我是Onyx。我如何协助您处理业务需求？" },
          { type: "formal", text: "女士们，先生们，欢迎参加我们的年度股东大会。" }
        ],
        Russian: [
          { type: "professional", text: "Сегодняшний анализ рынка показывает многообещающий рост в ключевых секторах..." },
          { type: "general", text: "Здравствуйте, я Оникс. Как я могу помочь вам с вашими деловыми потребностями?" },
          { type: "formal", text: "Дамы и господа, добро пожаловать на наше ежегодное собрание акционеров." }
        ]
      },
      languages: ["English", "Mandarin", "Russian"],
      specialties: ["Business", "Professional Presentations", "Corporate Communications"]
    },
    shimmer: {
      samples: {
        English: [
          { type: "education", text: "Let's explore the fascinating world of quantum physics..." },
          { type: "general", text: "Hello, I'm Shimmer. I specialize in clear and professional communication." },
          { type: "academic", text: "This research paper presents groundbreaking findings in neural networks." }
        ],
        Arabic: [
          { type: "education", text: "دعونا نستكشف عالم الفيزياء الكمية المذهل..." },
          { type: "general", text: "مرحباً، أنا شيمر. أتخصص في التواصل الواضح والمهني." },
          { type: "academic", text: "يقدم هذا البحث نتائج رائدة في الشبكات العصبية." }
        ],
        Portuguese: [
          { type: "education", text: "Vamos explorar o fascinante mundo da física quântica..." },
          { type: "general", text: "Olá, eu sou Shimmer. Especializo-me em comunicação clara e profissional." },
          { type: "academic", text: "Este artigo de pesquisa apresenta descobertas revolucionárias em redes neurais." }
        ]
      },
      languages: ["English", "Arabic", "Portuguese"],
      specialties: ["Education", "Academic", "Professional Communication"]
    },
    fable: {
      samples: {
        English: [
          { type: "storytelling", text: "Once upon a time, in a cozy little village, there lived a kind old man..." },
          { type: "general", text: "Hello! I'm Fable, here to share warm and friendly stories with you." },
          { type: "children", text: "The little bunny hopped through the forest, meeting new friends along the way." }
        ],
        Spanish: [
          { type: "storytelling", text: "Había una vez, en un pequeño y acogedor pueblo, vivía un anciano amable..." },
          { type: "general", text: "¡Hola! Soy Fable, aquí para compartir historias cálidas y amigables contigo." },
          { type: "children", text: "El conejito saltó por el bosque, conociendo nuevos amigos en el camino." }
        ],
        French: [
          { type: "storytelling", text: "Il était une fois, dans un petit village chaleureux, vivait un vieil homme gentil..." },
          { type: "general", text: "Bonjour! Je suis Fable, ici pour partager des histoires chaleureuses et amicales avec vous." },
          { type: "children", text: "Le petit lapin sautait à travers la forêt, rencontrant de nouveaux amis en chemin." }
        ]
      },
      languages: ["English", "Spanish", "French"],
      specialties: ["Storytelling", "Children's Stories", "Friendly Communication"]
    }
  });
  const [characterCount, setCharacterCount] = useState(0);
  const [emotion, setEmotion] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [modelInfo, setModelInfo] = useState({
    name: "Alloy",
    description: "Neutral & Versatile",
    languages: ["English"],
  });
  const [stability, setStability] = useState(80);
  const [similarity, setSimilarity] = useState(70);
  const [style, setStyle] = useState(0);
  const [speakerBoost, setSpeakerBoost] = useState(false);
  const [quota, setQuota] = useState(1000);
  const [previewingVoice, setPreviewingVoice] = useState<string | null>(null);
  const [previewAudio, setPreviewAudio] = useState<HTMLAudioElement | null>(null);
  const [isAutoGenerating, setIsAutoGenerating] = useState(false);
  const [typewriterIndex, setTypewriterIndex] = useState(0);
  const autoText = "This is a sample text for voice synthesis engine. You can edit or replace it!";
  const [mode, setMode] = useState("simple");
  const [mainTab, setMainTab] = useState("generate");
  const [cardTab, setCardTab] = useState("text-to-speech");
  const [selectedModel, setSelectedModel] = useState("openai");
  const [elevenLabsVoices, setElevenLabsVoices] = useState<ElevenLabsVoice[]>([]);
  const [isLoadingVoices, setIsLoadingVoices] = useState(false);

  // Fetch ElevenLabs voices when model changes
  useEffect(() => {
    if (selectedModel === 'elevenlabs') {
      setIsLoadingVoices(true);
      getElevenLabsVoices()
        .then(voices => {
          setElevenLabsVoices(voices);
          if (voices.length > 0) {
            setSelectedVoice(voices[0].voice_id);
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
      setIsLoadingVoices(true);
      setTimeout(() => {
        setSelectedVoice(voicePersonalities[0].id);
        setIsLoadingVoices(false);
      }, 300);
    }
  }, [selectedModel]);

  // Update handleTextSubmit to handle both models
  const handleTextSubmit = async () => {
    if (!textInput.trim()) return;
    setIsProcessing(true);
    try {
      let audioUrl: string;
      let duration: number;

      if (selectedModel === 'elevenlabs') {
        const result = await generateElevenLabsSpeech(
          textInput,
          selectedVoice,
          stability,
          similarity,
          style
        );
        audioUrl = result.audioUrl;
        // Create a temporary audio element to get duration
        const audio = new Audio(audioUrl);
        duration = await new Promise<number>((resolve) => {
          audio.addEventListener('loadedmetadata', () => {
            resolve(audio.duration);
          });
        });
      } else {
        const result = await generateSpeech(textInput, selectedVoice, voiceSpeed);
        audioUrl = result.audioUrl;
        duration = result.duration;
      }

      // Calculate credits used (2 credits per 15 seconds, rounded up)
      const creditsUsed = Math.ceil((duration / 15) * 2);
      
      // Update quota
      setQuota(prevQuota => {
        const newQuota = prevQuota - creditsUsed;
        if (newQuota < 0) {
          toast({
            title: "Error",
            description: "Not enough credits remaining.",
            variant: "destructive",
          });
          throw new Error("Insufficient credits");
        }
        return newQuota;
      });

      // Stop any currently playing AI audio before playing new one
      if (aiAudioRef.current) {
        aiAudioRef.current.pause();
        aiAudioRef.current.currentTime = 0;
      }
      setAiAudioUrl(audioUrl);
      
      toast({ 
        title: "Success", 
        description: `Speech generated from your input. Used ${creditsUsed} credits.` 
      });
    } catch (error) {
      console.error("Error generating speech:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate speech. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey && !isProcessing && textInput.trim()) {
        e.preventDefault();
        handleTextSubmit();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isProcessing, textInput, handleTextSubmit]);

  // Auto-scroll effect
  useEffect(() => {
    if (autoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, autoScroll]);

  // Character count effect
  useEffect(() => {
    setCharacterCount(textInput.length);
  }, [textInput]);

  const handleRecordingComplete = async (audioBlob: Blob) => {
    setIsProcessing(true);
    try {
      const audioUrl = URL.createObjectURL(audioBlob);
      setUserAudioUrl(audioUrl);

      const transcription = await transcribeSpeech(audioBlob);
      if (!transcription) throw new Error("Transcription failed");
      setUserMessage(transcription);

      const systemMessage: Message = {
        role: "system",
        content: `You are a helpful AI assistant. Respond in ${selectedLanguage}. Maintain the conversation style and tone appropriate for ${selectedVoice}.`,
        timestamp: new Date().toISOString(),
      };

      const userMessage: Message = {
        role: "user",
        content: transcription,
        audioUrl,
        timestamp: new Date().toISOString(),
      };

      const updatedMessages = [...messages, systemMessage, userMessage];
      setMessages(updatedMessages);

      const response = await chatWithAI(updatedMessages);
      setAiResponse(response);

      const { audioUrl: aiAudio } = await generateSpeech(response, selectedVoice, voiceSpeed);
      setAiAudioUrl(aiAudio);

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: response, audioUrl: aiAudio, timestamp: new Date().toISOString() },
      ]);

      toast({ title: "Success", description: "Message processed and AI response generated." });
    } catch (error) {
      console.error("Error processing recording:", error);
      toast({
        title: "Error",
        description: "Failed to process your message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };
  const downloadAudio= (audioUrl: string, filename: string) => {
    const link = document.createElement("a");
    link.href = audioUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const clearConversation = () => {
    if (userAudioUrl) URL.revokeObjectURL(userAudioUrl);
    if (aiAudioUrl) URL.revokeObjectURL(aiAudioUrl);
    messages.forEach((msg) => msg.audioUrl && URL.revokeObjectURL(msg.audioUrl));
    setMessages([]);
    setUserMessage("");
    setAiResponse("");
    setUserAudioUrl("");
    setAiAudioUrl("");
    setVoiceBrief("");
    toast({ title: "Conversation Cleared", description: "All messages and audio have been reset." });
  };

  const toggleAudio = (audioRef: React.MutableRefObject<HTMLAudioElement | null>, setPlaying: (value: boolean) => void, isPlaying: boolean) => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setPlaying(false);
      } else {
        audioRef.current.play();
        setPlaying(true);
      }
    }
  };

  // Helper for emotion emoji
  const emotionEmoji: Record<string, JSX.Element> = {
    happy: <Smile className="inline h-4 w-4 text-yellow-500" />,
    sad: <Frown className="inline h-4 w-4 text-blue-400" />,
    angry: <Angry className="inline h-4 w-4 text-red-500" />,
    neutral: <Meh className="inline h-4 w-4 text-gray-400" />,
  };

  // Restore auto-play AI audio when aiAudioUrl changes
  useEffect(() => {
    if (aiAudioUrl && aiAudioRef.current) {
      aiAudioRef.current.currentTime = 0;
      aiAudioRef.current.play().catch((err) => {
        toast({ title: 'Playback Error', description: err.message, variant: 'destructive' });
        console.error('Auto-play error:', err);
      });
    }
    // Add event listeners for play/pause/end to control isPlayingAI
    const audio = aiAudioRef.current;
    if (audio) {
      const handlePlay = () => setIsPlayingAI(true);
      const handlePause = () => setIsPlayingAI(false);
      const handleEnded = () => setIsPlayingAI(false);
      audio.addEventListener('play', handlePlay);
      audio.addEventListener('pause', handlePause);
      audio.addEventListener('ended', handleEnded);
      // Clean up
      return () => {
        audio.removeEventListener('play', handlePlay);
        audio.removeEventListener('pause', handlePause);
        audio.removeEventListener('ended', handleEnded);
      };
    }
  }, [aiAudioUrl]);

  const handlePreviewVoice = async (voiceId: string) => {
    // Stop any currently playing preview
    if (previewAudio) {
      previewAudio.pause();
      setPreviewAudio(null);
      setPreviewingVoice(null);
    }
    setPreviewingVoice(voiceId);
    try {
      let audioUrl: string;
      if (selectedModel === "elevenlabs") {
        // Use ElevenLabs preview
        const result = await generateElevenLabsSpeech(
          "This is a sample of the selected voice.",
          voiceId,
          stability,
          similarity,
          style
        );
        audioUrl = result.audioUrl;
      } else {
        // Use OpenAI preview
        const result = await generateSpeechPreview(
          "This is a sample of the selected voice.",
          voiceId,
          1.0
        );
        audioUrl = result.audioUrl;
      }
      const audio = new Audio(audioUrl);
      setPreviewAudio(audio);
      audio.onended = () => setPreviewingVoice(null);
      audio.onpause = () => setPreviewingVoice(null);
      audio.play();
    } catch (error) {
      setPreviewingVoice(null);
      toast({
        title: "Preview Error",
        description: error instanceof Error ? error.message : "Failed to preview voice.",
        variant: "destructive",
      });
    }
  };

  const handleAutoGenerateText = () => {
    setIsAutoGenerating(true);
    setTypewriterIndex(0);
  };

  useEffect(() => {
    if (isAutoGenerating && typewriterIndex <= autoText.length) {
      const timeout = setTimeout(() => {
        setTextInput(autoText.slice(0, typewriterIndex));
        setTypewriterIndex(typewriterIndex + 1);
      }, 18);
      if (typewriterIndex === autoText.length) {
        setTimeout(() => setIsAutoGenerating(false), 300);
      }
      return () => clearTimeout(timeout);
    }
  }, [isAutoGenerating, typewriterIndex]);

  useEffect(() => {
    // Stop AI audio if playing when the voice is changed
    if (aiAudioRef.current) {
      aiAudioRef.current.pause();
      aiAudioRef.current.currentTime = 0;
    }
    setIsPlayingAI(false);
  }, [selectedVoice]);

  // Update voice selection UI
  const renderVoiceSelector = () => {
    if (selectedModel === 'elevenlabs') {
      return (
        <Select
          value={selectedVoice}
          onValueChange={setSelectedVoice}
          aria-label="Select ElevenLabs voice"
          disabled={isLoadingVoices}
        >
          <SelectTrigger className="w-64">
            <div className="flex items-center gap-2 w-full">
              <span className="flex items-center justify-center h-5 w-5">
                {(() => {
                  const v = elevenLabsVoices.find(v => v.voice_id === selectedVoice);
                  return v ? getElevenLabsVoiceIcon(v.category) : <Speaker className="h-5 w-5" />;
                })()}
              </span>
              <span className="truncate max-w-full">
                {isLoadingVoices
                  ? "Loading voices..."
                  : elevenLabsVoices.find(v => v.voice_id === selectedVoice)
                    ? `${elevenLabsVoices.find(v => v.voice_id === selectedVoice)?.name} - ${elevenLabsVoices.find(v => v.voice_id === selectedVoice)?.description || elevenLabsVoices.find(v => v.voice_id === selectedVoice)?.category || ""}`
                    : "Select a voice"}
              </span>
            </div>
          </SelectTrigger>
          <SelectContent>
            {elevenLabsVoices.map((voice) => (
              <SelectItem key={voice.voice_id} value={voice.voice_id}>
                <div className="flex items-center gap-2 w-full">
                  <span className="flex items-center justify-center h-5 w-5">
                    {getElevenLabsVoiceIcon(voice.category)}
                  </span>
                  <span className="truncate max-w-full">{voice.name} - {voice.description || voice.category}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    return (
      <Select
        value={selectedVoice}
        onValueChange={setSelectedVoice}
        aria-label="Select OpenAI voice"
        disabled={isLoadingVoices}
      >
        <SelectTrigger className="w-64">
          <div className="flex items-center gap-2 w-full">
            {isLoadingVoices ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              voicePersonalities.find(v => v.id === selectedVoice)?.icon
            )}
            <span className="truncate max-w-full">
              {isLoadingVoices
                ? "Loading voices..."
                : voicePersonalities.find(v => v.id === selectedVoice)?.name +
                  " - " +
                  voicePersonalities.find(v => v.id === selectedVoice)?.description}
            </span>
          </div>
        </SelectTrigger>
        <SelectContent>
          {voicePersonalities.map((voice) => (
            <SelectItem key={voice.id} value={voice.id}>
              <div className="flex items-center gap-2 w-full">
                {voice.icon}
                <span className="truncate max-w-full">
                  {voice.name} - {voice.description}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  };

  return (
    <div className="min-h-screen w-full flex flex-col bg-background">
      {/* Header */}
      <header className="w-full flex items-center justify-between px-8 pt-8 pb-2 border-b border-muted">
        <div>
          <h1 className="text-2xl font-bold leading-tight mb-1">Voice Synthesis Engine</h1>
          <p className="text-sm text-muted-foreground">Unleash the power of advanced AI to generate natural, expressive speech from text—across languages, tones, and styles.</p>
        </div>
      </header>
      {/* Main Card */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-4xl rounded-2xl shadow-xl border bg-background/80 mx-auto p-0 min-h-[480px]">
          {/* Card Tabs and Quota */}
          <div className="flex items-center justify-between px-8 pt-6 pb-2 border-b">
            <div className="flex gap-4">
              <button
                className={`text-sm font-semibold transition-colors ${cardTab === "text-to-speech" ? "text-primary" : "text-muted-foreground"}`}
                onClick={() => setCardTab("text-to-speech")}
              >
                TEXT TO SPEECH
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-medium">Model</span>
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {models.map((model) => (
                    <SelectItem key={model.id} value={model.id}>{model.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {/* Textarea */}
          <div className="px-8 pt-8 pb-4">  
            <div className="relative">
              <textarea
                className="w-full min-h-[340px] text-lg p-6 rounded-lg border-2 border-muted bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                value={textInput}
                onChange={e => setTextInput(e.target.value)}
                placeholder="Type or paste your text here..."
                disabled={isProcessing || isAutoGenerating}
              />
              <button
                type="button"
                className={`absolute top-3 right-3 bg-muted rounded-full p-2 hover:bg-primary/10 transition`}
                onClick={handleAutoGenerateText}
                title="Auto-generate sample text"
                tabIndex={0}
              >
                <Sparkles className={`h-5 w-5 text-primary ${isAutoGenerating ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
          {/* Bottom Controls Row */}
          <div className="flex items-center justify-between px-8 pb-8 pt-2 gap-4 flex-wrap">
            {/* Voice selector and settings */}
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              {renderVoiceSelector()}
              {previewingVoice === selectedVoice ? (
                <Loader2 className="h-5 w-5 animate-spin text-primary ml-2" />
              ) : (
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="ml-2"
                  onClick={() => handlePreviewVoice(selectedVoice)}
                  aria-label="Play voice preview"
                >
                  <Play className="h-5 w-5" />
                </Button>
              )}
              <Button variant="outline" className="ml-2 px-6" onClick={() => setSettingsOpen(true)}>
                Settings
              </Button>
              <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
                <SheetContent side="right" className="max-w-md w-full">
                  <SheetHeader>
                    <SheetTitle>Settings</SheetTitle>
                  </SheetHeader>
                  {/* Model Info Card */}
                  <div className="rounded-lg border bg-muted p-4 mb-6">
                    <div className="font-semibold mb-1">{modelInfo.name}</div>
                    <div className="text-sm text-muted-foreground mb-2">{modelInfo.description}</div>
                    <div className="flex gap-2 flex-wrap">
                      {modelInfo.languages.map(lang => (
                        <Badge key={lang} variant="secondary">{lang}</Badge>
                      ))}
                    </div>
                  </div>
                  {/* Sliders */}
                  <div className="mb-4">
                    <div className="mb-2 flex justify-between text-sm font-medium">
                      <span>Stability</span>
                      <span className="text-muted-foreground">{stability}%</span>
                    </div>
                    <Slider min={0} max={100} step={1} value={[stability]} onValueChange={v => setStability(v[0])} />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>More variable</span>
                      <span>More stable</span>
                    </div>
                  </div>
                  <div className="mb-4">
                    <div className="mb-2 flex justify-between text-sm font-medium">
                      <span>Similarity</span>
                      <span className="text-muted-foreground">{similarity}%</span>
                    </div>
                    <Slider min={0} max={100} step={1} value={[similarity]} onValueChange={v => setSimilarity(v[0])} />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>Low</span>
                      <span>High</span>
                    </div>
                  </div>
                  <div className="mb-4">
                    <div className="mb-2 flex justify-between text-sm font-medium">
                      <span>Style Exaggeration</span>
                      <span className="text-muted-foreground">{style}%</span>
                    </div>
                    <Slider min={0} max={100} step={1} value={[style]} onValueChange={v => setStyle(v[0])} />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>None</span>
                      <span>Exaggerated</span>
                    </div>
                  </div>
                  {/* Speaker Boost Toggle */}
                  <div className="flex items-center gap-3 mb-6">
                    <Switch checked={speakerBoost} onCheckedChange={setSpeakerBoost} id="speaker-boost" />
                    <label htmlFor="speaker-boost" className="text-sm font-medium">Speaker boost</label>
                  </div>
                  <SheetFooter>
                    <Button variant="outline" onClick={() => {
                      setStability(80); setSimilarity(70); setStyle(0); setSpeakerBoost(false);
                    }}>Reset</Button>
                  </SheetFooter>
                </SheetContent>
              </Sheet>
            </div>
            {/* Char count and generate/download */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-sm text-muted-foreground">{textInput.length}/5000</span>
              <Button
                onClick={handleTextSubmit}
                disabled={isProcessing || !textInput.trim() || isPlayingAI}
                className="flex items-center gap-3 h-12 px-6 text-base min-w-[150px] justify-center"
              >
                {isProcessing ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <Play className="h-5 w-5" />
                    <span>Generate Speech</span>
                  </>
                )}
              </Button>
              <Button
                onClick={() => aiAudioUrl && downloadAudio(aiAudioUrl, "tts-audio.wav")}
                variant="outline"
                className="flex items-center justify-center h-12 w-12 p-0"
                disabled={!aiAudioUrl}
                aria-label={aiAudioUrl ? "Download audio" : "No audio to download"}
              >
                <Download className="h-5 w-5" />
              </Button>
            </div>
          </div>
          {/* Hidden audio element */}
          {aiAudioUrl && (
            <audio
              ref={aiAudioRef}
              src={aiAudioUrl}
              onEnded={() => setIsPlayingAI(false)}
              onPause={() => setIsPlayingAI(false)}
              onPlay={() => setIsPlayingAI(true)}
            />
          )}
        </div>
      </main>
    </div>
  );
}

