import { useState, useRef, useEffect } from 'react'

export const ChatPanel = ({ chat, onSendMessage }: any) => {
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
