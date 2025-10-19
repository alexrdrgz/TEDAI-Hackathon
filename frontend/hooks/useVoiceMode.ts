"use client"

import { useState, useRef, useCallback, useEffect } from 'react';

export type VoiceState = 'idle' | 'recording' | 'processing' | 'speaking' | 'error';

interface UseVoiceModeProps {
  onTranscription?: (text: string) => void;
  onError?: (error: string) => void;
  onVoiceDetected?: () => void;
  onSilenceDetected?: (audioBlob: Blob) => void;
  silenceThreshold?: number; // in milliseconds
}

interface UseVoiceModeReturn {
  state: VoiceState;
  isRecording: boolean;
  isSpeaking: boolean;
  isVoiceDetected: boolean;
  error: string | null;
  startRecording: () => Promise<void>;
  stopRecording: (cancel?: boolean) => Promise<Blob | null>;
  playAudio: (audioBlob: Blob) => Promise<void>;
  stopAudio: () => void;
  requestMicrophonePermission: () => Promise<boolean>;
  hasPermission: boolean;
  startVAD: () => Promise<void>;
  stopVAD: () => void;
}

export function useVoiceMode({ 
  onTranscription: _onTranscription, 
  onError,
  onVoiceDetected,
  onSilenceDetected,
  silenceThreshold = 1500
}: UseVoiceModeProps = {}): UseVoiceModeReturn {
  const [state, setState] = useState<VoiceState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [isVoiceDetected, setIsVoiceDetected] = useState<boolean>(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const vadIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isSpeakingRef = useRef<boolean>(false);

  useEffect(() => {
    checkMicrophonePermission();
  }, []);

  const checkMicrophonePermission = async () => {
    try {
      if (navigator.permissions) {
        const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        setHasPermission(result.state === 'granted');

        result.addEventListener('change', () => {
          setHasPermission(result.state === 'granted');
        });
      }
    } catch (err) {
      console.log('Permissions API not supported');
    }
  };

  const requestMicrophonePermission = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      setHasPermission(true);
      setError(null);
      return true;
    } catch (err: any) {
      console.error('Microphone permission denied:', err);
      setError('Microphone access denied. Please allow microphone access to use voice mode.');
      setHasPermission(false);
      if (onError) {
        onError('Microphone access denied');
      }
      return false;
    }
  }, [onError]);

  const startRecording = useCallback(async () => {
    try {
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current = null;
      }

      setState('recording');
      setError(null);
      audioChunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 48000,
        }
      });
      streamRef.current = stream;

      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/mp4',
      ];

      let selectedMimeType = '';
      for (const mimeType of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
          selectedMimeType = mimeType;
          break;
        }
      }

      if (!selectedMimeType) {
        throw new Error('No supported audio MIME type found');
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: selectedMimeType,
      });

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onerror = (event: any) => {
        console.error('MediaRecorder error:', event.error);
        setError('Recording error occurred');
        setState('error');
        if (onError) {
          onError('Recording error');
        }
      };

      mediaRecorder.start();
      setHasPermission(true);
    } catch (err: any) {
      console.error('Error starting recording:', err);
      const errorMessage = err.name === 'NotAllowedError'
        ? 'Microphone access denied'
        : 'Failed to start recording';
      setError(errorMessage);
      setState('error');
      if (onError) {
        onError(errorMessage);
      }
    }
  }, [onError]);

  const stopRecording = useCallback(async (cancel = false): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const mediaRecorder = mediaRecorderRef.current;

      if (!mediaRecorder || mediaRecorder.state === 'inactive') {
        resolve(null);
        return;
      }

      mediaRecorder.onstop = () => {
        if (cancel) {
          // If cancelled, don't return audio blob
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
          }
          mediaRecorderRef.current = null;
          audioChunksRef.current = [];
          setState('idle');
          resolve(null);
          return;
        }

        const audioBlob = new Blob(audioChunksRef.current, {
          type: mediaRecorder.mimeType
        });

        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }

        mediaRecorderRef.current = null;
        audioChunksRef.current = [];

        setState('processing');
        resolve(audioBlob);
      };

      mediaRecorder.stop();
    });
  }, []);

  const playAudio = useCallback(async (audioBlob: Blob): Promise<void> => {
    return new Promise((resolve, reject) => {
      try {
        if (audioElementRef.current) {
          audioElementRef.current.pause();
          audioElementRef.current = null;
        }

        const audio = new Audio();
        audioElementRef.current = audio;

        const url = URL.createObjectURL(audioBlob);

        setState('speaking');

        audio.onended = () => {
          URL.revokeObjectURL(url);
          audioElementRef.current = null;
          setState('idle');
          resolve();
        };

        audio.onerror = (_err) => {
          URL.revokeObjectURL(url);
          audioElementRef.current = null;
          setState('error');
          setError('Failed to play audio');
          reject(new Error('Audio playback error'));
        };

        audio.oncanplaythrough = () => {
          audio.play().catch(err => {
            console.error('Error playing audio:', err);
            URL.revokeObjectURL(url);
            audioElementRef.current = null;
            setState('error');
            setError('Failed to play audio');
            reject(err);
          });
        };

        audio.src = url;
        audio.load();
      } catch (err: any) {
        console.error('Error in playAudio:', err);
        setState('error');
        setError('Failed to play audio');
        reject(err);
      }
    });
  }, []);

  const stopAudio = useCallback(() => {
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current = null;
      setState('idle');
    }
  }, []);

  const startVAD = useCallback(async () => {
    try {
      // Stop any existing audio playback
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current = null;
      }

      setState('recording');
      setError(null);
      audioChunksRef.current = [];
      setIsVoiceDetected(false);
      isSpeakingRef.current = false;

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 48000,
        }
      });
      streamRef.current = stream;

      // Set up audio analysis for VAD
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 2048;
      analyserRef.current.smoothingTimeConstant = 0.8;

      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);

      // Set up media recorder
      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/mp4',
      ];

      let selectedMimeType = '';
      for (const mimeType of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
          selectedMimeType = mimeType;
          break;
        }
      }

      if (!selectedMimeType) {
        throw new Error('No supported audio MIME type found');
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: selectedMimeType,
      });

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onerror = (event: any) => {
        console.error('MediaRecorder error:', event.error);
        setError('Recording error occurred');
        setState('error');
        if (onError) {
          onError('Recording error');
        }
      };

      mediaRecorder.start();
      setHasPermission(true);

      // Start VAD monitoring
      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const checkAudioLevel = () => {
        if (!analyserRef.current) return;

        analyserRef.current.getByteFrequencyData(dataArray);
        
        // Calculate average volume
        const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
        
        // Voice detection threshold (adjust as needed)
        const voiceThreshold = 20;
        
        if (average > voiceThreshold) {
          // Voice detected
          if (!isSpeakingRef.current) {
            isSpeakingRef.current = true;
            setIsVoiceDetected(true);
            if (onVoiceDetected) {
              onVoiceDetected();
            }
          }
          
          // Reset silence timeout
          if (silenceTimeoutRef.current) {
            clearTimeout(silenceTimeoutRef.current);
          }
          
          // Set new silence timeout
          silenceTimeoutRef.current = setTimeout(async () => {
            // Silence detected after speaking
            if (isSpeakingRef.current && mediaRecorderRef.current) {
              isSpeakingRef.current = false;
              setIsVoiceDetected(false);
              
              // Stop VAD and get audio blob
              const audioBlob = await stopRecording(false);
              if (audioBlob && onSilenceDetected) {
                onSilenceDetected(audioBlob);
              }
              
              // Cleanup VAD
              stopVAD();
            }
          }, silenceThreshold);
        }
      };

      vadIntervalRef.current = setInterval(checkAudioLevel, 100);

    } catch (err: any) {
      console.error('Error starting VAD:', err);
      const errorMessage = err.name === 'NotAllowedError'
        ? 'Microphone access denied'
        : 'Failed to start voice detection';
      setError(errorMessage);
      setState('error');
      if (onError) {
        onError(errorMessage);
      }
    }
  }, [onError, onVoiceDetected, onSilenceDetected, silenceThreshold, stopRecording]);

  const stopVAD = useCallback(() => {
    // Clear VAD interval
    if (vadIntervalRef.current) {
      clearInterval(vadIntervalRef.current);
      vadIntervalRef.current = null;
    }

    // Clear silence timeout
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }

    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    analyserRef.current = null;
    isSpeakingRef.current = false;
    setIsVoiceDetected(false);
  }, []);

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioElementRef.current) {
        audioElementRef.current.pause();
      }
      if (vadIntervalRef.current) {
        clearInterval(vadIntervalRef.current);
      }
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  return {
    state,
    isRecording: state === 'recording',
    isSpeaking: state === 'speaking',
    isVoiceDetected,
    error,
    startRecording,
    stopRecording,
    playAudio,
    stopAudio,
    requestMicrophonePermission,
    hasPermission,
    startVAD,
    stopVAD,
  };
}
