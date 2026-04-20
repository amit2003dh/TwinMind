import { useState, useRef } from 'react'

export const useAudioCapture = () => {
  const [isRecording, setIsRecording] = useState(false)
  const [audioChunks, setAudioChunks] = useState<Blob[]>([])
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunkIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const startRecording = async () => {
    try {
      console.log('Starting audio capture...')

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('getUserMedia is not supported in this browser')
      }

      const devices = await navigator.mediaDevices.enumerateDevices()
      const audioInputs = devices.filter(device => device.kind === 'audioinput')
      console.log('Available audio inputs:', audioInputs.length)

      if (audioInputs.length === 0) {
        throw new Error('No microphone devices found')
      }

      console.log('Requesting microphone permission...')
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000
        }
      })

      console.log('Microphone access granted')

      streamRef.current = stream

      let mimeType = 'audio/webm;codecs=opus'
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/webm'
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'audio/mp4'
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = ''
          }
        }
      }

      const options = mimeType ? { mimeType } : {}
      console.log('Using MediaRecorder options:', options)

      const mediaRecorder = new MediaRecorder(stream, options)

      mediaRecorderRef.current = mediaRecorder
      setIsRecording(true)

      let chunkBuffer: Blob[] = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunkBuffer.push(event.data)
          console.log('Audio data received:', event.data.size, 'bytes')
        }
      }

      mediaRecorder.onstop = () => {
        console.log('MediaRecorder stopped')
        if (chunkBuffer.length > 0) {
          const chunkType = mimeType || 'audio/webm'
          const chunk = new Blob(chunkBuffer, { type: chunkType })
          setAudioChunks(prev => [...prev, chunk])
          console.log('Audio chunk created:', chunk.size, 'bytes', 'type:', chunkType)
          chunkBuffer = []
        }
      }

      chunkIntervalRef.current = setInterval(() => {
        if (chunkBuffer.length > 0 && mediaRecorder.state === 'recording') {
          const chunkType = mimeType || 'audio/webm'
          const chunk = new Blob(chunkBuffer, { type: chunkType })
          setAudioChunks(prev => [...prev, chunk])
          console.log('Periodic audio chunk created:', chunk.size, 'bytes', 'type:', chunkType)
          chunkBuffer = []
        }
      }, 30000)

      mediaRecorder.start(1000)
      console.log('Recording started successfully')

    } catch (error) {
      console.error('Error starting recording:', error)
      setIsRecording(false)

      if (error instanceof Error) {
        if (error.name === 'NotReadableError') {
          console.error('Microphone is already in use by another application')
          throw new Error('Microphone is already in use by another application. Please close the other application and try again.')
        } else if (error.name === 'NotAllowedError') {
          console.error('Microphone permission denied')
          throw new Error('Microphone permission denied. Please allow microphone access and try again.')
        } else if (error.name === 'NotFoundError') {
          console.error('No microphone device found')
          throw new Error('No microphone device found. Please connect a microphone and try again.')
        }
      }

      throw error
    }
  }

  const stopRecording = () => {
    console.log('Stopping audio capture...')

    if (chunkIntervalRef.current) {
      clearInterval(chunkIntervalRef.current)
      chunkIntervalRef.current = null
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track: MediaStreamTrack) => track.stop())
      streamRef.current = null
    }

    setIsRecording(false)
    console.log('Audio capture stopped')
  }

  return {
    isRecording,
    audioChunks,
    startRecording,
    stopRecording
  }
}
