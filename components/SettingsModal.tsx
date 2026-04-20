import { useState, useEffect } from 'react'

export const SettingsModal = ({ onClose }: any) => {
  const defaultLivePrompt = `Based on the following meeting transcript, generate exactly 3 useful suggestions. Each suggestion should be:
- Comprehensive and actionable for preview.
- Extremely contextually relevant precisely citing user content from what was just discussed in the meeting transcript.
- Valuable even without clicking for details. Under no circumstances should you give short responses; quote user statements.
- MUST have its preview start with EXACTLY one of these labels: "QUESTION TO ASK: ", "TALKING POINT: ", "ANSWER: ", or "FACT-CHECK: ".`

  const defaultChatPrompt = `Based on the user's question and the full meeting transcript, provide a comprehensive and highly detailed response.

CRITICAL RULES:
- Include exact quotes and direct references to the "user content" from the transcript.
- Do NOT give short answers. Your response must be comprehensive, thoughtful, and explicitly reference the specific details discussed in the meeting.`

  const [settings, setSettings] = useState({
    groqApiKey: '',
    liveSuggestionPrompt: defaultLivePrompt,
    chatPrompt: defaultChatPrompt,
    liveSuggestionContextWindow: 2000,
    detailedAnswerContextWindow: 6000
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
      ...settings,
      liveSuggestionPrompt: defaultLivePrompt,
      chatPrompt: defaultChatPrompt,
      liveSuggestionContextWindow: 2000,
      detailedAnswerContextWindow: 6000
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
                  Live Suggestions Context Window Length (tokens)
                </label>
                <input
                  type="number"
                  value={settings.liveSuggestionContextWindow}
                  onChange={(e) => setSettings({ ...settings, liveSuggestionContextWindow: parseInt(e.target.value) || 2000 })}
                  className="w-full px-4 py-3 bg-[#0f1219] border border-[#2a364a] rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Detailed Answers Context Window Length (tokens)
                </label>
                <input
                  type="number"
                  value={settings.detailedAnswerContextWindow}
                  onChange={(e) => setSettings({ ...settings, detailedAnswerContextWindow: parseInt(e.target.value) || 6000 })}
                  className="w-full px-4 py-3 bg-[#0f1219] border border-[#2a364a] rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-200"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Live Suggestion Settings Prompt
              </label>
              <textarea
                value={settings.liveSuggestionPrompt}
                onChange={(e) => setSettings({ ...settings, liveSuggestionPrompt: e.target.value })}
                className="w-full px-4 py-3 bg-[#0f1219] border border-[#2a364a] rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-200 placeholder-slate-600 h-32 resize-y"
                placeholder="Enter prompt rules..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Detailed Answers / Chat Prompt
              </label>
              <textarea
                value={settings.chatPrompt}
                onChange={(e) => setSettings({ ...settings, chatPrompt: e.target.value })}
                className="w-full px-4 py-3 bg-[#0f1219] border border-[#2a364a] rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-200 placeholder-slate-600 h-32 resize-y"
                placeholder="Enter chat system rules..."
              />
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
