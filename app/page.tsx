'use client'

import { useState, useEffect, useRef } from 'react'
import { Mic, MicOff, RefreshCw, Settings, Download } from 'lucide-react'

import { useAudioCapture } from '../hooks/useAudioCapture'
import { useGroqAPI } from '../hooks/useGroqAPI'
import { TranscriptPanel } from '../components/TranscriptPanel'
import { SuggestionsPanel } from '../components/SuggestionsPanel'
import { ChatPanel } from '../components/ChatPanel'
import { SettingsModal } from '../components/SettingsModal'



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
