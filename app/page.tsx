"use client";

import { useState, useEffect, useRef } from 'react';
import { Search, Download, Play, Loader2, Trash2, Volume2, Settings, Zap, Mic, Users, Star, ChevronDown, Filter, Upload, Sparkles, Bot, User, Speaker, List, Grid } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { SpeakingWaveform } from '@/components/ui/SpeakingWaveform';
import { VoiceRecorder } from '@/components/voice-recorder';
import { Waveform } from '@/components/ui/waveform';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { getOpenAIVoices, generateSpeech as generateOpenAISpeech } from '@/lib/openai';
import { getElevenLabsVoices, generateElevenLabsSpeech } from '@/lib/elevenlabs';

// Update the Voice interface to be a union type
type Voice = {
  id: string;
  name: string;
  category: string;
  description?: string;
  provider: 'openai' | 'elevenlabs';
  gender: 'male' | 'female' | 'neutral';
  accent?: string;
  rating?: number;
  usageCount?: number;
  languages?: string[];
  preview_url?: string;
  stability?: number;
  similarity?: number;
  style?: number;
  speaker_boost?: boolean;
};

// Helper function to check if voice is from OpenAI
const isOpenAIVoice = (voice: Voice): voice is Voice & { provider: 'openai' } => {
  return voice.provider === 'openai';
};

// Helper function to check if voice is from ElevenLabs
const isElevenLabsVoice = (voice: Voice): voice is Voice & { provider: 'elevenlabs' } => {
  return voice.provider === 'elevenlabs';
};

// Helper function to check if voice has rating
const hasRating = (voice: Voice): voice is Voice & { rating: number } => {
  return 'rating' in voice && voice.rating !== undefined;
};

// Helper function to check if voice has accent
const hasAccent = (voice: Voice): voice is Voice & { accent: string } => {
  return 'accent' in voice && voice.accent !== undefined;
};

// Helper function to check if voice has preview URL
const hasPreviewUrl = (voice: Voice): voice is Voice & { preview_url: string } => {
  return 'preview_url' in voice && voice.preview_url !== undefined;
};

// Helper function to check if voice has ElevenLabs specific settings
const hasElevenLabsSettings = (voice: Voice): voice is Voice & { stability: number; similarity: number; style: number } => {
  return isElevenLabsVoice(voice) && 'stability' in voice && 'similarity' in voice && 'style' in voice;
};

// Helper function to check if voice has usage count
const hasUsageCount = (voice: Voice): voice is Voice & { usageCount: number } => {
  return 'usageCount' in voice && voice.usageCount !== undefined;
};

interface Conversion {
  id: string;
  text: string;
  voiceName: string;
  audioUrl: string;
  timestamp: string;
  provider: string;
}

