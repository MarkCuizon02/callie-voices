import { CallStatus } from "@/lib/types";

export const voiceHistory = [
  {
    id: "msg1",
    date: new Date(2025, 3, 1, 14, 32),
    userMessage: "What's the weather forecast for San Francisco tomorrow?",
    aiResponse: "Tomorrow in San Francisco will be sunny with temperatures between 65°F and 72°F. There's a light breeze expected in the afternoon.",
    audioUrl: "https://example.com/audio1.mp3",
    voice: "alloy"
  },
  {
    id: "msg2",
    date: new Date(2025, 3, 1, 10, 15),
    userMessage: "Can you summarize the latest tech news?",
    aiResponse: "The latest tech news includes Apple announcing their new AR glasses, Tesla releasing a software update for autonomous driving, and Google launching a new AI research center in Tokyo.",
    audioUrl: "https://example.com/audio2.mp3",
    voice: "nova"
  },
  {
    id: "msg3",
    date: new Date(2025, 2, 28, 16, 45),
    userMessage: "What's a good recipe for dinner tonight?",
    aiResponse: "How about a quick pasta primavera? You'll need pasta, seasonal vegetables like bell peppers, zucchini, and cherry tomatoes, olive oil, garlic, and parmesan cheese. Sauté the veggies, cook the pasta, combine with some pasta water and cheese.",
    audioUrl: "https://example.com/audio3.mp3",
    voice: "echo"
  }
];

export const callHistory = [
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
