'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

interface Settings {
  groqApiKey: string
  liveSuggestionPrompt: string
  detailedAnswerPrompt: string
  chatPrompt: string
  liveSuggestionContextWindow: number
  detailedAnswerContextWindow: number
}

const defaultSettings: Settings = {
  groqApiKey: '',
  liveSuggestionPrompt: `Based on the following meeting transcript, generate exactly 3 useful suggestions. Each suggestion should be:
- Concise and actionable (under 50 characters for preview)
- Varied in type (mix of questions to ask, talking points, fact-checks, clarifications)
- Contextually relevant to what was just discussed
- Valuable even without clicking for details

Recent transcript context:
{transcript}

Return JSON format:
{
  "suggestions": [
    {
      "preview": "Short preview text",
      "full": "More detailed explanation of the suggestion and why it's relevant"
    }
  ]
}`,
  detailedAnswerPrompt: `Based on the user's question and the full meeting transcript, provide a comprehensive and helpful response. Consider the context of the conversation and provide actionable insights.

User question: {question}
Full transcript: {transcript}

Provide a detailed, thoughtful response that addresses the question directly while considering the broader context of the meeting.`,
  chatPrompt: `You are an AI meeting assistant helping with questions about the ongoing meeting. Provide helpful, context-aware responses based on the transcript.

Transcript: {transcript}
User question: {question}`,
  liveSuggestionContextWindow: 1000,
  detailedAnswerContextWindow: 4000
}

interface SettingsModalProps {
  onClose: () => void
}

export default function SettingsModal({ onClose }: SettingsModalProps) {
  const [settings, setSettings] = useState<Settings>(defaultSettings)

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
    setSettings(defaultSettings)
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
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="space-y-6">
            {/* API Key */}
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

            {/* Context Windows */}
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

            {/* Prompts */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Live Suggestion Prompt
              </label>
              <textarea
                value={settings.liveSuggestionPrompt}
                onChange={(e) => setSettings({...settings, liveSuggestionPrompt: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-32 font-mono text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Detailed Answer Prompt
              </label>
              <textarea
                value={settings.detailedAnswerPrompt}
                onChange={(e) => setSettings({...settings, detailedAnswerPrompt: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-24 font-mono text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Chat Prompt
              </label>
              <textarea
                value={settings.chatPrompt}
                onChange={(e) => setSettings({...settings, chatPrompt: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-24 font-mono text-sm"
              />
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
