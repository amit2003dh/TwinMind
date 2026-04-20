# TwinMind - Live Suggestions

**Live Demo:** [https://twin-mind-alpha.vercel.app/](https://twin-mind-alpha.vercel.app/)

An AI-powered meeting copilot that provides real-time transcription and intelligent suggestions during live conversations.

## 🚀 Features

- **Live Audio Capture**: Records microphone audio in 30-second chunks
- **Real-time Transcription**: Uses Groq's Whisper Large V3 for accurate speech-to-text
- **Intelligent Suggestions**: Generates 3 context-aware suggestions every 30 seconds using GPT-OSS 120B
- **Interactive Chat**: Click suggestions for detailed answers or ask questions directly
- **Full Session Export**: Export complete session data as JSON
- **Customizable Settings**: Modify prompts, context windows, and API configuration

## 🏗️ Architecture

### Tech Stack
- **Frontend**: Next.js 14 with TypeScript, TailwindCSS
- **Audio Processing**: Web Audio API with MediaRecorder
- **AI Integration**: Groq API (Whisper Large V3 + Llama 3 70B)
- **State Management**: React hooks with localStorage for settings

### Project Structure
```
├── app/                    # Next.js app router
│   ├── globals.css        # Global styles with Tailwind
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Main application page
├── components/             # React components
│   ├── ChatPanel.tsx      # Chat interface
│   ├── SettingsModal.tsx  # Configuration modal
│   ├── SuggestionsPanel.tsx # Live suggestions display
│   └── TranscriptPanel.tsx # Transcript viewer
├── hooks/                 # Custom React hooks
│   ├── useAudioCapture.ts # Audio recording logic
│   └── useGroqAPI.ts      # Groq API integration
└── README.md
```

## 🎯 Prompt Strategy

### Live Suggestions Prompt
The live suggestions prompt is engineered to generate exactly 3 varied, actionable suggestions:
- **Mix of types**: Questions to ask, talking points, fact-checks, clarifications
- **Context awareness**: Analyzes recent transcript for relevance
- **Concise previews**: Under 50 characters for immediate value
- **JSON format**: Ensures structured, parseable responses

### Detailed Answer Prompt
When users click suggestions, the detailed prompt:
- Uses full transcript context for comprehensive answers
- Provides actionable insights beyond the preview
- Maintains conversational context throughout the session

### Context Window Optimization
- **Live suggestions**: 1000 tokens (recent context only)
- **Detailed answers**: 4000 tokens (full conversation)
- Balances response quality with API efficiency

## 🛠️ Setup

### Prerequisites
- Node.js 18+ 
- Groq API key (get one at [groq.com](https://groq.com))

### Installation
1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Start development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000)

5. Click the Settings button and paste your Groq API key

## 🎮 Usage

1. **Start Recording**: Click the microphone button to begin audio capture
2. **View Transcript**: Real-time transcription appears in the left panel
3. **Get Suggestions**: 3 suggestions generate every 30 seconds in the middle panel
4. **Explore Details**: Click any suggestion for a detailed answer in the chat
5. **Ask Questions**: Type questions directly in the chat panel
6. **Export Session**: Download complete session data as JSON

## 🔧 Configuration

Access Settings to customize:
- **Groq API Key**: Your personal API key
- **Live Suggestion Prompt**: Modify suggestion generation logic
- **Detailed Answer Prompt**: Adjust response generation
- **Context Windows**: Tune token limits for different features
- **Reset to Defaults**: Restore original prompt configurations

## 🚀 Deployment

### Vercel (Recommended)
1. Push code to GitHub repository
2. Connect repository to Vercel
3. Set environment variable for `NEXT_PUBLIC_GROQ_API_KEY` (optional)
4. Deploy - users will configure their own API keys in the app

### Other Platforms
The app is fully serverless and can be deployed to:
- Netlify
- AWS Amplify
- Railway
- Any platform supporting Next.js

## 📊 Performance Considerations

### Latency Optimization
- **Audio chunking**: 30-second intervals balance freshness with processing time
- **Parallel processing**: Transcription and suggestion generation run concurrently
- **Efficient prompts**: Optimized for fast token generation

### API Usage
- **Whisper Large V3**: Charged per minute of audio
- **Llama 3 70B**: Charged per token (input + output)
- **Context management**: Sliding windows minimize token usage

## 🎨 UI/UX Design

### Three-Column Layout
- **Left**: Transcript with auto-scroll to latest
- **Middle**: Suggestions with newest at top, grouped by generation time
- **Right**: Continuous chat with message history

### Responsive Design
- Clean, modern interface using TailwindCSS
- Hover states and transitions for better UX
- Loading states and error handling
- Accessible color contrast and typography

## 🔍 Evaluation Criteria

This implementation focuses on:

1. **Suggestion Quality**: Varied, contextually relevant, actionable suggestions
2. **Prompt Engineering**: Optimized prompts for different use cases and contexts
3. **Real-time Performance**: Fast response times for live meeting scenarios
4. **Code Quality**: Clean, maintainable TypeScript with proper abstractions
5. **User Experience**: Intuitive interface matching the reference prototype

## 🤝 Contributing

This is a demonstration project. For production use, consider:
- User authentication and data persistence
- Enhanced error handling and retry logic
- Advanced audio processing (noise cancellation, speaker diarization)
- Multi-language support
- Integration with calendar and meeting platforms

## 📄 License

MIT License - feel free to use this code as inspiration for your own projects.
