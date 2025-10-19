"use client"

import { useState, useRef, useCallback, useEffect } from 'react';

export type VoiceState = 'idle' | 'recording' | 'processing' | 'speaking' | 'error';

interface UseVoiceModeProps {
  onTranscription?: (text: string) => void;
  onError?: (error: string) => void;
}

interface UseVoiceModeReturn {
  state: VoiceState;
  isRecording: boolean;
  isSpeaking: boolean;
  error: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<Blob | null>;
  playAudio: (audioBlob: Blob) => Promise<void>;
  stopAudio: () => void;
  requestMicrophonePermission: () => Promise<boolean>;
  hasPermission: boolean;
}

export function useVoiceMode({ onTranscription: _onTranscription, onError }: UseVoiceModeProps = {}): UseVoiceModeReturn {
  const [state, setState] = useState<VoiceState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean>(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

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

  const stopRecording = useCallback(async (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const mediaRecorder = mediaRecorderRef.current;

      if (!mediaRecorder || mediaRecorder.state === 'inactive') {
        resolve(null);
        return;
      }

      mediaRecorder.onstop = () => {
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
    };
  }, []);

  return {
    state,
    isRecording: state === 'recording',
    isSpeaking: state === 'speaking',
    error,
    startRecording,
    stopRecording,
    playAudio,
    stopAudio,
    requestMicrophonePermission,
    hasPermission,
  };
}
