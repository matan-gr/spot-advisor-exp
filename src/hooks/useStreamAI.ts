
import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { streamGroundingInsights, streamComparisonInsights } from '../services/geminiService';
import { AppState, GroundingMetadata } from '../types';
import { MachineTypeOption } from '../config';

export const useStreamAI = () => {
  const [output, setOutput] = useState('');
  const [metadata, setMetadata] = useState<GroundingMetadata | null>(null);
  const [debug, setDebug] = useState<any>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  
  // Ref to track if unmounted
  const isMounted = useRef(true);

  const trigger = useCallback(async (state: AppState, machineDetails: MachineTypeOption | undefined, apiResponse?: any) => {
    setIsStreaming(true);
    setOutput('');
    setMetadata(null);
    setDebug(null);

    try {
      const stream = streamGroundingInsights(state, machineDetails, apiResponse);

      for await (const chunk of stream) {
        if (!isMounted.current) break;

        if (chunk.type === 'text') {
          setOutput(prev => prev + chunk.content);
        } else if (chunk.type === 'metadata') {
          setMetadata(chunk.content);
        } else if (chunk.type === 'debug') {
          setDebug(chunk.content);
        }
      }
    } catch (error) {
      console.error("Stream error:", error);
    } finally {
      if (isMounted.current) setIsStreaming(false);
    }
  }, []);

  const triggerComparison = useCallback(async (items: any[]) => {
    setIsStreaming(true);
    setOutput('');
    setMetadata(null);
    setDebug(null);

    try {
      const stream = streamComparisonInsights(items);

      for await (const chunk of stream) {
        if (!isMounted.current) break;

        if (chunk.type === 'text') {
          setOutput(prev => prev + chunk.content);
        } else if (chunk.type === 'debug') {
          setDebug(chunk.content);
        }
      }
    } catch (error) {
      console.error("Stream comparison error:", error);
    } finally {
      if (isMounted.current) setIsStreaming(false);
    }
  }, []);

  const reset = useCallback(() => {
    setOutput('');
    setMetadata(null);
    setDebug(null);
    setIsStreaming(false);
  }, []);

  const abort = useCallback(() => {
      // In a real implementation, we would pass an AbortSignal to the service
      setIsStreaming(false);
  }, []);

  // Cleanup
  useEffect(() => {
      isMounted.current = true;
      return () => { isMounted.current = false; };
  }, []);

  // Memoize the derived metadata to prevent infinite loops in consumers
  const derivedMetadata = useMemo(() => {
      if (metadata) {
          // Map raw Gemini metadata to our app's structure
          // The raw metadata from the SDK typically contains 'groundingChunks'
          const rawChunks = (metadata as any).groundingChunks || [];
          const sources = rawChunks
              .filter((c: any) => c.web)
              .map((c: any) => ({ title: c.web.title, uri: c.web.uri }));

          return { 
              insight: output, 
              sources: sources 
          };
      }
      if (output) return { insight: output, sources: [] };
      return null;
  }, [output, metadata]);

  return { 
    output, 
    metadata: derivedMetadata, 
    debug, 
    trigger, 
    triggerComparison,
    isStreaming,
    abort,
    reset
  };
};
