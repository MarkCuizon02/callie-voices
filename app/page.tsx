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
import { Mic, Speaker, Bot, ArrowRight, Download, Trash2, Play, Pause, Copy, Loader2, User, Smile, Frown, Meh, Angry } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { format } from "date-fns";

// Initialize OpenAI client with API key from environment variable
const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true, // Allow client-side API calls
});

const AudioCache = new Map<string, { audio: HTMLAudioElement, timestamp: number }>();

// Audio cache cleanup interval (30 minutes)
const CACHE_CLEANUP_INTERVAL = 30 * 60 * 1000;

// Maximum cache age (1 hour)
const MAX_CACHE_AGE = 60 * 60 * 1000;

function getOrCreateCachedAudio(url: string): HTMLAudioElement {
  const now = Date.now();
  const cached = AudioCache.get(url);

  if (cached) {
    cached.timestamp = now;
    return cached.audio;
  }

  const audio = new Audio(url);
  audio.preload = 'auto';
  AudioCache.set(url, { audio, timestamp: now });

  // Clean up old cache entries
  if (AudioCache.size > 20) {
    const entries = Array.from(AudioCache.entries());
    const oldEntries = entries.filter(([_, value]) => now - value.timestamp > MAX_CACHE_AGE);
    oldEntries.forEach(([key, value]) => {
      value.audio.src = '';
      URL.revokeObjectURL(key);
      AudioCache.delete(key);
    });
  }

  return audio;
}

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

// Transcription function using OpenAI Whisper API with optimized handling
async function transcribeSpeech(audioBlob: Blob): Promise<string> {
  try {
    // Compress audio before sending (if it's too large)
    let processedBlob = audioBlob;
    if (audioBlob.size > 25 * 1024 * 1024) { // If larger than 25MB
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContextClass();
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      // Create a new buffer with lower sample rate
      const offlineContext = new OfflineAudioContext(
        1, // mono
        audioBuffer.duration * 16000, // target sample rate: 16kHz
        16000
      );
      
      const source = offlineContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(offlineContext.destination);
      source.start();
      
      const renderedBuffer = await offlineContext.startRendering();
      const wavBlob = await new Promise<Blob>((resolve) => {
        const wav = new Blob([exportWAV(renderedBuffer)], { type: 'audio/wav' });
        resolve(wav);
      });
      
      processedBlob = wavBlob;
    }

    const audioFile = new File([processedBlob], "recording.wav", { type: "audio/wav" });

    const response = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      language: "auto",
      response_format: "json",
      temperature: 0.2,
      prompt: "Convert speech to text with high accuracy, maintaining punctuation and formatting."
    } as any);

    return response.text;
  } catch (error) {
    console.error("Transcription error:", error);
    throw new Error("Failed to transcribe audio");
  }
}

// Helper function to export audio buffer to WAV format
function exportWAV(audioBuffer: AudioBuffer): Blob {
  const interleaved = new Float32Array(audioBuffer.length);
  const channel = audioBuffer.getChannelData(0);
  for (let i = 0; i < audioBuffer.length; i++) {
    interleaved[i] = channel[i];
  }
  
  const dataview = encodeWAV(interleaved, audioBuffer.sampleRate);
  const buffer = dataview.buffer as ArrayBuffer;
  return new Blob([new Uint8Array(buffer)], { type: 'audio/wav' });
}

// Helper function to encode audio data to WAV format
function encodeWAV(samples: Float32Array, sampleRate: number): DataView {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, samples.length * 2, true);
  
  floatTo16BitPCM(view, 44, samples);
  
  return view;
}

