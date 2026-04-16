'use client'

import { useState, useEffect } from 'react'
import { Mic, MicOff, RefreshCw, Settings, Download } from 'lucide-react'
import TranscriptPanel from '../components/TranscriptPanel'
import SuggestionsPanel from '../components/SuggestionsPanel'
import ChatPanel from '../components/ChatPanel'
import SettingsModal from '../components/SettingsModal'
import { useAudioCapture } from '../hooks/useAudioCapture'
import { useGroqAPI } from '../hooks/useGroqAPI'

export default function Home() {
  const [isRecording, setIsRecording] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [transcript, setTranscript] = useState<Array<{text: string, timestamp: Date}>>([])
  const [suggestions, setSuggestions] = useState<Array<{batch: Array<{preview: string, full: string}>, timestamp: Date}>>([])
  const [chat, setChat] = useState<Array<{role: 'user' | 'assistant', content: string, timestamp: Date}>>([])

  const { startRecording, stopRecording, audioChunks } = useAudioCapture()
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
      setIsRecording(false)
    } else {
      await startRecording()
      setIsRecording(true)
    }
  }

  const handleManualRefresh = async () => {
    await processAudioChunk()
  }

  const handleSuggestionClick = async (suggestion: {preview: string, full: string}) => {
    // Add user message to chat
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
