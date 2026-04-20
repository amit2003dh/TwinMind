import { useState, useEffect } from 'react'
import { RefreshCw } from 'lucide-react'

export const SuggestionsPanel = ({ suggestions, onSuggestionClick, isRecording, onManualRefresh }: any) => {
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