function writeString(view: DataView, offset: number, string: string): void {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

function floatTo16BitPCM(output: DataView, offset: number, input: Float32Array): void {
  for (let i = 0; i < input.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
}

// Speech generation function using OpenAI TTS API with optimized handling
async function generateSpeech(text: string, voice: string = "alloy", speed: number = 1.0): Promise<{ audioUrl: string }> {
  try {
    // Split long text into smaller chunks for faster processing
    const MAX_CHUNK_LENGTH = 300;
    const chunks = text.match(new RegExp(`.{1,${MAX_CHUNK_LENGTH}}(?=\\s|$)`, 'g')) || [text];
    
    const audioChunks: Blob[] = [];
    
    for (const chunk of chunks) {
      const response = await openai.audio.speech.create({
        model: "tts-1-hd", // Using HD model for better quality
        input: chunk.trim(),
        voice: voice as any,
        speed,
        response_format: 'mp3',
      });

      const audioBlob = await response.blob();
      audioChunks.push(audioBlob);
    }

    // Combine all audio chunks into a single blob
    const finalBlob = new Blob(audioChunks, { type: 'audio/mpeg' });
    const audioUrl = URL.createObjectURL(finalBlob);
    
    return { audioUrl };
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
  const audioCleanupInterval = useRef<NodeJS.Timeout>();

  const handleTextSubmit = async () => {
    if (!textInput.trim()) return;

    setIsProcessing(true);
    try {
      const emotions = {
        happy: /\b(happy|joy|excited|great|wonderful)\b/i,
        sad: /\b(sad|unhappy|depressed|terrible)\b/i,
        angry: /\b(angry|mad|frustrated|annoyed)\b/i,
        neutral: /\b(normal|okay|fine|alright)\b/i
      };

      const detectedEmotion = Object.entries(emotions).find(([_, regex]) => 
        regex.test(textInput)
      )?.[0] || "neutral";

      setEmotion(detectedEmotion);

      const systemMessage: Message = {
        role: "system",
        content: `You are a helpful AI assistant. Respond in ${selectedLanguage}. Maintain the conversation style and tone appropriate for ${selectedVoice}.`,
        timestamp: new Date().toISOString(),
      };

      const userMessage: Message = {
        role: "user",
        content: textInput,
        timestamp: new Date().toISOString(),
      };

      const updatedMessages = [...messages, systemMessage, userMessage];
      setMessages(updatedMessages);
      setUserMessage(textInput);

      const response = await chatWithAI(updatedMessages);
      setAiResponse(response);

      const { audioUrl: aiAudio } = await generateSpeech(response, selectedVoice, voiceSpeed);
      setAiAudioUrl(aiAudio);

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: response, audioUrl: aiAudio, timestamp: new Date().toISOString() },
      ]);

      setTextInput("");
      toast({ title: "Success", description: "Text message processed and AI response generated." });
    } catch (error) {
      console.error("Error processing text:", error);
      toast({
        title: "Error",
        description: "Failed to process your text. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };
  // Auto-play AI audio with optimized handling
  useEffect(() => {
    if (aiAudioUrl) {
      const audio = getOrCreateCachedAudio(aiAudioUrl);
      aiAudioRef.current = audio;

      // Reset audio to start
      audio.currentTime = 0;

      // Configure audio settings for better performance
      audio.preservesPitch = false; // Better performance when changing speed
      audio.playbackRate = voiceSpeed;

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlayingAI(true);
          })
          .catch((error) => {
            console.error("Auto-play error:", error);
            setIsPlayingAI(false);
          });
      }

      // Clean up previous audio URL if it exists
      return () => {
        audio.pause();
        setIsPlayingAI(false);
      };
    }
  }, [aiAudioUrl, voiceSpeed]);
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

  useEffect(() => {
    // Set up cache cleanup interval
    audioCleanupInterval.current = setInterval(() => {
      const now = Date.now();
      Array.from(AudioCache.entries()).forEach(([key, value]) => {
        if (now - value.timestamp > MAX_CACHE_AGE) {
          value.audio.src = '';
          URL.revokeObjectURL(key);
          AudioCache.delete(key);
        }
      });
    }, CACHE_CLEANUP_INTERVAL);

    // Cleanup on component unmount
    return () => {
      if (audioCleanupInterval.current) {
        clearInterval(audioCleanupInterval.current);
      }
      // Clear all cached audio
      AudioCache.forEach((value, key) => {
        value.audio.src = '';
        URL.revokeObjectURL(key);
      });
      AudioCache.clear();
    };
  }, []);

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

  return (
    <main className="container max-w-4xl mx-auto py-10 px-4 sm:px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-8" 
      >
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-2">Audra</h1>
          <p className="text-muted-foreground">Speak or type to interact with your AI assistant.</p>
          <div className="mt-2 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <kbd className="px-2 py-1 bg-muted rounded">Ctrl/⌘ + R</kbd>
            <span>to record</span>
            <kbd className="px-2 py-1 bg-muted rounded">Ctrl/⌘ + Enter</kbd>
            <span>to send message</span>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-2 w-full max-w-md mx-auto mb-8">
            <TabsTrigger value="voice-chat" className="flex items-center gap-2" aria-label="Voice Chat Tab">
              <Mic className="h-4 w-4" />
              <span>Voice Chat</span>
            </TabsTrigger>
            <TabsTrigger value="voice-settings" className="flex items-center gap-2" aria-label="Voice Settings Tab">
              <Speaker className="h-4 w-4" />
              <span>Voice Settings</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="voice-chat" className="space-y-8">
            <Card className="w-full">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Your Input
                  {emotion && (
                    <Badge variant="outline" className="ml-2">
                      {emotionEmoji[emotion]} {emotion}
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>Choose a voice personality or start typing</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {voicePersonalities.map((voice) => (
                    <Button
                      key={voice.id}
                      variant={selectedVoice === voice.id ? "default" : "outline"}
                      className={cn(
                        "h-auto flex flex-col items-center p-4 space-y-2 relative",
                        selectedVoice === voice.id && "ring-2 ring-primary"
                      )}
                      onClick={async () => {
                        setSelectedVoice(voice.id);
                        setIsProcessing(true);
                        try {
                          // Generate a random sample type
                          const sampleTypes = ["general", "storytelling", "professional", "creative"];
                          const randomType = sampleTypes[Math.floor(Math.random() * sampleTypes.length)];
                          
                          let sampleText = "";
                          
                          // Custom samples for each voice type
                          const samples = {
                            alloy: "Welcome! I specialize in clear, professional communication. Let me demonstrate my versatile voice.",
                            echo: "Hey there! I love adding excitement and personality to every word. Let me show you my expressive style!",
                            fable: "Hello friend! Let me share a warm and gentle story that will make you smile.",
                            nova: "Get ready for an energetic experience! I bring dynamism and excitement to every interaction!",
                            onyx: "Greetings. Allow me to demonstrate my authoritative and commanding presence.",
                            shimmer: "Welcome. I excel in delivering precise and professional communication with clarity."
                          };

                          sampleText = samples[voice.id as keyof typeof samples] || samples.alloy;

                          const { audioUrl } = await generateSpeech(sampleText, voice.id, voiceSpeed);
                          setAiAudioUrl(audioUrl);
                          setAiResponse(sampleText);

                          toast({
                            title: `${voice.name} Selected`,
                            description: "Sample generated successfully.",
                          });
                        } catch (error) {
                          console.error("Error:", error);
                          toast({
                            title: "Error",
                            description: "Failed to generate voice sample",
                            variant: "destructive"
                          });
                        } finally {
                          setIsProcessing(false);
                        }
                      }}
                      disabled={isProcessing}
                    >
                      <div className="relative">
                        {voice.icon}
                        {isProcessing && selectedVoice === voice.id && (
                          <motion.div
                            className="absolute inset-0 flex items-center justify-center"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                          >
                            <Loader2 className="h-4 w-4 animate-spin" />
                          </motion.div>
                        )}
                      </div>
                      <span className="font-medium">{voice.name}</span>
                      <span className="text-xs text-muted-foreground text-center">
                        {voice.description}
                      </span>
                    </Button>
                  ))}
                </div>

                <div className="space-y-4">
                  <textarea
                    className="w-full min-h-[200px] p-4 rounded-md border bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder="Type your message here..."
                    disabled={isProcessing}
                  />
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      {characterCount}/4000 characters
                    </div>
                    <div className="flex items-center gap-2">
                      <VoiceRecorder
                        onRecordingComplete={handleRecordingComplete}
                        isProcessing={isProcessing}
                      />
                      <Button
                        onClick={handleTextSubmit}
                        disabled={isProcessing || !textInput.trim()}
                        className="flex items-center gap-2"
                      >
                        {isProcessing ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <ArrowRight className="h-4 w-4" />
                        )}
                        Send
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {(aiResponse || messages.length > 0) && (
              <Card className="w-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bot className="h-5 w-5" />
                    AI Response
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {aiAudioUrl && (
                    <div className="p-4 bg-muted rounded-lg">
                      <div className="flex items-center gap-4 mb-4">
                        {selectedVoice && voicePersonalities.find(v => v.id === selectedVoice)?.icon}
                        <div>
                          <h4 className="font-medium">
                            {voicePersonalities.find(v => v.id === selectedVoice)?.name}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {voicePersonalities.find(v => v.id === selectedVoice)?.description}
                          </p>
                        </div>
                        <Badge variant="secondary" className="ml-auto">
                          {selectedLanguage}
                        </Badge>
                      </div>
                      <div className="space-y-4">
                        <audio 
                          ref={aiAudioRef} 
                          src={aiAudioUrl} 
                          className="w-full" 
                          controls 
                          onPlay={() => setIsPlayingAI(true)}
                          onPause={() => setIsPlayingAI(false)}
                          onEnded={() => setIsPlayingAI(false)}
                        />
                        <div className="bg-background/50 p-4 rounded-md">
                          <p className="text-sm leading-relaxed">{aiResponse}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {messages.length > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium">Conversation History</h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={clearConversation}
                          className="flex items-center gap-2"
                        >
                          <Trash2 className="h-4 w-4" />
                          Clear
                        </Button>
                      </div>
                      <div className="space-y-4 max-h-[500px] overflow-y-auto">
                        {messages.map((msg, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={cn(
                              "p-4 rounded-lg",
                              msg.role === "user" ? "bg-muted" : "bg-primary/10"
                            )}
                          >
                            <div className="flex items-center gap-2 mb-2">
                              {msg.role === "user" ? (
                                <User className="h-4 w-4" />
                              ) : (
                                <Bot className="h-4 w-4" />
                              )}
                              <span className="text-sm font-medium">
                                {msg.role === "user" ? "You" : "AI"}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(msg.timestamp), "HH:mm")}
                              </span>
                            </div>
                            <p className="text-sm">{msg.content}</p>
                            {msg.audioUrl && (
                              <audio src={msg.audioUrl} className="mt-2 w-full" controls />
                            )}
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="voice-settings">
            <Card>
              <CardHeader>
                <CardTitle>Voice Customization</CardTitle>
                <CardDescription>Adjust how the AI voice sounds</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <Label htmlFor="voice-model">Voice</Label>
                      <Select value={selectedVoice} onValueChange={(value) => {
                        setSelectedVoice(value);
                        // Set first available language for the new voice
                        const availableLanguages = voiceExamples[value as keyof typeof voiceExamples].languages;
                        if (!availableLanguages.includes(selectedLanguage)) {
                          setSelectedLanguage(availableLanguages[0]);
                        }
                      }} aria-label="Select AI voice">
                        <SelectTrigger id="voice-model">
                          <SelectValue placeholder="Select a voice" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="alloy">
                            <div className="flex items-center gap-2">
                              <Mic className="h-4 w-4" />
                              <span>Alloy - Neutral & Versatile</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="echo">
                            <div className="flex items-center gap-2">
                              <Bot className="h-4 w-4" />
                              <span>Echo - Expressive & Engaging</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="fable">
                            <div className="flex items-center gap-2">
                              <Speaker className="h-4 w-4" />
                              <span>Fable - Warm & Friendly</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="onyx">
                            <div className="flex items-center gap-2">
                              <Bot className="h-4 w-4" />
                              <span>Onyx - Deep & Authoritative</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="nova">
                            <div className="flex items-center gap-2">
                              <Speaker className="h-4 w-4" />
                              <span>Nova - Energetic & Bright</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="shimmer">
                            <div className="flex items-center gap-2">
                              <Mic className="h-4 w-4" />
                              <span>Shimmer - Clear & Professional</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex-1">
                      <Label htmlFor="language">Language</Label>
                      {voiceExamples[selectedVoice as keyof typeof voiceExamples] ? (
                        <Select 
                          value={selectedLanguage} 
                          onValueChange={setSelectedLanguage}
                          aria-label="Select voice language"
                        >
                          <SelectTrigger id="language">
                            <SelectValue placeholder="Select a language" />
                          </SelectTrigger>
                          <SelectContent>
                            {voiceExamples[selectedVoice as keyof typeof voiceExamples].languages.map((lang) => (
                              <SelectItem key={lang} value={lang}>
                                <div className="flex items-center gap-2">
                                  <span>{lang}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="text-sm text-destructive">Voice not found.</div>
                      )}
                    </div>
                  </div>

                  <Card className="mt-4 bg-muted/50">
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        <div className="flex flex-col gap-4">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">Languages:</span>
                            <div className="flex gap-2">
                              {voiceExamples[selectedVoice as keyof typeof voiceExamples]
                                ? voiceExamples[selectedVoice as keyof typeof voiceExamples].languages.map((lang, index) => (
                                    <Badge key={index} variant="secondary">{lang}</Badge>
                                  ))
                                : <span className="text-sm text-destructive">Voice not found.</span>
                              }
                            </div>
                          </div>
                          
                          <div className="flex flex-col gap-2">
                            <span className="font-medium text-sm">Specialties:</span>
                            <div className="flex flex-wrap gap-2">
                              {voiceExamples[selectedVoice as keyof typeof voiceExamples].specialties.map((specialty, index) => (
                                <Badge key={index} variant="outline">{specialty}</Badge>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-4 mt-4">
                            {voiceExamples[selectedVoice as keyof typeof voiceExamples].samples[selectedLanguage].map((sample, index) => (
                              <div key={index} className="space-y-2">
                                <p className="text-sm font-medium capitalize">{sample.type}:</p>
                                <p className="text-sm leading-6 p-3 bg-background/50 rounded-md" dir={selectedVoice === "shimmer" ? "rtl" : "ltr"}>
                                  {sample.text}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

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
                      onValueChange={(values: number[]) => setVoiceSpeed(values[0])}
                      aria-label="Adjust speech speed"
                    />
                  </div>

                  <Button
                    className="w-full mt-6"
                    onClick={async () => {
                      setIsProcessing(true);
                      try {
                        const sampleText = voiceExamples[selectedVoice as keyof typeof voiceExamples].samples[selectedLanguage].find(sample => sample.type === "general")?.text || "";
                        const { audioUrl } = await generateSpeech(sampleText, selectedVoice, voiceSpeed);
                        setAiAudioUrl(audioUrl);
                        toast({ title: "Preview Generated", description: "Listen to the voice preview." });
                      } catch (error) {
                        console.error("Error generating preview:", error);
                        toast({
                          title: "Error",
                          description: "Failed to generate voice preview.",
                          variant: "destructive",
                        });
                      } finally {
                        setIsProcessing(false);
                      }
                    }}
                    disabled={isProcessing}
                    aria-label="Preview AI voice"
                  >
                    {isProcessing ? (
                      <>
                        <Speaker className="mr-2 h-4 w-4 animate-pulse" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Speaker className="mr-2 h-4 w-4" />
                        Preview Voice
                      </>
                    )}
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

