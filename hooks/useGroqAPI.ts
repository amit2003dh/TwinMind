'use client'

import { useState, useCallback } from 'react'

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
  liveSuggestionPrompt: '',
  detailedAnswerPrompt: '',
  chatPrompt: '',
  liveSuggestionContextWindow: 1000,
  detailedAnswerContextWindow: 4000
}

interface Suggestion {
  preview: string
  full: string
}

export const useGroqAPI = () => {
  const [isLoading, setIsLoading] = useState(false)

  const getSettings = useCallback((): Settings => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('twinmind-settings')
      return saved ? JSON.parse(saved) : defaultSettings
    }
    return defaultSettings
  }, [])

  const transcribeAudio = useCallback(async (audioBlob: Blob): Promise<string | null> => {
    const settings = getSettings()
    
    if (!settings.groqApiKey) {
      console.error('No Groq API key provided')
      return null
    }

    setIsLoading(true)
    
    try {
      const formData = new FormData()
      formData.append('file', audioBlob, 'audio.webm')
      formData.append('model', 'whisper-large-v3')
      formData.append('language', 'en')
      formData.append('response_format', 'json')

      const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${settings.groqApiKey}`
        },
        body: formData
      })

      if (!response.ok) {
        throw new Error(`Transcription failed: ${response.statusText}`)
      }

      const result = await response.json()
      return result.text
    } catch (error) {
      console.error('Transcription error:', error)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [getSettings])

  const generateSuggestions = useCallback(async (transcript: string): Promise<Suggestion[] | null> => {
    const settings = getSettings()
    
    if (!settings.groqApiKey) {
      console.error('No Groq API key provided')
      return null
    }

    setIsLoading(true)
    
    try {
      const prompt = settings.liveSuggestionPrompt.replace('{transcript}', transcript)
      
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${settings.groqApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama3-70b-8192',
          messages: [
            {
              role: 'system',
              content: 'You are an AI assistant that generates exactly 3 JSON-formatted suggestions based on meeting transcripts. Always return valid JSON.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 500,
          temperature: 0.7
        })
      })

      if (!response.ok) {
        throw new Error(`Suggestion generation failed: ${response.statusText}`)
      }

      const result = await response.json()
      const content = result.choices[0].message.content
      
      // Parse JSON response
      try {
        const parsed = JSON.parse(content)
        return parsed.suggestions || []
      } catch (parseError) {
        console.error('Failed to parse suggestions JSON:', parseError)
        return null
      }
    } catch (error) {
      console.error('Suggestion generation error:', error)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [getSettings])

  const generateChatResponse = useCallback(async (question: string, transcript: string): Promise<string | null> => {
    const settings = getSettings()
    
    if (!settings.groqApiKey) {
      console.error('No Groq API key provided')
      return null
    }

    setIsLoading(true)
    
    try {
      const prompt = settings.detailedAnswerPrompt
        .replace('{question}', question)
        .replace('{transcript}', transcript)
      
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${settings.groqApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama3-70b-8192',
          messages: [
            {
              role: 'system',
              content: 'You are a helpful AI meeting assistant providing detailed, context-aware responses.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 1000,
          temperature: 0.7
        })
      })

      if (!response.ok) {
        throw new Error(`Chat response failed: ${response.statusText}`)
      }

      const result = await response.json()
      return result.choices[0].message.content
    } catch (error) {
      console.error('Chat response error:', error)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [getSettings])

  return {
    isLoading,
    transcribeAudio,
    generateSuggestions,
    generateChatResponse
  }
}
