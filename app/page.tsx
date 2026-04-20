'use client'

import { useState, useEffect, useRef } from 'react'
import { Mic, MicOff, RefreshCw, Settings, Download } from 'lucide-react'

// Audio capture hook
const useAudioCapture = () => {
  const [isRecording, setIsRecording] = useState(false)
  const [audioChunks, setAudioChunks] = useState<Blob[]>([])
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunkIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const startRecording = async () => {
    try {
      console.log('Starting audio capture...')

      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('getUserMedia is not supported in this browser')
      }

      // Check available audio devices
      const devices = await navigator.mediaDevices.enumerateDevices()
      const audioInputs = devices.filter(device => device.kind === 'audioinput')
      console.log('Available audio inputs:', audioInputs.length)

      if (audioInputs.length === 0) {
        throw new Error('No microphone devices found')
      }

      console.log('Requesting microphone permission...')
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000
        }
      })

      console.log('Microphone access granted')

      streamRef.current = stream

      // Check browser support for different MIME types
      let mimeType = 'audio/webm;codecs=opus'
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/webm'
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'audio/mp4'
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = ''
          }
        }
      }

      const options = mimeType ? { mimeType } : {}
      console.log('Using MediaRecorder options:', options)

      const mediaRecorder = new MediaRecorder(stream, options)

      mediaRecorderRef.current = mediaRecorder
      setIsRecording(true)

      let chunkBuffer: Blob[] = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunkBuffer.push(event.data)
          console.log('Audio data received:', event.data.size, 'bytes')
        }
      }

      mediaRecorder.onstop = () => {
        console.log('MediaRecorder stopped')
        if (chunkBuffer.length > 0) {
          const chunkType = mimeType || 'audio/webm'
          const chunk = new Blob(chunkBuffer, { type: chunkType })
          setAudioChunks(prev => [...prev, chunk])
          console.log('Audio chunk created:', chunk.size, 'bytes', 'type:', chunkType)
          chunkBuffer = []
        }
      }

      // Create chunks every 30 seconds
      chunkIntervalRef.current = setInterval(() => {
        if (chunkBuffer.length > 0 && mediaRecorder.state === 'recording') {
          const chunkType = mimeType || 'audio/webm'
          const chunk = new Blob(chunkBuffer, { type: chunkType })
          setAudioChunks(prev => [...prev, chunk])
          console.log('Periodic audio chunk created:', chunk.size, 'bytes', 'type:', chunkType)
          chunkBuffer = []
        }
      }, 30000)

      mediaRecorder.start(1000) // Collect data every second
      console.log('Recording started successfully')

    } catch (error) {
      console.error('Error starting recording:', error)
      setIsRecording(false)

      // Handle specific errors
      if (error instanceof Error) {
        if (error.name === 'NotReadableError') {
          console.error('Microphone is already in use by another application')
          throw new Error('Microphone is already in use by another application. Please close the other application and try again.')
        } else if (error.name === 'NotAllowedError') {
          console.error('Microphone permission denied')
          throw new Error('Microphone permission denied. Please allow microphone access and try again.')
        } else if (error.name === 'NotFoundError') {
          console.error('No microphone device found')
          throw new Error('No microphone device found. Please connect a microphone and try again.')
        }
      }

      throw error
    }
  }

  const stopRecording = () => {
    console.log('Stopping audio capture...')

    if (chunkIntervalRef.current) {
      clearInterval(chunkIntervalRef.current)
      chunkIntervalRef.current = null
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track: MediaStreamTrack) => track.stop())
      streamRef.current = null
    }

    setIsRecording(false)
    console.log('Audio capture stopped')
  }

  return {
    isRecording,
    audioChunks,
    startRecording,
    stopRecording
  }
}

