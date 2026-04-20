import { useEffect, useRef } from 'react'

export const TranscriptPanel = ({ transcript, isRecording, onToggleRecording }: any) => {
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
