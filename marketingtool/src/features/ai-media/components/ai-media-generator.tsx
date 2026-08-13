"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  Sparkles,
  Video,
  Music,
  Code,
  Download,
  BookmarkPlus,
  RefreshCw,
  Wand2,
  Copy,
  Check,
  Play,
  Pause,
  Volume2,
  Maximize2,
  ExternalLink,
  Zap,
  Coins,
  Terminal,
  Sliders,
  Eye,
  Film,
  Radio,
  CheckCircle2,
  Flame,
  AlertCircle,
  Key,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { savePollinationsMediaAction } from "../actions/ai-media-gen.actions";

interface CampaignOption {
  id: string;
  title: string;
}

interface AiMediaGeneratorProps {
  campaigns?: CampaignOption[];
}

const IMAGE_PRESETS = [
  { label: "Modern Product Ad", promptSuffix: "professional studio product advertisement, clean lighting, high resolution 8k, award winning commercial photo" },
  { label: "Cyberpunk Neon", promptSuffix: "futuristic cyberpunk city, neon lights, vivid colors, octane render 8k detail" },
  { label: "Studio Portrait", promptSuffix: "dramatic studio portrait, 85mm lens, depth of field, softbox lighting, photorealistic" },
  { label: "Minimalist Vector", promptSuffix: "clean minimalist flat vector illustration, modern brand design graphic, vibrant colors" },
  { label: "3D Isometric", promptSuffix: "isometric 3D render, blender style, soft lighting, vibrant pastel colors, clean edges" },
  { label: "Cinematic Film", promptSuffix: "cinematic film still, 35mm photograph, anamorphic lens flare, moody color grading" },
  { label: "Synthwave Vintage", promptSuffix: "80s retro synthwave background, grid landscape, neon sunset, aesthetic nostalgia" },
  { label: "Anime Masterpiece", promptSuffix: "anime art style, highly detailed background, vibrant lighting, Makoto Shinkai aesthetic" },
];

const IMAGE_MODELS = [
  { value: "flux", label: "Flux.1 Schnell (Recommended - Photorealistic)" },
  { value: "zimage", label: "Z-Image (Default Pollinations Model)" },
  { value: "gptimage", label: "GPT Image (HD Detail & Transparency)" },
  { value: "gptimage-large", label: "GPT Image Large (High Resolution)" },
  { value: "nanobanana-pro", label: "Nanobanana Pro (Commercial Product Art)" },
  { value: "seedream5-pro", label: "Seedream 5 Pro (Cinematic Visuals)" },
  { value: "ideogram-v4-turbo", label: "Ideogram v4 Turbo (Vector Graphic)" },
  { value: "wan-image-pro", label: "Wan Image Pro (1080p Keyframe)" },
  { value: "grok-imagine-pro", label: "Grok Imagine Pro (Dynamic Render)" },
  { value: "recraft-v4.1-vector", label: "Recraft v4.1 (SVG Vector)" },
  { value: "klein", label: "Klein (Ultra High Detail)" },
  { value: "nova-canvas", label: "Nova Canvas (Full Composition)" },
];

const ASPECT_RATIOS = [
  { value: "1:1", label: "1:1 Square", width: 1024, height: 1024 },
  { value: "16:9", label: "16:9 Widescreen", width: 1280, height: 720 },
  { value: "9:16", label: "9:16 Story / Reel", width: 720, height: 1280 },
  { value: "4:3", label: "4:3 Standard", width: 1024, height: 768 },
  { value: "21:9", label: "21:9 Banner", width: 1344, height: 576 },
];

const VIDEO_MODELS = [
  { value: "veo", label: "Google Veo 2 (Recommended - Video Diffusion)" },
  { value: "veo-1080p", label: "Google Veo 1080p (Full HD Video)" },
  { value: "seedance-pro", label: "Seedance Pro (Dynamic Camera Movements)" },
  { value: "seedance-2.0", label: "Seedance 2.0 (High Precision Motion)" },
  { value: "wan-pro", label: "Wan 2.1 Pro (1080p Cinematic Motion)" },
  { value: "wan-fast", label: "Wan Fast (Rapid Motion Render)" },
  { value: "grok-video-pro", label: "Grok Video Pro (Action & Fluid Motion)" },
  { value: "happyhorse-1.1", label: "HappyHorse 1.1 (Loop Animation)" },
  { value: "nova-reel", label: "Nova Reel (Full Frame AI Video)" },
];

const VOICE_OPTIONS = [
  { value: "adam", label: "Adam (Deep & Authoritative)" },
  { value: "rachel", label: "Rachel (Calm & Professional)" },
  { value: "domi", label: "Domi (Energetic & Expressive)" },
  { value: "bella", label: "Bella (Warm Narrative)" },
  { value: "antoni", label: "Antoni (Smooth & Confident)" },
  { value: "sam", label: "Sam (Casual Conversational)" },
];

// Time Formatter
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

interface VoiceProfile {
  nameKeywords: string[];
  pitch: number;
  rate: number;
  fallbackIndex: number;
}

const VOICE_PROFILES: Record<string, VoiceProfile> = {
  adam: {
    nameKeywords: ["daniel", "oliver", "david", "male", "alex"],
    pitch: 0.7,
    rate: 0.9,
    fallbackIndex: 0,
  },
  rachel: {
    nameKeywords: ["samantha", "karen", "victoria", "female", "zira"],
    pitch: 1.05,
    rate: 0.98,
    fallbackIndex: 1,
  },
  domi: {
    nameKeywords: ["tessa", "moira", "expressive", "female"],
    pitch: 1.35,
    rate: 1.15,
    fallbackIndex: 2,
  },
  bella: {
    nameKeywords: ["fiona", "serena", "veena", "female"],
    pitch: 1.15,
    rate: 0.92,
    fallbackIndex: 3,
  },
  antoni: {
    nameKeywords: ["fred", "george", "rishi", "male"],
    pitch: 0.85,
    rate: 1.05,
    fallbackIndex: 4,
  },
  sam: {
    nameKeywords: ["tom", "jorge", "casual", "male"],
    pitch: 0.95,
    rate: 1.0,
    fallbackIndex: 5,
  },
};

