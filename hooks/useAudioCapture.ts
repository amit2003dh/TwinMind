'use client'

import { useState, useRef, useCallback } from 'react'

export const useAudioCapture = () => {
  const [isRecording, setIsRecording] = useState(false)
  const [audioChunks, setAudioChunks] = useState<Blob[]>([])
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunkTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const startRecording = useCallback(async () => {
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
      
      mediaRecorderRef.current = mediaRecorder
      setIsRecording(true)
      
      let chunkBuffer: Blob[] = []
      let chunkStartTime = Date.now()
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunkBuffer.push(event.data)
        }
      }
      
      // Create chunks every 30 seconds
      chunkTimeoutRef.current = setInterval(() => {
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
  }, [])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop())
    }
    
    if (chunkTimeoutRef.current) {
      clearInterval(chunkTimeoutRef.current)
      chunkTimeoutRef.current = null
    }
    
    setIsRecording(false)
  }, [])

  return {
    isRecording,
    audioChunks,
    startRecording,
    stopRecording
  }
}