const HomePage = () => {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [filteredVoices, setFilteredVoices] = useState<Voice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<Voice | null>(null);
  const [text, setText] = useState<string>('Hello, this is a sample text to demonstrate the text-to-speech functionality. You can replace this with your own content.');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(1.0);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterProvider, setFilterProvider] = useState<'all' | 'openai' | 'elevenlabs'>('all');
  const [filterGender, setFilterGender] = useState<'all' | 'male' | 'female' | 'neutral'>('all');
  const [recentConversions, setRecentConversions] = useState<Conversion[]>([]);
  const [isPlaying, setIsPlaying] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [stability, setStability] = useState(80);
  const [similarity, setSimilarity] = useState(70);
  const [style, setStyle] = useState(0);
  const [speakerBoost, setSpeakerBoost] = useState(false);
  const [quota, setQuota] = useState(1000);
  const [previewingVoice, setPreviewingVoice] = useState<string | null>(null);
  const [previewAudio, setPreviewAudio] = useState<HTMLAudioElement | null>(null);
  const [isAutoGenerating, setIsAutoGenerating] = useState(false);
  const [typewriterIndex, setTypewriterIndex] = useState(0);
  const [gptGeneratedText, setGptGeneratedText] = useState("");
  const [selectedModel, setSelectedModel] = useState("openai");
  const [cardTab, setCardTab] = useState("text-to-speech");
  const [isRecording, setIsRecording] = useState(false);
  const [userAudioUrl, setUserAudioUrl] = useState("");
  const [aiAudioUrl, setAiAudioUrl] = useState("");
  const [isPlayingUser, setIsPlayingUser] = useState(false);
  const [isPlayingAI, setIsPlayingAI] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState("English");
  const [emotion, setEmotion] = useState<string>("");
  const [autoScroll, setAutoScroll] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const userAudioRef = useRef<HTMLAudioElement | null>(null);
  const aiAudioRef = useRef<HTMLAudioElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [voiceCategories, setVoiceCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'rating' | 'usage'>('rating');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedPreviewVoice, setSelectedPreviewVoice] = useState<Voice | null>(null);

  // Update the useEffect for fetching voices
  useEffect(() => {
    const fetchVoices = async () => {
      try {
        let voices: Voice[] = [];
        
        if (selectedModel === 'openai') {
          const openaiVoices = await getOpenAIVoices();
          voices = openaiVoices.map(voice => ({
            ...voice,
            provider: 'openai' as const
          }));
        } else if (selectedModel === 'elevenlabs') {
          const elevenlabsVoices = await getElevenLabsVoices();
          voices = elevenlabsVoices.map(voice => ({
            ...voice,
            provider: 'elevenlabs' as const,
            gender: voice.gender || 'neutral',
            usageCount: 0 // Initialize usage count
          }));
        }
        
        // Extract unique categories
        const categories = Array.from(new Set(voices.map(voice => voice.category)));
        setVoiceCategories(categories);
        
        setVoices(voices);
        setFilteredVoices(voices);
        if (voices.length > 0) {
          setSelectedVoice(voices[0]);
        }
      } catch (error) {
        console.error('Error fetching voices:', error);
        toast({
          title: "Error",
          description: "Failed to fetch voices. Please try again.",
          variant: "destructive",
        });
      }
    };

    fetchVoices();
  }, [selectedModel]);

  // Update the filtering logic
  useEffect(() => {
    let filtered = voices;
    
    if (searchQuery) {
      filtered = filtered.filter(voice =>
        voice.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        voice.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        voice.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(voice => voice.category === selectedCategory);
    }
    
    if (filterGender !== 'all') {
      filtered = filtered.filter(voice => voice.gender === filterGender);
    }

    // Sort voices
    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'rating':
          return (b.rating || 0) - (a.rating || 0);
        case 'usage':
          return (b.usageCount || 0) - (a.usageCount || 0);
        default:
          return 0;
      }
    });
    
    setFilteredVoices(filtered);
  }, [searchQuery, selectedCategory, filterGender, sortBy, voices]);

  // Update the handleTextToSpeech function
  const handleTextToSpeech = async () => {
    if (!selectedVoice || !text.trim()) {
      return;
    }

    setIsGenerating(true);
    setError(null);
    
    try {
      let result;
      
      if (selectedModel === 'openai') {
        result = await generateOpenAISpeech(text, selectedVoice.id, speed);
      } else {
        result = await generateElevenLabsSpeech(
          text,
          selectedVoice.id,
          stability / 100,
          similarity / 100,
          style / 100,
          speakerBoost
        );
      }

      const conversion: Conversion = {
        id: Date.now().toString(),
        text,
        voiceName: selectedVoice.name,
        audioUrl: result.audioUrl,
        timestamp: new Date().toLocaleString(),
        provider: selectedVoice.provider,
      };
      
      setRecentConversions(prev => [conversion, ...prev].slice(0, 10));
      setAiAudioUrl(result.audioUrl);
      
      // Calculate credits used (2 credits per 15 seconds, rounded up)
      const creditsUsed = Math.ceil((result.duration / 15) * 2);
      
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

      toast({ 
        title: "Success", 
        description: `Speech generated from your input. Used ${creditsUsed} credits.` 
      });
    } catch (error) {
      console.error("Error generating speech:", error);
      setError(error instanceof Error ? error.message : "Failed to generate speech. Please try again.");
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate speech. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Update the handlePreviewVoice function
  const handlePreviewVoice = async (voiceId: string) => {
    if (previewAudio) {
      previewAudio.pause();
      setPreviewAudio(null);
      setPreviewingVoice(null);
    }
    
    setPreviewingVoice(voiceId);
    try {
      let result;
      const voice = voices.find(v => v.id === voiceId);
      
      // Generate unique preview text based on voice characteristics
      let previewText = "This is a sample of the selected voice.";
      
      if (voice) {
        if (voice.provider === 'elevenlabs') {
          switch (voice.category?.toLowerCase()) {
            case 'storytelling':
              previewText = "Once upon a time, in a world of endless possibilities, where every voice tells a unique story...";
              break;
            case 'business':
              previewText = "Welcome to our quarterly earnings call. Today, we're excited to share our latest achievements and future strategies.";
              break;
            case 'education':
              previewText = "Today, we'll explore the fascinating world of quantum physics, where particles can exist in multiple states simultaneously.";
              break;
            case 'entertainment':
              previewText = "Lights, camera, action! Welcome to the most exciting show of the year, where dreams come to life!";
              break;
            case 'gaming':
              previewText = "Player one, your adventure begins now! Choose your path wisely, for every decision shapes your destiny.";
              break;
            default:
              previewText = `Hello! I'm ${voice.name}, and I'm here to bring your words to life with clarity and precision.`;
          }
        } else {
          // OpenAI voices
          switch (voice.name.toLowerCase()) {
            case 'alloy':
              previewText = "Welcome to the future of voice technology, where clarity meets versatility in perfect harmony.";
              break;
            case 'echo':
              previewText = "Hey there! I'm Echo, and I'm here to make your content come alive with warmth and personality!";
              break;
            case 'fable':
              previewText = "In a cozy little village, where stories come to life, I'm here to share tales of wonder and magic.";
              break;
            case 'nova':
              previewText = "3... 2... 1... Blast off into a world of dynamic energy and excitement!";
              break;
            case 'onyx':
              previewText = "Ladies and gentlemen, welcome to our annual shareholders meeting. Today, we'll discuss our strategic vision.";
              break;
            case 'shimmer':
              previewText = "Let's explore the fascinating world of neural networks and artificial intelligence together.";
              break;
            default:
              previewText = `Hello! I'm ${voice.name}, ready to bring your ideas to life with natural, expressive speech.`;
          }
        }
      }
      
      if (selectedModel === "elevenlabs") {
        result = await generateElevenLabsSpeech(
          previewText,
          voiceId,
          stability / 100,
          similarity / 100,
          style / 100,
          speakerBoost
        );
      } else {
        result = await generateOpenAISpeech(previewText, voiceId, 1.0);
      }

      const audio = new Audio(result.audioUrl);
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

  const getProviderColor = (provider: string) => {
    return provider === 'elevenlabs' ? 'bg-gradient-to-r from-purple-500 to-pink-500' : 'bg-gradient-to-r from-blue-500 to-cyan-500';
  };

  const getProviderBadge = (provider: string) => {
    return provider === 'elevenlabs' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700';
  };

  const handleAutoGenerateText = async () => {
    setIsAutoGenerating(true);
    try {
      const prompt = `Generate a short, 2-3 sentence sample text that best demonstrates the "${selectedVoice?.name}" voice, described as: ${selectedVoice?.description}. The text should be suitable for speech synthesis and showcase the unique qualities of this voice.`;
      
      const response = await fetch('/api/generate-text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate text');
      }

      const data = await response.json();
      setGptGeneratedText(data.text);
      setTypewriterIndex(0);
      setText(""); // Clear before animating
    } catch (error) {
      console.error('Error generating text:', error);
      toast({
        title: "Error",
        description: "Failed to generate sample text. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAutoGenerating(false);
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

  // Helper function to get trending voices (voices with highest ratings)
  const getTrendingVoices = () => {
    return [...voices]
      .filter(voice => hasRating(voice))
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 6);
  };

  // Update the getPopularVoices function
  const getPopularVoices = () => {
    return [...voices]
      .filter(voice => hasUsageCount(voice))
      .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
      .slice(0, 6);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-gray-200/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                <Volume2 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                  Audra
                </h1>
                <p className="text-sm text-gray-500">AI Voice Collection</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button variant="outline" size="icon" onClick={() => setSettingsOpen(true)}>
                <Settings className="h-5 w-5" />
              </Button>
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Search and Filters Bar */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search voices by name, category, or description..."
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select Provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="elevenlabs">ElevenLabs</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={(value) => setSortBy(value as any)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="rating">Rating</SelectItem>
                  <SelectItem value="usage">Usage</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              >
                {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Category Pills */}
        <div className="mb-8 overflow-x-auto">
          <div className="flex gap-2 min-w-max">
            <Button
              variant={selectedCategory === 'all' ? 'default' : 'outline'}
              onClick={() => setSelectedCategory('all')}
              className="whitespace-nowrap"
            >
              All Categories
            </Button>
            {voiceCategories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? 'default' : 'outline'}
                onClick={() => setSelectedCategory(category)}
                className="whitespace-nowrap"
              >
                {category}
              </Button>
            ))}
          </div>
        </div>

        {/* Trending Voices Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Trending Voices</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {getTrendingVoices().map((voice) => (
              <Card
                key={voice.id}
                className="cursor-pointer transition-all hover:shadow-md"
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className={`w-12 h-12 rounded-full ${getProviderColor(voice.provider)} flex items-center justify-center text-white font-semibold`}>
                        {voice.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{voice.name}</h3>
                        <div className="flex items-center space-x-2">
                          <Badge variant="secondary" className={getProviderBadge(voice.provider)}>
                            {voice.provider === 'elevenlabs' ? 'ElevenLabs' : 'OpenAI'}
                          </Badge>
                          {hasRating(voice) && (
                            <div className="flex items-center space-x-1">
                              <Star className="h-3 w-3 text-yellow-400 fill-current" />
                              <span className="text-xs text-gray-600">{voice.rating}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handlePreviewVoice(voice.id)}
                    >
                      {previewingVoice === voice.id ? (
                        <div className="w-4 h-4 bg-purple-500 rounded-full animate-pulse"></div>
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <Badge variant="outline">{voice.category}</Badge>
                    {hasAccent(voice) && <span>{voice.accent}</span>}
                    <span className="capitalize">{voice.gender}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Most Popular Voices Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Most Popular Voices</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {getPopularVoices().map((voice) => (
              <Card
                key={voice.id}
                className="cursor-pointer transition-all hover:shadow-md"
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className={`w-12 h-12 rounded-full ${getProviderColor(voice.provider)} flex items-center justify-center text-white font-semibold`}>
                        {voice.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{voice.name}</h3>
                        <div className="flex items-center space-x-2">
                          <Badge variant="secondary" className={getProviderBadge(voice.provider)}>
                            {voice.provider === 'elevenlabs' ? 'ElevenLabs' : 'OpenAI'}
                          </Badge>
                          {hasRating(voice) && (
                            <div className="flex items-center space-x-1">
                              <Star className="h-3 w-3 text-yellow-400 fill-current" />
                              <span className="text-xs text-gray-600">{voice.rating}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handlePreviewVoice(voice.id)}
                    >
                      {previewingVoice === voice.id ? (
                        <div className="w-4 h-4 bg-purple-500 rounded-full animate-pulse"></div>
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <Badge variant="outline">{voice.category}</Badge>
                    {hasAccent(voice) && <span>{voice.accent}</span>}
                    <span className="capitalize">{voice.gender}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* All Voices Section */}
        <section>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVoices.map((voice) => (
              <Card
                key={voice.id}
                className="cursor-pointer transition-all hover:shadow-md"
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className={`w-12 h-12 rounded-full ${getProviderColor(voice.provider)} flex items-center justify-center text-white font-semibold`}>
                        {voice.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{voice.name}</h3>
                        <div className="flex items-center space-x-2">
                          <Badge variant="secondary" className={getProviderBadge(voice.provider)}>
                            {voice.provider === 'elevenlabs' ? 'ElevenLabs' : 'OpenAI'}
                          </Badge>
                          {hasRating(voice) && (
                            <div className="flex items-center space-x-1">
                              <Star className="h-3 w-3 text-yellow-400 fill-current" />
                              <span className="text-xs text-gray-600">{voice.rating}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handlePreviewVoice(voice.id)}
                    >
                      {previewingVoice === voice.id ? (
                        <div className="w-4 h-4 bg-purple-500 rounded-full animate-pulse"></div>
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <Badge variant="outline">{voice.category}</Badge>
                    {hasAccent(voice) && <span>{voice.accent}</span>}
                    <span className="capitalize">{voice.gender}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Voice Preview Modal */}
        <Sheet open={showPreviewModal} onOpenChange={setShowPreviewModal}>
          <SheetContent side="right" className="max-w-md w-full">
            <SheetHeader>
              <SheetTitle>Voice Preview</SheetTitle>
            </SheetHeader>
            {selectedPreviewVoice && (
              <div className="mt-6 space-y-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-4">
                      <div className={`w-16 h-16 rounded-full ${getProviderColor(selectedPreviewVoice.provider)} flex items-center justify-center text-white text-xl font-semibold`}>
                        {selectedPreviewVoice.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold">{selectedPreviewVoice.name}</h3>
                        <p className="text-sm text-gray-600">{selectedPreviewVoice.category}</p>
                      </div>
                    </div>
                    <div className="mt-4">
                      <p className="text-sm text-gray-600">{selectedPreviewVoice.description}</p>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {selectedPreviewVoice.languages?.map(lang => (
                        <Badge key={lang} variant="secondary">{lang}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {hasElevenLabsSettings(selectedPreviewVoice) && (
                  <div className="space-y-4">
                    <div>
                      <Label>Stability: {selectedPreviewVoice.stability}%</Label>
                      <Slider
                        min={0}
                        max={100}
                        step={1}
                        value={[selectedPreviewVoice.stability]}
                        disabled
                      />
                    </div>
                    <div>
                      <Label>Similarity: {selectedPreviewVoice.similarity}%</Label>
                      <Slider
                        min={0}
                        max={100}
                        step={1}
                        value={[selectedPreviewVoice.similarity]}
                        disabled
                      />
                    </div>
                    <div>
                      <Label>Style: {selectedPreviewVoice.style}%</Label>
                      <Slider
                        min={0}
                        max={100}
                        step={1}
                        value={[selectedPreviewVoice.style]}
                        disabled
                      />
                    </div>
                  </div>
                )}

                <div className="flex justify-center">
                  <Button
                    onClick={() => handlePreviewVoice(selectedPreviewVoice.id)}
                    className="w-full"
                  >
                    {previewingVoice === selectedPreviewVoice.id ? (
                      <div className="w-4 h-4 bg-purple-500 rounded-full animate-pulse" />
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Preview Voice
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </SheetContent>
        </Sheet>
      </div>

      {/* Settings Sheet */}
      <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
        <SheetContent side="right" className="max-w-md w-full">
          <SheetHeader>
            <SheetTitle>Settings</SheetTitle>
          </SheetHeader>
          
          {/* Model Info Card */}
          <Card className="mt-6">
            <CardContent className="p-4">
              <div className="font-semibold mb-1">{selectedVoice?.name}</div>
              <div className="text-sm text-muted-foreground mb-2">{selectedVoice?.description}</div>
              <div className="flex gap-2 flex-wrap">
                {selectedVoice?.languages?.map(lang => (
                  <Badge key={lang} variant="secondary">{lang}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Voice Settings */}
          <div className="mt-6 space-y-6">
            {selectedModel === 'elevenlabs' && (
              <>
                <div>
                  <Label>Stability: {stability}%</Label>
                  <Slider
                    min={0}
                    max={100}
                    step={1}
                    value={[stability]}
                    onValueChange={(value) => setStability(value[0])}
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>More variable</span>
                    <span>More stable</span>
                  </div>
                </div>

                <div>
                  <Label>Similarity: {similarity}%</Label>
                  <Slider
                    min={0}
                    max={100}
                    step={1}
                    value={[similarity]}
                    onValueChange={(value) => setSimilarity(value[0])}
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Low</span>
                    <span>High</span>
                  </div>
                </div>

                <div>
                  <Label>Style Exaggeration: {style}%</Label>
                  <Slider
                    min={0}
                    max={100}
                    step={1}
                    value={[style]}
                    onValueChange={(value) => setStyle(value[0])}
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>None</span>
                    <span>Exaggerated</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={speakerBoost}
                    onCheckedChange={setSpeakerBoost}
                    id="speaker-boost"
                  />
                  <Label htmlFor="speaker-boost">Speaker boost</Label>
                </div>
              </>
            )}

            {selectedModel === 'openai' && (
              <div>
                <Label>Speed: {speed.toFixed(2)}x</Label>
                <Slider
                  min={0.5}
                  max={2.0}
                  step={0.01}
                  value={[speed]}
                  onValueChange={(value) => setSpeed(value[0])}
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>0.5x</span>
                  <span>2.0x</span>
                </div>
              </div>
            )}
          </div>

          <SheetFooter className="mt-6">
            <Button
              variant="outline"
              onClick={() => {
                if (selectedModel === "openai") {
                  setSpeed(1.0);
                } else {
                  setStability(80);
                  setSimilarity(70);
                  setStyle(0);
                  setSpeakerBoost(false);
                }
              }}
            >
              Reset
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Hidden audio elements */}
      {aiAudioUrl && (
        <audio
          ref={aiAudioRef}
          src={aiAudioUrl}
          onEnded={() => setIsPlayingAI(false)}
          onPause={() => setIsPlayingAI(false)}
          onPlay={() => setIsPlayingAI(true)}
        />
      )}
      {userAudioUrl && (
        <audio
          ref={userAudioRef}
          src={userAudioUrl}
          onEnded={() => setIsPlayingUser(false)}
          onPause={() => setIsPlayingUser(false)}
          onPlay={() => setIsPlayingUser(true)}
        />
      )}
    </div>
  );
};

export default HomePage;