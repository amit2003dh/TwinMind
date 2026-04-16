'use client'

import { useState, useEffect } from 'react'
import { Mic, MicOff, RefreshCw, Settings, Download } from 'lucide-react'

// Audio capture hook
const useAudioCapture = () => {
  const [isRecording, setIsRecording] = useState(false)
  const [audioChunks, setAudioChunks] = useState<Blob[]>([])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000
        } 
      })
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      })
      
      setIsRecording(true)
      
      let chunkBuffer: Blob[] = []
      let chunkStartTime = Date.now()
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunkBuffer.push(event.data)
        }
      }
      
      // Create chunks every 30 seconds
      const chunkInterval = setInterval(() => {
        if (chunkBuffer.length > 0) {
          const chunk = new Blob(chunkBuffer, { type: 'audio/webm;codecs=opus' })
          setAudioChunks(prev => [...prev, chunk])
          chunkBuffer = []
          chunkStartTime = Date.now()
        }
      }, 30000)
      
      mediaRecorder.start(1000) // Collect data every second
      
    } catch (error) {
      console.error('Error starting recording:', error)
      setIsRecording(false)
      throw error
    }
  }

  const stopRecording = () => {
    setIsRecording(false)
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
    
    if (!settings.groqApiKey) {
      console.error('No Groq API key provided')
      return null
    }

    setIsLoading(true)
    
    try {
      const formData = new FormData()
      formData.append('file', audioBlob, 'audio.webm')
      formData.append('model', 'whisper-large-v3')
      formData.append('language', 'en')
      formData.append('response_format', 'json')

      const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${settings.groqApiKey}`
        },
        body: formData
      })

      if (!response.ok) {
        throw new Error(`Transcription failed: ${response.statusText}`)
      }

      const result = await response.json()
      return result.text
    } catch (error) {
      console.error('Transcription error:', error)
      return null
    } finally {
      setIsLoading(false)
    }
  }

  const generateSuggestions = async (transcript: string): Promise<Array<{preview: string, full: string}> | null> => {
    const settings = getSettings()
    
    if (!settings.groqApiKey) {
      console.error('No Groq API key provided')
      return null
    }

    setIsLoading(true)
    
    try {
      const prompt = `Based on the following meeting transcript, generate exactly 3 useful suggestions. Each suggestion should be:
- Concise and actionable (under 50 characters for preview)
- Varied in type (mix of questions to ask, talking points, fact-checks, clarifications)
- Contextually relevant to what was just discussed
- Valuable even without clicking for details

Recent transcript context:
${transcript}

Return JSON format:
{
  "suggestions": [
    {
      "preview": "Short preview text",
      "full": "More detailed explanation of the suggestion and why it's relevant"
    }
  ]
}`
      
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${settings.groqApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama3-70b-8192',
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
          max_tokens: 500,
          temperature: 0.7
        })
      })

      if (!response.ok) {
        throw new Error(`Suggestion generation failed: ${response.statusText}`)
      }

      const result = await response.json()
      const content = result.choices[0].message.content
      
      try {
        const parsed = JSON.parse(content)
        return parsed.suggestions || []
      } catch (parseError) {
        console.error('Failed to parse suggestions JSON:', parseError)
        return null
      }
    } catch (error) {
      console.error('Suggestion generation error:', error)
      return null
    } finally {
      setIsLoading(false)
    }
  }

  const generateChatResponse = async (question: string, transcript: string): Promise<string | null> => {
    const settings = getSettings()
    
    if (!settings.groqApiKey) {
      console.error('No Groq API key provided')
      return null
    }

    setIsLoading(true)
    
    try {
      const prompt = `Based on the user's question and the full meeting transcript, provide a comprehensive and helpful response. Consider the context of the conversation and provide actionable insights.

User question: ${question}
Full transcript: ${transcript}

Provide a detailed, thoughtful response that addresses the question directly while considering the broader context of the meeting.`
      
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${settings.groqApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama3-70b-8192',
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
          max_tokens: 1000,
          temperature: 0.7
        })
      })

      if (!response.ok) {
        throw new Error(`Chat response failed: ${response.statusText}`)
      }

      const result = await response.json()
      return result.choices[0].message.content
    } catch (error) {
      console.error('Chat response error:', error)
      return null
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

// Simple component definitions to isolate import issues
const TranscriptPanel = ({ transcript }: any) => (
  <div className="h-full flex flex-col">
    <div className="bg-white border-b border-gray-200 px-4 py-3">
      <h2 className="text-lg font-semibold text-gray-900">Transcript</h2>
    </div>
    <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
      {transcript.length === 0 ? (
        <div className="text-gray-500 text-center mt-8">
          Start recording to see transcript...
        </div>
      ) : (
        transcript.map((line: any, index: number) => (
          <div key={index} className="text-sm text-gray-700 mb-2 p-2 rounded hover:bg-gray-50">
            <div className="text-xs text-gray-500 mb-1">
              {line.timestamp.toLocaleTimeString()}
            </div>
            <div>{line.text}</div>
          </div>
        ))
      )}
    </div>
  </div>
)

const SuggestionsPanel = ({ suggestions, onSuggestionClick }: any) => (
  <div className="h-full flex flex-col">
    <div className="bg-white border-b border-gray-200 px-4 py-3">
      <h2 className="text-lg font-semibold text-gray-900">Live Suggestions</h2>
    </div>
    <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
      {suggestions.length === 0 ? (
        <div className="text-gray-500 text-center mt-8">
          Start recording to see suggestions...
        </div>
      ) : (
        suggestions.map((batch: any, batchIndex: number) => (
          <div key={batchIndex} className="mb-6">
            <div className="text-xs text-gray-500 mb-3 font-medium">
              {batch.timestamp.toLocaleTimeString()}
            </div>
            {batch.batch.map((suggestion: any, suggestionIndex: number) => (
              <div
                key={suggestionIndex}
                className="bg-white rounded-lg border border-gray-200 p-4 mb-3 cursor-pointer hover:border-blue-300 hover:shadow-md transition-all duration-200"
                onClick={() => onSuggestionClick(suggestion)}
              >
                <div className="text-sm text-gray-800 leading-relaxed">
                  {suggestion.preview}
                </div>
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  </div>
)

const ChatPanel = ({ chat, onSendMessage }: any) => {
  const [inputMessage, setInputMessage] = useState('')
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (inputMessage.trim()) {
      onSendMessage(inputMessage.trim())
      setInputMessage('')
    }
  }

  return (
    <div className="h-full flex flex-col">
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <h2 className="text-lg font-semibold text-gray-900">Chat</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
        {chat.length === 0 ? (
          <div className="text-gray-500 text-center mt-8">
            Click on suggestions or type a question to start chatting...
          </div>
        ) : (
          chat.map((message: any, index: number) => (
            <div
              key={index}
              className={`mb-4 p-3 rounded-lg ${
                message.role === 'user' 
                  ? 'bg-blue-100 ml-8' 
                  : 'bg-gray-100 mr-8'
              }`}
            >
              <div className="text-xs text-gray-500 mb-1">
                {message.timestamp.toLocaleTimeString()}
              </div>
              <div className="text-gray-800 whitespace-pre-wrap">
                {message.content}
              </div>
            </div>
          ))
        )}
      </div>
      <div className="bg-white border-t border-gray-200 p-4">
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Type your question..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            type="submit"
            disabled={!inputMessage.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Settings</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            ×
          </button>
        </div>
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Groq API Key
              </label>
              <input
                type="password"
                value={settings.groqApiKey}
                onChange={(e) => setSettings({...settings, groqApiKey: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your Groq API key"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Live Suggestions Context Window (tokens)
                </label>
                <input
                  type="number"
                  value={settings.liveSuggestionContextWindow}
                  onChange={(e) => setSettings({...settings, liveSuggestionContextWindow: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Detailed Answers Context Window (tokens)
                </label>
                <input
                  type="number"
                  value={settings.detailedAnswerContextWindow}
                  onChange={(e) => setSettings({...settings, detailedAnswerContextWindow: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between p-6 border-t border-gray-200">
          <button
            onClick={handleReset}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Reset to Defaults
          </button>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
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
  const [transcript, setTranscript] = useState<Array<{text: string, timestamp: Date}>>([])
  const [suggestions, setSuggestions] = useState<Array<{batch: Array<{preview: string, full: string}>, timestamp: Date}>>([])
  const [chat, setChat] = useState<Array<{role: 'user' | 'assistant', content: string, timestamp: Date}>>([])

  const { isRecording, startRecording, stopRecording, audioChunks } = useAudioCapture()
  const { transcribeAudio, generateSuggestions, generateChatResponse } = useGroqAPI()

  useEffect(() => {
    let interval: NodeJS.Timeout
    
    if (isRecording && audioChunks.length > 0) {
      interval = setInterval(async () => {
        await processAudioChunk()
      }, 30000) // Process every 30 seconds
    }
    
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isRecording, audioChunks])

  const processAudioChunk = async () => {
    if (audioChunks.length === 0) return
    
    try {
      const latestChunk = audioChunks[audioChunks.length - 1]
      const transcription = await transcribeAudio(latestChunk)
      
      if (transcription) {
        const newTranscriptLine = {
          text: transcription,
          timestamp: new Date()
        }
        
        setTranscript(prev => [...prev, newTranscriptLine])
        
        // Generate suggestions based on recent transcript
        const recentTranscript = transcript.slice(-5).map(t => t.text).join(' ')
        const newSuggestions = await generateSuggestions(recentTranscript)
        
        if (newSuggestions && newSuggestions.length === 3) {
          setSuggestions(prev => [{
            batch: newSuggestions.map(s => ({
              preview: s.preview,
              full: s.full
            })),
            timestamp: new Date()
          }, ...prev])
        }
      }
    } catch (error) {
      console.error('Error processing audio chunk:', error)
    }
  }

  const handleToggleRecording = async () => {
    if (isRecording) {
      stopRecording()
    } else {
      await startRecording()
    }
  }

  const handleManualRefresh = async () => {
    await processAudioChunk()
  }

  const handleSuggestionClick = async (suggestion: {preview: string, full: string}) => {
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">TwinMind</h1>
          <div className="flex items-center space-x-4">
            <button
              onClick={handleManualRefresh}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              title="Manual refresh"
            >
              <RefreshCw className="w-5 h-5 text-gray-600" />
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              title="Settings"
            >
              <Settings className="w-5 h-5 text-gray-600" />
            </button>
            <button
              onClick={handleExport}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              title="Export session"
            >
              <Download className="w-5 h-5 text-gray-600" />
            </button>
            <button
              onClick={handleToggleRecording}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                isRecording 
                  ? 'bg-red-500 hover:bg-red-600 text-white' 
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              }`}
            >
              {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              <span>{isRecording ? 'Stop Recording' : 'Start Recording'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-80px)]">
        {/* Transcript Panel - Left */}
        <div className="w-1/3 border-r border-gray-200 overflow-hidden">
          <TranscriptPanel transcript={transcript} />
        </div>

        {/* Suggestions Panel - Middle */}
        <div className="w-1/3 border-r border-gray-200 overflow-hidden">
          <SuggestionsPanel 
            suggestions={suggestions}
            onSuggestionClick={handleSuggestionClick}
          />
        </div>

        {/* Chat Panel - Right */}
        <div className="w-1/3 overflow-hidden">
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
