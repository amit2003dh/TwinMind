'use client'

import { useEffect, useRef } from 'react'

interface TranscriptLine {
  text: string
  timestamp: Date
}

interface TranscriptPanelProps {
  transcript: TranscriptLine[]
}

export default function TranscriptPanel({ transcript }: TranscriptPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [transcript])

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    })
  }

  return (
    <div className="h-full flex flex-col">
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <h2 className="text-lg font-semibold text-gray-900">Transcript</h2>
      </div>
      
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 bg-gray-50"
      >
        {transcript.length === 0 ? (
          <div className="text-gray-500 text-center mt-8">
            Start recording to see transcript...
          </div>
        ) : (
          transcript.map((line, index) => (
            <div key={index} className="transcript-line">
              <div className="text-xs text-gray-500 mb-1">
                {formatTime(line.timestamp)}
              </div>
              <div className="text-gray-800">
                {line.text}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
