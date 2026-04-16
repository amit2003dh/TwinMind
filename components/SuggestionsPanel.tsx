'use client'

import { useEffect, useRef } from 'react'

interface Suggestion {
  preview: string
  full: string
}

interface SuggestionBatch {
  batch: Suggestion[]
  timestamp: Date
}

interface SuggestionsPanelProps {
  suggestions: SuggestionBatch[]
  onSuggestionClick: (suggestion: Suggestion) => void
}

export default function SuggestionsPanel({ suggestions, onSuggestionClick }: SuggestionsPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0 // Keep newest suggestions at top
    }
  }, [suggestions])

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit'
    })
  }

  return (
    <div className="h-full flex flex-col">
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <h2 className="text-lg font-semibold text-gray-900">Live Suggestions</h2>
      </div>
      
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 bg-gray-50"
      >
        {suggestions.length === 0 ? (
          <div className="text-gray-500 text-center mt-8">
            Start recording to see suggestions...
          </div>
        ) : (
          suggestions.map((batch, batchIndex) => (
            <div key={batchIndex} className="mb-6">
              <div className="text-xs text-gray-500 mb-3 font-medium">
                {formatTime(batch.timestamp)}
              </div>
              {batch.batch.map((suggestion, suggestionIndex) => (
                <div
                  key={suggestionIndex}
                  className="suggestion-card"
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
}