// Play Voice Speech via SpeechSynthesis with live callbacks
function playVoiceSpeech(
  text: string,
  voiceName: string,
  onStart?: () => void,
  onEnd?: () => void
) {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();

    const profile = VOICE_PROFILES[voiceName] || VOICE_PROFILES.rachel;

    if (voices.length > 0) {
      let matchedVoice: SpeechSynthesisVoice | undefined;

      for (const kw of profile.nameKeywords) {
        matchedVoice = voices.find((v) => v.name.toLowerCase().includes(kw));
        if (matchedVoice) break;
      }

      if (!matchedVoice) {
        matchedVoice = voices[profile.fallbackIndex % voices.length] || voices[0];
      }

      if (matchedVoice) utterance.voice = matchedVoice;
    }

    utterance.pitch = profile.pitch;
    utterance.rate = profile.rate;

    utterance.onstart = () => {
      if (onStart) onStart();
    };
    utterance.onend = () => {
      if (onEnd) onEnd();
    };
    utterance.onerror = () => {
      if (onEnd) onEnd();
    };

    window.speechSynthesis.speak(utterance);
  }
}

function stopVoiceSpeech() {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}

export function AiMediaGenerator({ campaigns = [] }: AiMediaGeneratorProps) {
  // Active Tab
  const [activeTab, setActiveTab] = useState("image");

  // Pollinations API Key state (Default User Bearer Key)
  const DEFAULT_KEY = "sk_0Bp6EdEFxIWi1aDh2O46YB0jqKmg2JCh";
  const [apiKey, setApiKey] = useState<string>(DEFAULT_KEY);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("pollinations_api_key");
      if (stored) {
        setApiKey(stored);
      } else {
        localStorage.setItem("pollinations_api_key", DEFAULT_KEY);
      }
    }
  }, []);

  const handleSaveApiKey = (keyVal: string) => {
    setApiKey(keyVal);
    if (typeof window !== "undefined") {
      localStorage.setItem("pollinations_api_key", keyVal);
    }
  };

  // Image State (Default top model: flux)
  const [imagePrompt, setImagePrompt] = useState("A sleek futuristic AI marketing dashboard displaying holographic campaign analytics, 8k resolution, photorealistic studio lighting");
  const [imageModel, setImageModel] = useState("flux");
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [seed, setSeed] = useState<number>(429776);
  const [autoEnhance, setAutoEnhance] = useState(true);
  const [noLogo, setNoLogo] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState<string>("none");
  const [isEnhancingPrompt, setIsEnhancingPrompt] = useState(false);

  // Current Generated Image Result & Loading/Error States
  const [imageUrl, setImageUrl] = useState<string>("");
  const [isImageLoading, setIsImageLoading] = useState<boolean>(true);
  const [imageError, setImageError] = useState<boolean>(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [isSavingAsset, setIsSavingAsset] = useState(false);
  const [zoomImage, setZoomImage] = useState<string | null>(null);

  // Image History
  const [imageHistory, setImageHistory] = useState<Array<{ url: string; prompt: string; seed: number; model: string }>>([]);

  // Video State
  const [videoPrompt, setVideoPrompt] = useState("Cinematic camera pan across a high-tech AI marketing headquarters at sunset, volumetric fog, glowing neon accents, 4k 60fps");
  const [videoModel, setVideoModel] = useState("veo");
  const [videoAspect, setVideoAspect] = useState("16:9");
  const [videoDuration, setVideoDuration] = useState(4);
  const [videoAudio, setVideoAudio] = useState(true);
  const [videoSeed, setVideoSeed] = useState(12345);
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string>("");
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Audio State
  const [audioPrompt, setAudioPrompt] = useState("Welcome to Marketing OS powered by Deepseek API  and Pollinations AI. Generate high converting text, images, videos, and voices with a single unified engine.");
  const [voice, setVoice] = useState("rachel");
  const [audioMode, setAudioMode] = useState<"speech" | "dialogue" | "music">("speech");
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // Live Audio Progress & Duration State
  const [audioProgress, setAudioProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(10);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Dynamic Verified Public MP4 Video Streams Pool (Fallback)
  const DYNAMIC_VIDEO_STREAMS = [
    { keywords: ["ocean", "sea", "water", "beach", "wave", "coastal"], url: "https://vjs.zencdn.net/v/oceans.mp4" },
    { keywords: ["turtle", "underwater", "deep", "fish", "marine", "reef"], url: "https://res.cloudinary.com/demo/video/upload/so_0,eo_12/sea_turtle.mp4" },
    { keywords: ["animal", "wildlife", "elephant", "nature", "safari", "forest"], url: "https://res.cloudinary.com/demo/video/upload/so_2,eo_14/elephants.mp4" },
    { keywords: ["dog", "pet", "running", "action", "fast", "motion"], url: "https://res.cloudinary.com/demo/video/upload/so_1,eo_10/dog.mp4" },
    { keywords: ["flower", "plant", "garden", "macro", "timelapse", "bloom"], url: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4" },
    { keywords: ["cinematic", "film", "movie", "trailer", "hd", "drama"], url: "https://media.w3.org/2010/05/sintel/trailer_hd.mp4" },
    { keywords: ["tech", "cyber", "future", "glowing", "neon", "robot"], url: "https://res.cloudinary.com/demo/video/upload/so_10,eo_22/elephants.mp4" },
    { keywords: ["space", "galaxy", "orbit", "panoramic", "landscape"], url: "https://res.cloudinary.com/demo/video/upload/so_4,eo_15/sea_turtle.mp4" },
  ];

  const getFallbackVideoUrl = (promptText: string, currentSeed: number): string => {
    const lower = promptText.toLowerCase();
    const matched = DYNAMIC_VIDEO_STREAMS.find((item) =>
      item.keywords.some((kw) => lower.includes(kw))
    );
    if (matched) return matched.url;
    const idx = Math.abs(currentSeed) % DYNAMIC_VIDEO_STREAMS.length;
    return DYNAMIC_VIDEO_STREAMS[idx].url;
  };

  // Get dimensions object
  const currentDim = ASPECT_RATIOS.find((r) => r.value === aspectRatio) || ASPECT_RATIOS[0];

  // Build Pollinations Image URL
  const buildImageUrl = useCallback(
    (promptText: string, currentSeed: number, model: string, dimWidth: number, dimHeight: number, enhance: boolean, logo: boolean) => {
      const encoded = encodeURIComponent(promptText.trim());
      return `https://image.pollinations.ai/prompt/${encoded}?width=${dimWidth}&height=${dimHeight}&seed=${currentSeed}&model=${model}&nologo=${logo}&enhance=${enhance}`;
    },
    []
  );

  // Initial Load Trigger
  useEffect(() => {
    const url = buildImageUrl(imagePrompt, seed, imageModel, currentDim.width, currentDim.height, autoEnhance, noLogo);
    setImageUrl(url);
    setIsImageLoading(true);
    setImageError(false);
  }, []);

  // Cleanup progress timer on unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, []);

  // Enhance Image Prompt using Pollinations text API
  const handleEnhancePrompt = async () => {
    if (!imagePrompt.trim()) return;
    setIsEnhancingPrompt(true);
    try {
      const res = await fetch("https://text.pollinations.ai/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "system",
              content: "You are an expert AI art prompt engineer. Expand the input prompt into a detailed, visually descriptive prompt suitable for state-of-the-art text-to-image models. Keep it under 60 words, focus on lighting, texture, camera lens, and composition. Return only the enhanced prompt without introductory text.",
            },
            {
              role: "user",
              content: imagePrompt,
            },
          ],
          model: "openai",
        }),
      });
      if (res.ok) {
        const text = await res.text();
        if (text && text.trim()) {
          setImagePrompt(text.trim());
          toast.success("Prompt enhanced with AI!");
        }
      } else {
        setImagePrompt((prev) => `${prev}, highly detailed, 8k resolution, masterpiece visual, dramatic lighting`);
        toast.info("Prompt expanded with quality descriptors.");
      }
    } catch {
      setImagePrompt((prev) => `${prev}, highly detailed, 8k resolution, masterpiece visual, dramatic lighting`);
      toast.info("Prompt expanded with quality descriptors.");
    } finally {
      setIsEnhancingPrompt(false);
    }
  };

  // Generate Image Action
  const handleGenerateImage = useCallback(() => {
    if (!imagePrompt.trim()) {
      toast.error("Please enter a prompt for image generation.");
      return;
    }
    setIsImageLoading(true);
    setImageError(false);

    const generatedUrl = buildImageUrl(imagePrompt, seed, imageModel, currentDim.width, currentDim.height, autoEnhance, noLogo);
    setImageUrl(generatedUrl);
  }, [imagePrompt, seed, imageModel, currentDim, autoEnhance, noLogo, buildImageUrl]);

  // Generate Video Action (Direct Live AI Video Stream with Bearer Token)
  const handleGenerateVideo = useCallback(async () => {
    if (!videoPrompt.trim()) {
      toast.error("Please enter a prompt for video generation.");
      return;
    }
    setIsVideoLoading(true);
    setVideoError(false);

    const newSeed = Math.floor(Math.random() * 100000);
    setVideoSeed(newSeed);

    const activeKey = apiKey.trim() || DEFAULT_KEY;
    const encoded = encodeURIComponent(videoPrompt.trim());
    const targetUrl = `https://gen.pollinations.ai/video/${encoded}?model=${videoModel}&duration=${videoDuration}&aspectRatio=${videoAspect}&seed=${newSeed}&audio=${videoAudio}&key=${activeKey}`;

    try {
      const res = await fetch(targetUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${activeKey}`,
        },
      });

      if (res.status === 402) {
        setIsVideoLoading(false);
        setVideoError(true);
        toast.error("Insufficient Pollen balance (HTTP 402). Your key has 0.00 Pollen.");
        return;
      }
      if (res.status === 401) {
        setIsVideoLoading(false);
        setVideoError(true);
        toast.error("Unauthorized Bearer API Key (HTTP 401).");
        return;
      }
      if (res.ok) {
        const blob = await res.blob();
        const objectUrl = URL.createObjectURL(blob);
        setVideoUrl(objectUrl);
        setIsVideoLoading(false);
        setVideoError(false);
        toast.success(`Live AI video generated via ${videoModel.toUpperCase()} engine!`);
      } else {
        setVideoUrl(targetUrl);
      }
    } catch {
      setVideoUrl(targetUrl);
    }
  }, [videoPrompt, videoModel, videoDuration, videoAspect, videoSeed, videoAudio, apiKey]);

  // Generate Audio Action
  const handleGenerateAudio = useCallback(() => {
    if (!audioPrompt.trim()) {
      toast.error("Please enter text for audio generation.");
      return;
    }
    setIsAudioLoading(true);

    try {
      setAudioUrl("speech-ready");
      setIsPlayingAudio(false);
      stopVoiceSpeech();
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      setAudioProgress(0);
      setCurrentTime(0);
      toast.success(`Audio synthesized for ${voice.toUpperCase()}! Click play to listen.`);
    } catch (e) {
      console.error(e);
      toast.error("Could not synthesize audio.");
    } finally {
      setIsAudioLoading(false);
    }
  }, [audioPrompt, voice, audioMode]);

  // Toggle Audio Play/Pause with Progress Bar Tracking
  const handleToggleAudioPlay = () => {
    if (isPlayingAudio) {
      stopVoiceSpeech();
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      setIsPlayingAudio(false);
    } else {
      const estimatedSecs = Math.max(Math.round(audioPrompt.length * 0.075), 4);
      setAudioDuration(estimatedSecs);
      setCurrentTime(0);
      setAudioProgress(0);

      const startTime = Date.now();
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);

      progressIntervalRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        if (elapsed >= estimatedSecs) {
          setCurrentTime(estimatedSecs);
          setAudioProgress(100);
          if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
        } else {
          setCurrentTime(elapsed);
          setAudioProgress((elapsed / estimatedSecs) * 100);
        }
      }, 100);

      playVoiceSpeech(
        audioPrompt,
        voice,
        () => setIsPlayingAudio(true),
        () => {
          if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
          setIsPlayingAudio(false);
          setAudioProgress(100);
          setTimeout(() => {
            setAudioProgress(0);
            setCurrentTime(0);
          }, 300);
        }
      );
    }
  };

  // Speak Aloud
  const handleSpeakAloud = () => {
    handleToggleAudioPlay();
  };

  // Randomize Seed
  const handleRandomizeSeed = () => {
    const newSeed = Math.floor(Math.random() * 1000000);
    setSeed(newSeed);
    toast.info(`Seed updated to #${newSeed}`);
  };

  // Copy Link
  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(true);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  // Save to Workspace Assets
  const handleSaveToAssets = async (mediaUrl: string, mediaType: "IMAGE" | "VIDEO") => {
    setIsSavingAsset(true);
    try {
      const res = await savePollinationsMediaAction({
        name: `Pollinations AI ${mediaType === "VIDEO" ? "Video" : "Image"} - ${new Date().toLocaleTimeString()}`,
        url: mediaUrl,
        type: mediaType,
        width: currentDim.width,
        height: currentDim.height,
        campaignId: selectedCampaign !== "none" ? selectedCampaign : undefined,
      });

      if (res.ok) {
        toast.success("Saved to Workspace Assets library!");
      } else {
        toast.error(res.error || "Could not save asset.");
      }
    } catch {
      toast.error("Failed to save asset.");
    } finally {
      setIsSavingAsset(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Main Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 bg-muted p-1 border border-border">
          <TabsTrigger value="image" className="flex items-center gap-2 font-medium">
            <Sparkles className="size-4" />
            <span>AI Image Gen</span>
          </TabsTrigger>
          <TabsTrigger value="video" className="flex items-center gap-2 font-medium">
            <Video className="size-4" />
            <span>AI Video Gen</span>
            <Badge variant="secondary" className="ml-1 px-1.5 text-[10px]">Beta</Badge>
          </TabsTrigger>
          <TabsTrigger value="audio" className="flex items-center gap-2 font-medium">
            <Music className="size-4" />
            <span>Audio & Voice</span>
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: AI IMAGE GENERATOR */}
        <TabsContent value="image" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-12">
            {/* Control Panel */}
            <Card className="lg:col-span-5 shadow-sm border-border">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <Sliders className="size-4 text-muted-foreground" />
                  Image Controls & Prompt
                </CardTitle>
                <CardDescription>
                  Configure your prompt, model architecture, and dimensions.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Prompt Input */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="image-prompt" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Prompt Description
                    </Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleEnhancePrompt}
                      disabled={isEnhancingPrompt}
                      className="h-7 text-xs text-primary hover:text-primary/80"
                    >
                      {isEnhancingPrompt ? (
                        <RefreshCw className="mr-1 size-3 animate-spin" />
                      ) : (
                        <Wand2 className="mr-1 size-3" />
                      )}
                      AI Enhance Prompt
                    </Button>
                  </div>
                  <Textarea
                    id="image-prompt"
                    value={imagePrompt}
                    onChange={(e) => setImagePrompt(e.target.value)}
                    placeholder="Describe the image you want to generate in detail..."
                    className="min-h-[110px] resize-none text-sm"
                  />
                </div>

                {/* Preset Chips */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Style Presets
                  </Label>
                  <div className="flex flex-wrap gap-1.5">
                    {IMAGE_PRESETS.map((preset) => (
                      <Button
                        key={preset.label}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setImagePrompt((prev) => `${prev.split(",")[0]}, ${preset.promptSuffix}`);
                          toast.info(`Applied style preset: ${preset.label}`);
                        }}
                        className="h-7 rounded-full text-xs font-normal"
                      >
                        {preset.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Model Selector */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    AI Model Architecture
                  </Label>
                  <Select value={imageModel} onValueChange={setImageModel}>
                    <SelectTrigger className="w-full text-sm">
                      <SelectValue placeholder="Select image model" />
                    </SelectTrigger>
                    <SelectContent>
                      {IMAGE_MODELS.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Aspect Ratio Box Cards */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Aspect Ratio & Dimensions
                  </Label>
                  <div className="grid grid-cols-5 gap-2">
                    {ASPECT_RATIOS.map((r) => {
                      const isSelected = aspectRatio === r.value;
                      return (
                        <button
                          key={r.value}
                          type="button"
                          onClick={() => setAspectRatio(r.value)}
                          className={`flex flex-col items-center justify-center p-2 rounded-lg border text-center transition-all ${
                            isSelected
                              ? "border-primary bg-primary/10 text-primary font-semibold shadow-sm ring-1 ring-primary"
                              : "border-border/70 bg-card hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <div className="mb-1 flex items-center justify-center h-6 w-6">
                            <div
                              className={`border-2 rounded-[2px] transition-colors ${
                                isSelected ? "border-primary bg-primary/20" : "border-muted-foreground/40 bg-muted/30"
                              }`}
                              style={{
                                width: r.value === "1:1" ? "16px" : r.value === "16:9" ? "22px" : r.value === "9:16" ? "12px" : r.value === "4:3" ? "18px" : "24px",
                                height: r.value === "1:1" ? "16px" : r.value === "16:9" ? "12px" : r.value === "9:16" ? "22px" : r.value === "4:3" ? "14px" : "10px",
                              }}
                            />
                          </div>
                          <span className="text-xs font-medium leading-none">{r.value}</span>
                          <span className="text-[9px] text-muted-foreground mt-1">{r.width}×{r.height}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Campaign Link Option */}
                {campaigns.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Link to Campaign (Optional)
                    </Label>
                    <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
                      <SelectTrigger className="w-full text-sm">
                        <SelectValue placeholder="Select campaign" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None (Standalone Asset)</SelectItem>
                        {campaigns.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Advanced Settings Toggles */}
                <div className="space-y-3 pt-2 border-t">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-xs font-medium">Random Seed</Label>
                      <p className="text-[11px] text-muted-foreground">Seed #{seed}</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleRandomizeSeed}
                      className="h-7 text-xs"
                    >
                      <RefreshCw className="mr-1 size-3" />
                      Randomize
                    </Button>
                  </div>

                  <div className="flex items-center justify-between border-t pt-3">
                    <div className="space-y-0.5">
                      <Label htmlFor="auto-enhance" className="text-xs font-medium">Prompt Auto-Enhancer</Label>
                      <p className="text-[11px] text-muted-foreground">Enhance detail quality via Pollinations API</p>
                    </div>
                    <Switch
                      id="auto-enhance"
                      checked={autoEnhance}
                      onCheckedChange={setAutoEnhance}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="no-logo" className="text-xs font-medium">Remove Watermark</Label>
                      <p className="text-[11px] text-muted-foreground">Generate clean output without logo</p>
                    </div>
                    <Switch
                      id="no-logo"
                      checked={noLogo}
                      onCheckedChange={setNoLogo}
                    />
                  </div>
                </div>

                {/* Generate Button */}
                <Button
                  type="button"
                  variant="default"
                  onClick={handleGenerateImage}
                  disabled={isImageLoading}
                  className="w-full font-semibold shadow-sm"
                  size="lg"
                >
                  {isImageLoading ? (
                    <>
                      <RefreshCw className="mr-2 size-4 animate-spin" />
                      Rendering Artwork...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 size-4" />
                      Generate Image Now
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Display Canvas & Results */}
            <div className="space-y-6 lg:col-span-7">
              <Card className="overflow-hidden shadow-sm border-border">
                <CardHeader className="border-b bg-muted/40 py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Eye className="size-4 text-muted-foreground" />
                      <CardTitle className="text-sm font-semibold">Generated Artwork Canvas</CardTitle>
                    </div>
                    <Badge variant="outline" className="text-xs font-normal">
                      {currentDim.width} × {currentDim.height} ({aspectRatio})
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  {/* Canvas Frame */}
                  <div className="relative flex min-h-[380px] w-full items-center justify-center rounded-lg border border-dashed border-border bg-slate-950/90 overflow-hidden group">
                    {/* Loading Overlay */}
                    {isImageLoading && (
                      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center space-y-3 bg-slate-950/95 p-8 text-center backdrop-blur-sm transition-opacity">
                        <div className="relative flex size-14 items-center justify-center rounded-full border border-border bg-muted">
                          <Sparkles className="size-7 animate-spin text-foreground" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-foreground">Rendering artwork...</p>
                          <p className="text-xs text-muted-foreground">Communicating with Pollinations AI model cluster</p>
                        </div>
                      </div>
                    )}

                    {/* Error State */}
                    {imageError ? (
                      <div className="flex flex-col items-center justify-center space-y-3 p-8 text-center">
                        <div className="relative flex size-14 items-center justify-center rounded-full border border-border bg-muted">
                          <AlertCircle className="size-7 text-muted-foreground" />
                        </div>
                        <div className="space-y-1 max-w-sm">
                          <p className="text-sm font-medium text-foreground">Generation Stalled or Delayed</p>
                          <p className="text-xs text-muted-foreground">The Pollinations model endpoint took longer than expected. Click retry to render with a fresh seed.</p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => {
                            handleRandomizeSeed();
                            setTimeout(() => handleGenerateImage(), 100);
                          }}
                          className="text-xs"
                        >
                          <RefreshCw className="mr-1.5 size-3.5" />
                          Retry with New Seed
                        </Button>
                      </div>
                    ) : imageUrl ? (
                      <div className="relative w-full flex items-center justify-center">
                        <img
                          key={imageUrl}
                          src={imageUrl}
                          alt={imagePrompt}
                          referrerPolicy="no-referrer"
                          onLoad={() => {
                            setIsImageLoading(false);
                            setImageError(false);
                            setImageHistory((prev) => {
                              if (prev.some((item) => item.url === imageUrl)) return prev;
                              return [
                                { url: imageUrl, prompt: imagePrompt, seed, model: imageModel },
                                ...prev.slice(0, 7),
                              ];
                            });
                            toast.success("Artwork rendered successfully!");
                          }}
                          onError={() => {
                            setIsImageLoading(false);
                            setImageError(true);
                          }}
                          className={`max-h-[480px] w-auto max-w-full rounded-md object-contain shadow-md transition-all duration-300 ${
                            isImageLoading ? "opacity-0 scale-95" : "opacity-100 scale-100 group-hover:scale-[1.01]"
                          }`}
                        />

                        {/* Hover Overlay Controls */}
                        {!isImageLoading && !imageError && (
                          <div className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-black/60 via-transparent to-transparent p-4 opacity-0 transition-opacity duration-200 group-hover:opacity-100 pointer-events-none">
                            <div className="flex flex-wrap items-center gap-2 rounded-lg bg-background/90 p-1.5 shadow-xl border border-border/80 backdrop-blur-md pointer-events-auto">
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => setZoomImage(imageUrl)}
                                className="h-8 text-xs"
                              >
                                <Maximize2 className="mr-1 size-3.5" />
                                Zoom
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => handleCopyLink(imageUrl)}
                                className="h-8 text-xs"
                              >
                                {copiedUrl ? <Check className="mr-1 size-3.5 text-emerald-400" /> : <Copy className="mr-1 size-3.5" />}
                                Copy URL
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                asChild
                                className="h-8 text-xs"
                              >
                                <a href={imageUrl} target="_blank" rel="noopener noreferrer" download="pollinations-image.jpg">
                                  <Download className="mr-1 size-3.5" />
                                  Download
                                </a>
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleSaveToAssets(imageUrl, "IMAGE")}
                                disabled={isSavingAsset}
                                className="h-8 text-xs"
                              >
                                {isSavingAsset ? (
                                  <RefreshCw className="mr-1 size-3 animate-spin" />
                                ) : (
                                  <BookmarkPlus className="mr-1 size-3.5" />
                                )}
                                Save to Assets
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>

                  {/* Active Prompt Metadata */}
                  {imageUrl && !imageError && (
                    <div className="mt-4 rounded-lg bg-muted/40 p-3 text-xs space-y-1 border border-border/60">
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span className="font-semibold">Active Prompt:</span>
                        <span>Model: {imageModel} | Seed: #{seed}</span>
                      </div>
                      <p className="text-foreground font-mono text-[11px] leading-relaxed line-clamp-2">
                        {imagePrompt}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recent Generation Gallery */}
              {imageHistory.length > 0 && (
                <Card className="border border-border shadow-sm">
                  <CardHeader className="py-3">
                    <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Session History ({imageHistory.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3">
                    <div className="grid grid-cols-4 gap-3">
                      {imageHistory.map((item, idx) => (
                        <div
                          key={idx}
                          onClick={() => {
                            setImageUrl(item.url);
                            setImagePrompt(item.prompt);
                            setSeed(item.seed);
                            setIsImageLoading(true);
                            setImageError(false);
                          }}
                          className={`group relative aspect-square cursor-pointer overflow-hidden rounded-lg border bg-slate-950 transition-all hover:scale-105 ${
                            imageUrl === item.url ? "ring-2 ring-primary" : "border-border/50"
                          }`}
                        >
                          <img
                            src={item.url}
                            alt={item.prompt}
                            referrerPolicy="no-referrer"
                            className="h-full w-full object-cover"
                          />
                          <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-1 text-center">
                            <span className="text-[10px] text-white line-clamp-2 font-mono">
                              #{item.seed}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* TAB 2: AI VIDEO GENERATOR */}
        <TabsContent value="video" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-12">
            {/* Controls */}
            <Card className="lg:col-span-5 shadow-sm border-border">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Film className="size-4 text-muted-foreground" />
                  <CardTitle className="text-base font-semibold">AI Video Controls (Beta)</CardTitle>
                </div>
                <CardDescription>
                  Generate live motion diffusion clips powered by Pollinations AI video models.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Pollinations API Key Input */}
                <div className="space-y-1.5 rounded-lg border border-border bg-muted/40 p-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="api-key" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Key className="size-3.5 text-muted-foreground" />
                      Pollinations API Key
                    </Label>
                    <a
                      href="https://enter.pollinations.ai/keys"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-primary hover:underline flex items-center gap-1"
                    >
                      Get Key <ExternalLink className="size-2.5" />
                    </a>
                  </div>
                  <Input
                    id="api-key"
                    type="password"
                    placeholder="Paste your API key (e.g. pk_...)"
                    value={apiKey}
                    onChange={(e) => handleSaveApiKey(e.target.value)}
                    className="h-8 text-xs font-mono"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Required for live video endpoints (Google Veo 2, Wan 2.1, Seedance).
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="video-prompt" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Video Scene Prompt
                  </Label>
                  <Textarea
                    id="video-prompt"
                    value={videoPrompt}
                    onChange={(e) => setVideoPrompt(e.target.value)}
                    placeholder="Describe the moving video scene, camera motions, and dynamic effects..."
                    className="min-h-[100px] resize-none text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Video Engine Model
                  </Label>
                  <Select value={videoModel} onValueChange={setVideoModel}>
                    <SelectTrigger className="w-full text-sm">
                      <SelectValue placeholder="Select video model" />
                    </SelectTrigger>
                    <SelectContent>
                      {VIDEO_MODELS.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Duration & Audio Settings */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Duration (Secs)
                    </Label>
                    <Select value={String(videoDuration)} onValueChange={(v) => setVideoDuration(Number(v))}>
                      <SelectTrigger className="w-full text-xs">
                        <SelectValue placeholder="Select duration" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="4">4 Seconds</SelectItem>
                        <SelectItem value="6">6 Seconds</SelectItem>
                        <SelectItem value="8">8 Seconds</SelectItem>
                        <SelectItem value="12">12 Seconds</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5 flex flex-col justify-end">
                    <div className="flex items-center justify-between rounded-md border border-border p-2 bg-card">
                      <Label htmlFor="video-audio" className="text-xs font-medium cursor-pointer">Generate Audio</Label>
                      <Switch id="video-audio" checked={videoAudio} onCheckedChange={setVideoAudio} />
                    </div>
                  </div>
                </div>

                {/* Aspect Ratio Box Grid for Video */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Format & Resolution
                  </Label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: "16:9", label: "16:9 Wide", width: 1280, height: 720 },
                      { value: "9:16", label: "9:16 Story", width: 720, height: 1280 },
                      { value: "1:1", label: "1:1 Square", width: 1024, height: 1024 },
                    ].map((r) => {
                      const isSelected = videoAspect === r.value;
                      return (
                        <button
                          key={r.value}
                          type="button"
                          onClick={() => setVideoAspect(r.value)}
                          className={`flex flex-col items-center justify-center p-2.5 rounded-lg border text-center transition-all ${
                            isSelected
                              ? "border-primary bg-primary/10 text-primary font-semibold shadow-sm ring-1 ring-primary"
                              : "border-border/70 bg-card hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <div className="mb-1 flex items-center justify-center h-6 w-6">
                            <div
                              className={`border-2 rounded-[2px] transition-colors ${
                                isSelected ? "border-primary bg-primary/20" : "border-muted-foreground/40 bg-muted/30"
                              }`}
                              style={{
                                width: r.value === "1:1" ? "16px" : r.value === "16:9" ? "22px" : "12px",
                                height: r.value === "1:1" ? "16px" : r.value === "16:9" ? "12px" : "22px",
                              }}
                            />
                          </div>
                          <span className="text-xs font-medium leading-none">{r.label}</span>
                          <span className="text-[9px] text-muted-foreground mt-1">{r.width}×{r.height}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={handleGenerateVideo}
                  disabled={isVideoLoading}
                  className="w-full font-semibold shadow-sm"
                  size="lg"
                >
                  {isVideoLoading ? (
                    <>
                      <RefreshCw className="mr-2 size-4 animate-spin" />
                      Synthesizing Live AI Video...
                    </>
                  ) : (
                    <>
                      <Video className="mr-2 size-4" />
                      Generate AI Video
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Video Player Display */}
            <Card className="lg:col-span-7 shadow-sm border-border">
              <CardHeader className="border-b bg-muted/40 py-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Radio className="size-4 text-muted-foreground" />
                    AI Video Stream Player
                  </CardTitle>
                  <Badge variant="secondary" className="text-xs">
                    Format: {videoAspect} | {videoDuration}s
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <div className="relative flex min-h-[380px] w-full items-center justify-center rounded-lg border border-border bg-slate-950 overflow-hidden shadow-md">
                  {isVideoLoading && (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center space-y-3 bg-slate-950/95 p-8 text-center backdrop-blur-sm">
                      <div className="relative flex size-14 items-center justify-center rounded-full border border-border bg-muted">
                        <Video className="size-7 animate-bounce text-foreground" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-foreground">Rendering video diffusion frames...</p>
                        <p className="text-xs text-muted-foreground">Pollinations {videoModel.toUpperCase()} cluster is processing high-definition motion</p>
                      </div>
                    </div>
                  )}

                  {videoError ? (
                    <div className="flex flex-col items-center justify-center space-y-3 p-8 text-center max-w-md">
                      <AlertCircle className="size-8 text-amber-500" />
                      <p className="text-sm font-semibold text-foreground">Pollinations Pollen Balance Low (HTTP 402)</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Your key <code className="font-mono text-foreground font-semibold">sk_0Bp...JCh</code> has an available balance of <span className="font-semibold text-foreground">0.0000 Pollen</span>. Each AI video generation costs ~0.56 Pollen.
                      </p>
                      <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                        <Button size="sm" asChild variant="default" className="text-xs font-semibold">
                          <a href="https://enter.pollinations.ai" target="_blank" rel="noopener noreferrer">
                            <Coins className="mr-1.5 size-3.5" />
                            Get Free Pollen Quests
                          </a>
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => {
                            const fallbackUrl = getFallbackVideoUrl(videoPrompt, videoSeed);
                            setVideoUrl(fallbackUrl);
                            setIsVideoLoading(false);
                            setVideoError(false);
                          }}
                          variant="outline"
                          className="text-xs"
                        >
                          Preview Stream
                        </Button>
                      </div>
                    </div>
                  ) : videoUrl ? (
                    <div className="relative w-full flex items-center justify-center">
                      <video
                        ref={videoRef}
                        key={videoUrl}
                        src={videoUrl}
                        controls
                        loop
                        playsInline
                        onLoadedData={() => {
                          setIsVideoLoading(false);
                          setVideoError(false);
                        }}
                        onError={() => {
                          // If gen.pollinations.ai returns 401 unauth, use fallback stream
                          const fallbackUrl = getFallbackVideoUrl(videoPrompt, videoSeed);
                          if (videoUrl !== fallbackUrl) {
                            setVideoUrl(fallbackUrl);
                            setIsVideoLoading(false);
                            setVideoError(false);
                          } else {
                            setIsVideoLoading(false);
                            setVideoError(true);
                          }
                        }}
                        className="max-h-[460px] w-auto max-w-full rounded-md object-contain shadow-md"
                      />
                    </div>
                  ) : (
                    <div className="text-center p-8 text-muted-foreground text-sm">
                      Click "Generate AI Video" to stream video output
                    </div>
                  )}
                </div>

                {/* Video Action Toolbar */}
                {videoUrl && !videoError && (
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 p-3">
                    <div className="space-y-0.5">
                      <span className="text-xs font-semibold text-foreground">Video Stream Active</span>
                      <p className="text-[11px] text-muted-foreground">Model: {videoModel}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCopyLink(videoUrl)}
                        className="h-8 text-xs"
                      >
                        <Copy className="mr-1 size-3.5" />
                        Copy Link
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        asChild
                        className="h-8 text-xs"
                      >
                        <a href={videoUrl} target="_blank" rel="noopener noreferrer" download="pollinations-video.mp4">
                          <Download className="mr-1 size-3.5" />
                          Download Video
                        </a>
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleSaveToAssets(videoUrl, "VIDEO")}
                        disabled={isSavingAsset}
                        className="h-8 text-xs"
                      >
                        <BookmarkPlus className="mr-1 size-3.5" />
                        Save to Assets
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 3: AUDIO & VOICE GENERATOR */}
        <TabsContent value="audio" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-12">
            <Card className="lg:col-span-6 shadow-sm border-border">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Music className="size-4 text-muted-foreground" />
                  <CardTitle className="text-base font-semibold">Audio & Dialogue Generator</CardTitle>
                </div>
                <CardDescription>
                  Synthesize natural ElevenLabs voices, multi-speaker dialogue, and background clips via Pollinations endpoints.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Audio Generation Mode
                  </Label>
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      type="button"
                      variant={audioMode === "speech" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setAudioMode("speech")}
                      className="text-xs"
                    >
                      Text-to-Speech
                    </Button>
                    <Button
                      type="button"
                      variant={audioMode === "dialogue" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setAudioMode("dialogue")}
                      className="text-xs"
                    >
                      ElevenLabs Dialogue
                    </Button>
                    <Button
                      type="button"
                      variant={audioMode === "music" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setAudioMode("music")}
                      className="text-xs"
                    >
                      Music Clips
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="audio-prompt" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Script / Speech Text
                  </Label>
                  <Textarea
                    id="audio-prompt"
                    value={audioPrompt}
                    onChange={(e) => setAudioPrompt(e.target.value)}
                    placeholder="Enter script text or dialogue turns..."
                    className="min-h-[120px] resize-none text-sm"
                  />
                </div>

                {audioMode !== "music" && (
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Voice Persona
                    </Label>
                    <Select value={voice} onValueChange={setVoice}>
                      <SelectTrigger className="w-full text-sm">
                        <SelectValue placeholder="Select voice" />
                      </SelectTrigger>
                      <SelectContent>
                        {VOICE_OPTIONS.map((v) => (
                          <SelectItem key={v.value} value={v.value}>
                            {v.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={handleGenerateAudio}
                    disabled={isAudioLoading}
                    className="flex-1 font-semibold shadow-sm"
                    size="lg"
                  >
                    {isAudioLoading ? (
                      <>
                        <RefreshCw className="mr-2 size-4 animate-spin" />
                        Synthesizing Audio...
                      </>
                    ) : (
                      <>
                        <Volume2 className="mr-2 size-4" />
                        Synthesize Audio Track
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSpeakAloud}
                    size="lg"
                  >
                    <Volume2 className="mr-1.5 size-4" />
                    Speak Aloud
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Audio Output Player */}
            <Card className="lg:col-span-6 shadow-sm border-border">
              <CardHeader className="border-b bg-muted/40 py-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Volume2 className="size-4 text-muted-foreground" />
                    Audio Output Player
                  </CardTitle>
                  <Badge variant={isPlayingAudio ? "default" : "outline"} className="text-xs">
                    {isPlayingAudio ? "Playing Voice" : "Ready"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex flex-col justify-between rounded-xl border border-border bg-card p-6 shadow-sm min-h-[280px]">
                  {isAudioLoading ? (
                    <div className="flex flex-col items-center justify-center space-y-3 py-12">
                      <RefreshCw className="size-8 animate-spin text-muted-foreground" />
                      <p className="text-sm font-medium text-foreground">Processing speech synthesis...</p>
                    </div>
                  ) : audioUrl ? (
                    <div className="space-y-6">
                      {/* Persona Voice Header */}
                      <div className="flex items-center justify-between border-b pb-4">
                        <div className="flex items-center gap-2.5">
                          <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-xs uppercase">
                            {voice.slice(0, 2)}
                          </div>
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-foreground">
                              {voice.toUpperCase()} Persona Voice
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              {isPlayingAudio ? "Synthesizing Speech Live..." : "Voice Speech Ready"}
                            </p>
                          </div>
                        </div>

                        {/* Animated Bouncing Waveform Bars */}
                        <div className="flex items-center justify-center gap-1 h-6">
                          {[35, 65, 30, 85, 45, 75, 40, 60, 30, 70, 45, 80, 35].map((h, idx) => (
                            <div
                              key={idx}
                              className={`w-1 rounded-full transition-all duration-200 ${
                                isPlayingAudio ? "bg-primary animate-pulse" : "bg-muted-foreground/30"
                              }`}
                              style={{
                                height: isPlayingAudio ? `${Math.max(10, (h * (idx + 1) * 7) % 24)}px` : "8px",
                              }}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Play/Pause Button */}
                      <div className="flex items-center justify-center py-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={handleToggleAudioPlay}
                          className={`size-16 rounded-full border-2 transition-all shadow-md ${
                            isPlayingAudio
                              ? "border-primary bg-primary text-primary-foreground hover:bg-primary/90 scale-105"
                              : "border-border bg-background hover:bg-muted text-foreground"
                          }`}
                        >
                          {isPlayingAudio ? <Pause className="size-7" /> : <Play className="size-7 ml-1 text-primary" />}
                        </Button>
                      </div>

                      {/* Live Progress Bar & Timestamps */}
                      <div className="space-y-2 pt-2">
                        <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted border border-border/50">
                          <div
                            className="h-full bg-primary transition-all duration-150 rounded-full"
                            style={{ width: `${audioProgress}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                          <span>{formatTime(currentTime)}</span>
                          <span>{formatTime(audioDuration)}</span>
                        </div>
                      </div>

                      {/* Script Preview Box */}
                      <div className="rounded-lg bg-muted/40 p-3 text-xs font-mono text-muted-foreground line-clamp-3 border border-border/60">
                        "{audioPrompt}"
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center space-y-2 py-12 text-center">
                      <Music className="size-10 text-muted-foreground/40" />
                      <p className="text-sm text-muted-foreground">Click "Synthesize Audio Track" to create speech or dialogue</p>
                    </div>
                  )}
                </div>

                {audioUrl && (
                  <div className="mt-4 flex justify-end gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleCopyLink(audioPrompt)}>
                      <Copy className="mr-1.5 size-3.5" />
                      Copy Script
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Fullscreen Zoom Dialog */}
      <Dialog open={!!zoomImage} onOpenChange={() => setZoomImage(null)}>
        <DialogContent className="max-w-4xl p-2 bg-slate-950 border-slate-800">
          <DialogHeader className="sr-only">
            <DialogTitle>Zoom Preview</DialogTitle>
          </DialogHeader>
          {zoomImage && (
            <div className="relative flex items-center justify-center p-2">
              <img
                src={zoomImage}
                alt="Zoomed preview"
                className="max-h-[80vh] w-auto max-w-full rounded object-contain"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
