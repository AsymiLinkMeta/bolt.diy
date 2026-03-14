import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'react-toastify';

export type SpeechRecognitionStatus = 'idle' | 'listening' | 'error' | 'unsupported';

interface UseSpeechToTextOptions {
  onTranscript: (text: string, isFinal: boolean) => void;
  language?: string;
  continuous?: boolean;
}

interface UseSpeechToTextReturn {
  status: SpeechRecognitionStatus;
  isSupported: boolean;
  isListening: boolean;
  startListening: () => void;
  stopListening: () => void;
  toggleListening: () => void;
}

export function useSpeechToText({
  onTranscript,
  language,
  continuous = true,
}: UseSpeechToTextOptions): UseSpeechToTextReturn {
  const [status, setStatus] = useState<SpeechRecognitionStatus>('idle');
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const onTranscriptRef = useRef(onTranscript);
  const interimTranscriptRef = useRef('');

  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  const isSupported =
    typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  const getStoredLanguage = () => {
    if (typeof window === 'undefined') {
      return 'en-US';
    }

    return localStorage.getItem('bolt_voice_language') || 'en-US';
  };

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }

    interimTranscriptRef.current = '';
    setStatus('idle');
  }, []);

  const startListening = useCallback(() => {
    if (!isSupported) {
      toast.error('Voice input requires Chrome, Edge, or Electron. Your browser does not support the Web Speech API.');
      setStatus('unsupported');
      return;
    }

    if (recognitionRef.current) {
      stopListening();
    }

    const SpeechRecognitionAPI =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition: SpeechRecognition = new SpeechRecognitionAPI();

    recognition.continuous = continuous;
    recognition.interimResults = true;
    recognition.lang = language || getStoredLanguage();
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setStatus('listening');
      interimTranscriptRef.current = '';
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimText = '';
      let finalText = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0].transcript;

        if (result.isFinal) {
          finalText += text;
        } else {
          interimText += text;
        }
      }

      if (finalText) {
        interimTranscriptRef.current = '';
        onTranscriptRef.current(finalText, true);
      } else if (interimText) {
        interimTranscriptRef.current = interimText;
        onTranscriptRef.current(interimText, false);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === 'not-allowed' || event.error === 'permission-denied') {
        toast.error('Microphone permission denied. Please allow microphone access and try again.');
      } else if (event.error === 'no-speech') {
        // Restart silently on no-speech
        return;
      } else if (event.error !== 'aborted') {
        toast.error(`Voice input error: ${event.error}`);
      }

      recognitionRef.current = null;
      interimTranscriptRef.current = '';
      setStatus('idle');
    };

    recognition.onend = () => {
      if (recognitionRef.current === recognition && status === 'listening') {
        // Auto-restart for continuous mode
        try {
          recognition.start();
        } catch {
          recognitionRef.current = null;
          interimTranscriptRef.current = '';
          setStatus('idle');
        }
      }
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch {
      toast.error('Could not start voice recognition. Please try again.');
      recognitionRef.current = null;
      setStatus('idle');
    }
  }, [isSupported, continuous, language, stopListening, status]);

  const toggleListening = useCallback(() => {
    if (status === 'listening') {
      stopListening();
    } else {
      startListening();
    }
  }, [status, startListening, stopListening]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
        recognitionRef.current = null;
      }
    };
  }, []);

  return {
    status,
    isSupported,
    isListening: status === 'listening',
    startListening,
    stopListening,
    toggleListening,
  };
}