// Groq API hook
const useGroqAPI = () => {
  const [isLoading, setIsLoading] = useState(false)

  const getSettings = () => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('twinmind-settings')
      return saved ? JSON.parse(saved) : { groqApiKey: '' }
    }
    return { groqApiKey: '' }
  }

  const transcribeAudio = async (audioBlob: Blob): Promise<string | null> => {
    const settings = getSettings()

    console.log('Starting transcription with audio blob size:', audioBlob.size, 'bytes')

    const apiKey = settings.groqApiKey || process.env.NEXT_PUBLIC_GROQ_API_KEY
    if (!apiKey) {
      console.error('No Groq API key provided. Please add one in settings or .env')
      alert('Error: No Groq API key is currently configured. Please add one in the Settings menu (top right) or your local .env file before running features.')
      return null
    }

    setIsLoading(true)

    try {
      const formData = new FormData()
      formData.append('file', audioBlob, 'audio.webm')
      formData.append('model', 'whisper-large-v3')
      formData.append('language', 'en')
      formData.append('response_format', 'json')

      console.log('Sending transcription request to Groq API...')
      const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`
        },
        body: formData
      })

      console.log('Transcription response status:', response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Transcription API error:', response.status, errorText)
        return "Mock transcription: API error - " + errorText
      }

      const result = await response.json()
      console.log('Transcription result:', result)
      return result.text
    } catch (error) {
      console.error('Transcription error:', error)
      return "Mock transcription: Network error - " + (error as Error).message
    } finally {
      setIsLoading(false)
    }
  }

  const generateSuggestions = async (transcript: string): Promise<Array<{ preview: string, full: string }> | null> => {
    const settings = getSettings()

    console.log('Generating suggestions for transcript:', transcript.substring(0, 100) + '...')

    const apiKey = settings.groqApiKey || process.env.NEXT_PUBLIC_GROQ_API_KEY
    if (!apiKey) {
      console.error('No Groq API key provided. Please add one in settings or .env')
      alert('Error: No Groq API key is currently configured. Please add one in the Settings menu (top right) or your local .env file before running features.')
      return null
    }

    setIsLoading(true)

    try {
      const prompt = `Based on the following meeting transcript, generate exactly 3 useful suggestions. Each suggestion should be:
- Comprehensive and actionable for preview.
- Extremely contextually relevant precisely citing user content from what was just discussed in the meeting transcript.
- Valuable even without clicking for details. Under no circumstances should you give short responses; quote user statements.
- MUST have its preview start with EXACTLY one of these labels: "QUESTION TO ASK: ", "TALKING POINT: ", "ANSWER: ", or "FACT-CHECK: ".

Recent transcript context:
${transcript}

Return strictly in the following JSON format:
{
  "suggestions": [
    {
      "preview": "LABEL: Detailed preview highlighting exact user content",
      "full": "A comprehensive, multi-sentence response detailing the exact context, citing explicit user statements from the transcript. Do NOT leave short answers."
    }
  ]
}`

      console.log('Sending suggestions request to Groq API...')
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            {
              role: 'system',
              content: 'You are an AI assistant that generates exactly 3 JSON-formatted suggestions based on meeting transcripts. Always return valid JSON.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 2500,
          temperature: 0.7
        })
      })

      console.log('Suggestions response status:', response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Suggestions API error:', response.status, errorText)
        return null
      }

      const result = await response.json()
      console.log('Suggestions result:', result)

      const choice = result.choices[0]
      if (choice.finish_reason === 'length') {
        alert(`Token limit reached! The suggestions response was cut off at ${result.usage?.completion_tokens || 'maximum'} tokens. Please raise your max_tokens limit to prevent JSON truncation.`)
      }

      const content = choice.message.content

      try {
        const parsed = JSON.parse(content)
        console.log('Parsed suggestions:', parsed.suggestions)
        return parsed.suggestions || []
      } catch (parseError) {
        console.error('Failed to parse suggestions JSON:', parseError, 'Content:', content)
        return null
      }
    } catch (error) {
      console.error('Suggestions generation error:', error)
      return null
    } finally {
      setIsLoading(false)
    }
  }

  const generateChatResponse = async (question: string, transcript: string): Promise<string | null> => {
    const settings = getSettings()

    console.log('Generating chat response for question:', question)
    console.log('Transcript length:', transcript.length, 'characters')

    const apiKey = settings.groqApiKey || process.env.NEXT_PUBLIC_GROQ_API_KEY
    if (!apiKey) {
      console.error('No Groq API key provided. Please add one in settings or .env')
      alert('Error: No Groq API key is currently configured. Please add one in the Settings menu (top right) or your local .env file before running features.')
      return `Error: No Groq API key provided. Please add one in settings or .env.`
    }

    setIsLoading(true)

    try {
      const prompt = `Based on the user's question and the full meeting transcript, provide a comprehensive and highly detailed response.

CRITICAL RULES:
- Include exact quotes and direct references to the "user content" from the transcript.
- Do NOT give short answers. Your response must be comprehensive, thoughtful, and explicitly reference the specific details discussed in the meeting.

User question: ${question}
Full transcript: ${transcript}`

      console.log('Sending chat response request to Groq API...')
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${settings.groqApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            {
              role: 'system',
              content: 'You are a helpful AI meeting assistant providing detailed, context-aware responses.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 3000,
          temperature: 0.7
        })
      })

      console.log('Chat response status:', response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Chat API error:', response.status, errorText)
        return `API Error: ${response.status} - ${errorText}`
      }

      const result = await response.json()
      console.log('Chat response result:', result)

      const choice = result.choices[0]
      if (choice.finish_reason === 'length') {
        alert(`Token limit reached! The chat response was cut off at ${result.usage?.completion_tokens || 'maximum'} tokens. Please raise your max_tokens limit in the code.`)
      }

      const content = choice.message.content

      if (!content.includes('Detailed answer to:')) {
        return `Detailed answer to: "${question}"\n\n${content}`
      }
      return content
    } catch (error) {
      console.error('Chat response error:', error)
      return `Network Error: ${(error as Error).message}`
    } finally {
      setIsLoading(false)
    }
  }

  return {
    isLoading,
    transcribeAudio,
    generateSuggestions,
    generateChatResponse
  }
}

// Updated components to match reference prototype
const TranscriptPanel = ({ transcript, isRecording, onToggleRecording }: any) => {
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  return (
    <div className="h-full flex flex-col bg-[#111520] border-r border-[#1e293b]">
      <div className="p-5 flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-sm font-semibold tracking-wider text-slate-400 uppercase">1. Mic & Transcript</h2>
          <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
            {isRecording ? 'Active' : 'Idle'}
          </span>
        </div>
        <div className="flex items-center mb-6 pl-2">
          <button
            onClick={onToggleRecording}
            title={isRecording ? 'Stop Recording' : 'Start Recording'}
            className={`w-12 h-12 rounded-full flex items-center justify-center mr-4 shadow-lg transition-all hover:scale-105 active:scale-95 ${isRecording ? 'bg-red-500/20 shadow-red-500/20 cursor-pointer' : 'bg-blue-500/20 shadow-blue-500/20 cursor-pointer'}`}
          >
            {isRecording ? (
              <div className="w-4 h-4 rounded-sm bg-red-500"></div>
            ) : (
              <div className="w-4 h-4 rounded-full bg-blue-500"></div>
            )}
          </button>
          <div className="text-slate-300 font-medium">
            {isRecording ? 'Listening...' : 'Stopped. Click to resume.'}
          </div>
        </div>
        <div className="p-4 rounded-xl border border-[#1e293b] bg-[#161b26] text-sm text-slate-400 leading-relaxed mb-2">
          The transcript scrolls and appends new chunks every ~30 seconds while recording. Use the mic button to start/stop. Include an export button (not shown) so we can pull the full session.
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-5 pb-5">
        {transcript.length === 0 ? null : (
          <div className="space-y-6 mt-4">
            {transcript.map((line: any, index: number) => (
              <div key={index} className="flex flex-col">
                <div className="text-xs text-slate-500 font-mono mb-2">
                  {line.timestamp.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false
                  })}
                </div>
                <div className="text-[15px] text-slate-200 leading-relaxed">
                  {line.text}
                </div>
              </div>
            ))}
            <div ref={transcriptEndRef} />
          </div>
        )}
      </div>
    </div>
  );
};

const SuggestionsPanel = ({ suggestions, onSuggestionClick, isRecording, onManualRefresh }: any) => {
  const parseSuggestion = (preview: string) => {
    let type = 'SUGGESTION';
    let text = preview;
    let badgeColor = 'bg-gray-500/10 text-gray-400 border-gray-500/20';

    if (preview.toUpperCase().startsWith('QUESTION TO ASK')) {
      type = 'Question to ask';
      text = preview.replace(/^QUESTION TO ASK:\s*/i, '');
      badgeColor = 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    } else if (preview.toUpperCase().startsWith('TALKING POINT')) {
      type = 'Talking point';
      text = preview.replace(/^TALKING POINT:\s*/i, '');
      badgeColor = 'bg-purple-500/10 text-purple-400 border-purple-500/20';
    } else if (preview.toUpperCase().startsWith('FACT-CHECK')) {
      type = 'Fact-check';
      text = preview.replace(/^FACT-CHECK:\s*/i, '');
      badgeColor = 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
    } else if (preview.toUpperCase().startsWith('ANSWER')) {
      type = 'Answer';
      text = preview.replace(/^ANSWER:\s*/i, '');
      badgeColor = 'bg-green-500/10 text-green-400 border-green-500/20';
    } else if (preview.includes(':')) {
      const parts = preview.split(':');
      type = parts[0].toUpperCase();
      text = parts.slice(1).join(':').trim();
    }

    return { type, text, badgeColor };
  };

  const [countdown, setCountdown] = useState(30);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isRecording) {
      timer = setInterval(() => {
        setCountdown((prev) => (prev > 0 ? prev - 1 : 30));
      }, 1000);
    } else {
      setCountdown(30);
    }
    return () => clearInterval(timer);
  }, [isRecording]);

  return (
    <div className="h-full flex flex-col bg-[#111520] border-r border-[#1e293b]">
      <div className="p-5">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-sm font-semibold tracking-wider text-slate-400 uppercase">2. Live Suggestions</h2>
          <span className="text-xs font-semibold tracking-wider text-slate-400">
            {suggestions.length} {suggestions.length === 1 ? 'batch' : 'batches'}
          </span>
        </div>
        <div className="flex items-center space-x-4 mb-6">
          <button
            onClick={onManualRefresh}
            className="flex items-center space-x-2 px-4 py-2 bg-[#1e293b] text-slate-300 rounded-lg hover:bg-[#2a364a] border border-[#2a364a] transition-colors text-sm font-medium"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Reload suggestions</span>
          </button>
          <div className="text-sm text-slate-500">
            auto-refresh in {countdown}s
          </div>
        </div>
        <div className="p-4 rounded-xl border border-[#1e293b] bg-[#161b26] text-sm text-slate-400 leading-relaxed">
          On reload (or auto every ~30s), generate <strong>3 fresh suggestions</strong> from recent transcript context. New batch appears at the top; older batches push down (faded). Each is a tappable card: a <span className="text-blue-400 font-medium">question to ask</span>, a <span className="text-purple-400 font-medium">talking point</span>, an <span className="text-green-400 font-medium">answer</span>, or a <span className="text-yellow-400 font-medium">fact-check</span>. The preview alone should already be useful.
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-5 pb-5">
        {suggestions.length === 0 ? null : (
          <div className="space-y-6 mt-2">
            {suggestions.map((batch: any, batchIndex: number) => {
              const isLatest = batchIndex === 0;
              return (
                <div key={batchIndex} className={`mb-8 ${!isLatest ? 'opacity-50' : ''}`}>
                  <div className="flex items-center justify-center mb-6">
                    <div className="h-px bg-[#1e293b] flex-1"></div>
                    <div className="px-4 text-xs tracking-widest text-slate-500 font-semibold">
                      — Batch {suggestions.length - batchIndex} · {batch.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })} —
                    </div>
                    <div className="h-px bg-[#1e293b] flex-1"></div>
                  </div>
                  <div className="space-y-3">
                    {batch.batch.map((suggestion: any, suggestionIndex: number) => {
                      const { type, text, badgeColor } = parseSuggestion(suggestion.preview);
                      return (
                        <div
                          key={suggestionIndex}
                          className="bg-[#161b26] border border-[#2a364a] rounded-xl p-4 cursor-pointer hover:border-blue-500/50 hover:bg-[#1a2133] transition-all duration-200"
                          onClick={() => onSuggestionClick(suggestion)}
                        >
                          <div className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold tracking-wider mb-2 border ${badgeColor}`}>
                            {type}
                          </div>
                          <div className="text-[15px] text-slate-200 leading-relaxed font-medium">
                            {text}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const ChatPanel = ({ chat, onSendMessage }: any) => {
  const [inputMessage, setInputMessage] = useState('')
  const chatEndRef = useRef<HTMLDivElement>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (inputMessage.trim()) {
      onSendMessage(inputMessage.trim())
      setInputMessage('')
    }
  }

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chat])

  return (
    <div className="h-full flex flex-col bg-[#111520]">
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold tracking-wider text-slate-400 uppercase">3. Chat (Detailed Answers)</h2>
          <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">SESSION-ONLY</span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-5 pb-5">
        {chat.length === 0 ? null : (
          <div className="space-y-6">
            {chat.map((message: any, index: number) => (
              <div
                key={index}
                className="flex flex-col"
              >
                <div className="text-[11px] tracking-wider text-slate-500 font-semibold mb-2 uppercase">
                  {message.role === 'user' ? 'YOU' : 'ASSISTANT'}
                </div>
                <div className={`p-4 rounded-xl ${message.role === 'user'
                  ? 'bg-[#1e293b] border border-[#2a364a] text-slate-300'
                  : 'bg-[#161b26] border border-[#2a364a] text-slate-300'
                  }`}>
                  <div className="text-[14px] leading-relaxed whitespace-pre-wrap">
                    {message.content.includes('Detailed answer to:')
                      ? (
                        <>
                          <div className="text-slate-400 font-medium mb-3 italic">
                            {message.content.split('\n').find((l: string) => l.startsWith('Detailed answer to:'))}
                          </div>
                          <div>
                            {message.content.split('\n').filter((l: string) => !l.startsWith('Detailed answer to:')).join('\n').trim()}
                          </div>
                        </>
                      )
                      : message.content
                    }
                  </div>
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
        )}
      </div>
      <div className="p-4 bg-[#0f1219]">
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Ask anything..."
            className="flex-1 px-4 py-3 bg-[#1e293b] border border-[#2a364a] rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-200 placeholder-slate-500"
          />
          <button
            type="submit"
            disabled={!inputMessage.trim()}
            className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-500 disabled:bg-[#1e293b] disabled:text-slate-500 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  )
}

const SettingsModal = ({ onClose }: any) => {
  const [settings, setSettings] = useState({
    groqApiKey: '',
    liveSuggestionPrompt: '',
    detailedAnswerPrompt: '',
    chatPrompt: '',
    liveSuggestionContextWindow: 1000,
    detailedAnswerContextWindow: 4000
  })

  useEffect(() => {
    const savedSettings = localStorage.getItem('twinmind-settings')
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings))
    }
  }, [])

  const handleSave = () => {
    localStorage.setItem('twinmind-settings', JSON.stringify(settings))
    onClose()
  }

  const handleReset = () => {
    setSettings({
      groqApiKey: '',
      liveSuggestionPrompt: '',
      detailedAnswerPrompt: '',
      chatPrompt: '',
      liveSuggestionContextWindow: 1000,
      detailedAnswerContextWindow: 4000
    })
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-[#131924] border border-[#2a364a] rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-[#2a364a]">
          <h2 className="text-xl font-semibold text-slate-200">Settings</h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-[#1e293b] rounded-lg transition-colors"
          >
            ×
          </button>
        </div>
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-160px)]">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Groq API Key
              </label>
              <input
                type="password"
                value={settings.groqApiKey}
                onChange={(e) => setSettings({ ...settings, groqApiKey: e.target.value })}
                className="w-full px-4 py-3 bg-[#0f1219] border border-[#2a364a] rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-200 placeholder-slate-600"
                placeholder="Enter your Groq API key"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Live Suggestions Context (tokens)
                </label>
                <input
                  type="number"
                  value={settings.liveSuggestionContextWindow}
                  onChange={(e) => setSettings({ ...settings, liveSuggestionContextWindow: parseInt(e.target.value) })}
                  className="w-full px-4 py-3 bg-[#0f1219] border border-[#2a364a] rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Detailed Answers Context (tokens)
                </label>
                <input
                  type="number"
                  value={settings.detailedAnswerContextWindow}
                  onChange={(e) => setSettings({ ...settings, detailedAnswerContextWindow: parseInt(e.target.value) })}
                  className="w-full px-4 py-3 bg-[#0f1219] border border-[#2a364a] rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-200"
                />
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between p-6 border-t border-[#2a364a] bg-[#0c0f14]">
          <button
            onClick={handleReset}
            className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
          >
            Reset to Defaults
          </button>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-medium text-slate-300 hover:text-white bg-[#1e293b] border border-[#2a364a] rounded-lg transition-colors hover:bg-[#2a364a]"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors"
            >
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  const [showSettings, setShowSettings] = useState(false)
  const [transcript, setTranscript] = useState<Array<{ text: string, timestamp: Date }>>([])
  const [suggestions, setSuggestions] = useState<Array<{ batch: Array<{ preview: string, full: string }>, timestamp: Date }>>([])
  const [chat, setChat] = useState<Array<{ role: 'user' | 'assistant', content: string, timestamp: Date }>>([])

  const { isRecording, startRecording, stopRecording, audioChunks } = useAudioCapture()
  const { transcribeAudio, generateSuggestions, generateChatResponse } = useGroqAPI()



  useEffect(() => {
    // Process new audio chunks immediately when they arrive
    if (audioChunks.length > 0) {
      processAudioChunk()
    }
  }, [audioChunks])



  const processAudioChunk = async () => {
    if (audioChunks.length === 0) return

    try {
      const latestChunk = audioChunks[audioChunks.length - 1]
      console.log('Processing audio chunk:', latestChunk.size, 'bytes')
      const transcription = await transcribeAudio(latestChunk)

      if (transcription) {
        const newTranscriptLine = {
          text: transcription,
          timestamp: new Date()
        }

        setTranscript(prev => [...prev, newTranscriptLine])
        console.log('Added transcript line:', transcription)

        // Generate suggestions based on recent transcript
        const currentTranscript = [...transcript, newTranscriptLine]
        const recentTranscript = currentTranscript.slice(-5).map((t: { text: string }) => t.text).join(' ')
        const newSuggestions = await generateSuggestions(recentTranscript)

        if (newSuggestions && newSuggestions.length === 3) {
          setSuggestions(prev => [{
            batch: newSuggestions.map(s => ({
              preview: s.preview,
              full: s.full
            })),
            timestamp: new Date()
          }, ...prev])
          console.log('Added suggestions batch:', newSuggestions.length, 'suggestions')
        }
      }
    } catch (error) {
      console.error('Error processing audio chunk:', error)
    }
  }

  const handleToggleRecording = async () => {
    console.log('Toggle recording clicked, current state:', isRecording)
    try {
      if (isRecording) {
        console.log('Stopping recording...')
        stopRecording()
      } else {
        console.log('Starting recording...')
        await startRecording()
        console.log('Recording started successfully')
      }
    } catch (error) {
      console.error('Error toggling recording:', error)
      // Show user-friendly error message
      if (error instanceof Error) {
        alert(error.message)
      } else {
        alert('Failed to start recording. Please check your microphone and try again.')
      }
    }
  }

  const handleManualRefresh = async () => {
    console.log('Manual refresh triggered')

    if (transcript.length === 0) {
      console.log('No transcript available to generate suggestions from')
      return
    }

    const recentTranscript = transcript.slice(-5).map((t: { text: string }) => t.text).join(' ')
    console.log('Generating suggestions for recent transcript:', recentTranscript)
    const newSuggestions = await generateSuggestions(recentTranscript)

    if (newSuggestions && newSuggestions.length === 3) {
      setSuggestions(prev => [{
        batch: newSuggestions.map(s => ({
          preview: s.preview,
          full: s.full
        })),
        timestamp: new Date()
      }, ...prev])
      console.log('Successfully added suggestions batch:', newSuggestions.length, 'suggestions')
    } else {
      console.log('Failed to generate suggestions or wrong count:', newSuggestions?.length)
    }
  }

  const handleSuggestionClick = async (suggestion: { preview: string, full: string }) => {
    const userMessage = {
      role: 'user' as const,
      content: suggestion.preview,
      timestamp: new Date()
    }
    setChat(prev => [...prev, userMessage])

    // Generate detailed response
    const fullTranscript = transcript.map(t => t.text).join(' ')
    const response = await generateChatResponse(suggestion.preview, fullTranscript)

    if (response) {
      const assistantMessage = {
        role: 'assistant' as const,
        content: response,
        timestamp: new Date()
      }
      setChat(prev => [...prev, assistantMessage])
    }
  }

  const handleChatMessage = async (message: string) => {
    const userMessage = {
      role: 'user' as const,
      content: message,
      timestamp: new Date()
    }
    setChat(prev => [...prev, userMessage])

    const fullTranscript = transcript.map(t => t.text).join(' ')
    const response = await generateChatResponse(message, fullTranscript)

    if (response) {
      const assistantMessage = {
        role: 'assistant' as const,
        content: response,
        timestamp: new Date()
      }
      setChat(prev => [...prev, assistantMessage])
    }
  }

  const handleExport = () => {
    const sessionData = {
      transcript: transcript.map(t => ({
        text: t.text,
        timestamp: t.timestamp.toISOString()
      })),
      suggestions: suggestions.map(s => ({
        batch: s.batch,
        timestamp: s.timestamp.toISOString()
      })),
      chat: chat.map(c => ({
        role: c.role,
        content: c.content,
        timestamp: c.timestamp.toISOString()
      })),
      exportedAt: new Date().toISOString()
    }

    const blob = new Blob([JSON.stringify(sessionData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `twinmind-session-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="h-screen bg-[#0f1219] text-slate-200 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-[#111520] border-b border-[#1e293b] px-6 py-4 flex-none">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <h1 className="text-xl font-bold tracking-wide text-white">TwinMind</h1>
            <span className="text-sm font-medium text-slate-500">— Live Suggestions Web App</span>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowSettings(true)}
              className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white bg-[#1e293b] border border-[#2a364a] rounded-lg transition-colors hover:bg-[#2a364a] flex items-center space-x-2"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </button>
            <button
              onClick={handleExport}
              className="p-2 text-slate-400 hover:text-white bg-[#1e293b] border border-[#2a364a] rounded-lg transition-colors hover:bg-[#2a364a]"
              title="Export session"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Transcript Panel - Left */}
        <div className="w-1/3 min-h-0 h-full">
          <TranscriptPanel transcript={transcript} isRecording={isRecording} onToggleRecording={handleToggleRecording} />
        </div>

        {/* Suggestions Panel - Middle */}
        <div className="w-1/3 min-h-0 h-full">
          <SuggestionsPanel
            suggestions={suggestions}
            onSuggestionClick={handleSuggestionClick}
            isRecording={isRecording}
            onManualRefresh={handleManualRefresh}
          />
        </div>

        {/* Chat Panel - Right */}
        <div className="w-1/3 min-h-0 h-full">
          <ChatPanel
            chat={chat}
            onSendMessage={handleChatMessage}
          />
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} />
      )}
    </div>
  )
}
