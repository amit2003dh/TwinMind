import { useState } from 'react'

export const useGroqAPI = () => {
  const [isLoading, setIsLoading] = useState(false)

  const getSettings = () => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('twinmind-settings')
      return saved ? JSON.parse(saved) : {
        groqApiKey: '',
        liveSuggestionPrompt: '',
        chatPrompt: '',
        liveSuggestionContextWindow: 1000,
        detailedAnswerContextWindow: 4000
      }
    }
    return { groqApiKey: '' }
  }

  const transcribeAudio = async (audioBlob: Blob): Promise<string | null> => {
    const settings = getSettings()

    console.log('Starting transcription with audio blob size:', audioBlob.size, 'bytes')

    const apiKey = settings.groqApiKey || process.env.NEXT_PUBLIC_GROQ_API_KEY
    if (!apiKey) {
      console.error('No Groq API key provided. Please add one in settings or .env')
      alert('Error: No Groq API key is currently configured. Please add one in the Settings menu (top right) or your local .env file before running features.')
      return null
    }

    setIsLoading(true)

    try {
      const formData = new FormData()
      formData.append('file', audioBlob, 'audio.webm')
      formData.append('model', 'whisper-large-v3')
      formData.append('language', 'en')
      formData.append('response_format', 'json')

      console.log('Sending transcription request to Groq API...')
      const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`
        },
        body: formData
      })

      console.log('Transcription response status:', response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Transcription API error:', response.status, errorText)
        return "Mock transcription: API error - " + errorText
      }

      const result = await response.json()
      console.log('Transcription result:', result)
      return result.text
    } catch (error) {
      console.error('Transcription error:', error)
      return "Mock transcription: Network error - " + (error as Error).message
    } finally {
      setIsLoading(false)
    }
  }

  const generateSuggestions = async (transcript: string): Promise<Array<{ preview: string, full: string }> | null> => {
    const settings = getSettings()

    console.log('Generating suggestions for transcript:', transcript.substring(0, 100) + '...')

    const apiKey = settings.groqApiKey || process.env.NEXT_PUBLIC_GROQ_API_KEY
    if (!apiKey) {
      console.error('No Groq API key provided. Please add one in settings or .env')
      alert('Error: No Groq API key is currently configured. Please add one in the Settings menu (top right) or your local .env file before running features.')
      return null
    }

    setIsLoading(true)

    try {
      const defaultPrompt = `Based on the following meeting transcript, generate exactly 3 useful suggestions. Each suggestion should be:
- Comprehensive and actionable for preview.
- Extremely contextually relevant precisely citing user content from what was just discussed in the meeting transcript.
- Valuable even without clicking for details. Under no circumstances should you give short responses; quote user statements.
- MUST have its preview start with EXACTLY one of these labels: "QUESTION TO ASK: ", "TALKING POINT: ", "ANSWER: ", or "FACT-CHECK: ".`

      const customPrompt = settings.liveSuggestionPrompt || defaultPrompt;

      const fullPromptText = `${customPrompt}

Recent transcript context:
${transcript}

Return strictly in the following JSON format:
{
  "suggestions": [
    {
      "preview": "LABEL: Detailed preview highlighting exact user content",
      "full": "A comprehensive, multi-sentence response detailing the exact context, citing explicit user statements from the transcript. Do NOT leave short answers."
    }
  ]
}`

      console.log('Sending suggestions request to Groq API...')
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            {
              role: 'system',
              content: 'You are an AI assistant that generates exactly 3 JSON-formatted suggestions based on meeting transcripts. Always return valid JSON.'
            },
            {
              role: 'user',
              content: fullPromptText
            }
          ],
          max_tokens: 2500,
          temperature: 0.7
        })
      })

      console.log('Suggestions response status:', response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Suggestions API error:', response.status, errorText)
        return null
      }

      const result = await response.json()
      console.log('Suggestions result:', result)

      const choice = result.choices[0]
      if (choice.finish_reason === 'length') {
        alert(`Token limit reached! The suggestions response was cut off at ${result.usage?.completion_tokens || 'maximum'} tokens. Please raise your max_tokens limit to prevent JSON truncation.`)
      }

      const content = choice.message.content

      try {
        const parsed = JSON.parse(content)
        console.log('Parsed suggestions:', parsed.suggestions)
        return parsed.suggestions || []
      } catch (parseError) {
        console.error('Failed to parse suggestions JSON:', parseError, 'Content:', content)
        return null
      }
    } catch (error) {
      console.error('Suggestions generation error:', error)
      return null
    } finally {
      setIsLoading(false)
    }
  }

  const generateChatResponse = async (question: string, transcript: string): Promise<string | null> => {
    const settings = getSettings()

    console.log('Generating chat response for question:', question)
    console.log('Transcript length:', transcript.length, 'characters')

    const apiKey = settings.groqApiKey || process.env.NEXT_PUBLIC_GROQ_API_KEY
    if (!apiKey) {
      console.error('No Groq API key provided. Please add one in settings or .env')
      alert('Error: No Groq API key is currently configured. Please add one in the Settings menu (top right) or your local .env file before running features.')
      return `Error: No Groq API key provided. Please add one in settings or .env.`
    }

    setIsLoading(true)

    try {
      const defaultChatPrompt = `Based on the user's question and the full meeting transcript, provide a comprehensive and highly detailed response.

CRITICAL RULES:
- Include exact quotes and direct references to the "user content" from the transcript.
- Do NOT give short answers. Your response must be comprehensive, thoughtful, and explicitly reference the specific details discussed in the meeting.`

      const customChatPrompt = settings.chatPrompt || defaultChatPrompt;

      const fullChatPrompt = `${customChatPrompt}

User question: ${question}
Full transcript context: ${transcript}`

      console.log('Sending chat response request to Groq API...')
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            {
              role: 'system',
              content: 'You are a helpful AI meeting assistant providing detailed, context-aware responses.'
            },
            {
              role: 'user',
              content: fullChatPrompt
            }
          ],
          max_tokens: 3000,
          temperature: 0.7
        })
      })

      console.log('Chat response status:', response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Chat API error:', response.status, errorText)
        return `API Error: ${response.status} - ${errorText}`
      }

      const result = await response.json()
      console.log('Chat response result:', result)

      const choice = result.choices[0]
      if (choice.finish_reason === 'length') {
        alert(`Token limit reached! The chat response was cut off at ${result.usage?.completion_tokens || 'maximum'} tokens. Please raise your max_tokens limit in the code.`)
      }

      const content = choice.message.content

      if (!content.includes('Detailed answer to:')) {
        return `Detailed answer to: "${question}"\n\n${content}`
      }
      return content
    } catch (error) {
      console.error('Chat response error:', error)
      return `Network Error: ${(error as Error).message}`
    } finally {
      setIsLoading(false)
    }
  }

  return {
    isLoading,
    transcribeAudio,
    generateSuggestions,
    generateChatResponse
  }
}
