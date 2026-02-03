
import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { streamGroundingInsights, streamComparisonInsights } from '../services/geminiService';
import { AppState, GroundingMetadata } from '../types';
import { MachineTypeOption } from '../config';

const CACHE_TTL = 60 * 1000; // 60 seconds

interface CacheEntry {
  timestamp: number;
  output: string;
  metadata: GroundingMetadata | null;
  debug: any;
}

const aiCache = new Map<string, CacheEntry>();

export const useStreamAI = () => {
  const [output, setOutput] = useState('');
  const [metadata, setMetadata] = useState<GroundingMetadata | null>(null);
  const [debug, setDebug] = useState<any>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  
  // Ref to track if unmounted
  const isMounted = useRef(true);
  
  // Refs for throttling
  const outputBuffer = useRef('');
  const rafId = useRef<number | null>(null);

  const flushBuffer = useCallback(() => {
    if (outputBuffer.current) {
        setOutput(prev => prev + outputBuffer.current);
        outputBuffer.current = '';
    }
    rafId.current = null;
  }, []);

  const trigger = useCallback(async (cacheKey: string, state: AppState, machineDetails: MachineTypeOption | undefined, apiResponse?: any) => {
    const cached = aiCache.get(cacheKey);

    if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
        setOutput(cached.output);
        setMetadata(cached.metadata);
        setDebug(cached.debug);
        return;
    }

    setIsStreaming(true);
    setOutput('');
    setMetadata(null);
    setDebug(null);
    outputBuffer.current = '';

    let fullText = '';
    let finalMetadata: GroundingMetadata | null = null;
    let finalDebug: any = null;

    try {
      const stream = streamGroundingInsights(state, machineDetails, apiResponse);

      for await (const chunk of stream) {
        if (!isMounted.current) break;

        if (chunk.type === 'text') {
          outputBuffer.current += chunk.content;
          fullText += chunk.content;
          
          // Throttle updates to ~60fps (16ms) or just let RAF handle it
          if (!rafId.current) {
              rafId.current = requestAnimationFrame(flushBuffer);
          }
        } else if (chunk.type === 'metadata') {
          setMetadata(chunk.content);
          finalMetadata = chunk.content;
        } else if (chunk.type === 'debug') {
          setDebug(chunk.content);
          finalDebug = chunk.content;
        }
      }
      
      // Final flush
      flushBuffer();

      // Cache the result
      if (fullText || finalMetadata) {
          aiCache.set(cacheKey, {
              timestamp: Date.now(),
              output: fullText,
              metadata: finalMetadata,
              debug: finalDebug
          });
      }
      
    } catch (error) {
      console.error("Stream error:", error);
    } finally {
      if (isMounted.current) setIsStreaming(false);
    }
  }, [flushBuffer]);

  const triggerComparison = useCallback(async (cacheKey: string, items: any[]) => {
    const cached = aiCache.get(cacheKey);

    if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
        setOutput(cached.output);
        setMetadata(cached.metadata);
        setDebug(cached.debug);
        return;
    }

    setIsStreaming(true);
    setOutput('');
    setMetadata(null);
    setDebug(null);
    outputBuffer.current = '';

    let fullText = '';
    let finalDebug: any = null;

    try {
      const stream = streamComparisonInsights(items);

      for await (const chunk of stream) {
        if (!isMounted.current) break;

        if (chunk.type === 'text') {
          outputBuffer.current += chunk.content;
          fullText += chunk.content;

          if (!rafId.current) {
              rafId.current = requestAnimationFrame(flushBuffer);
          }
        } else if (chunk.type === 'debug') {
          setDebug(chunk.content);
          finalDebug = chunk.content;
        }
      }
      
      flushBuffer();

      // Cache the result
      if (fullText) {
          aiCache.set(cacheKey, {
              timestamp: Date.now(),
              output: fullText,
              metadata: null,
              debug: finalDebug
          });
      }
      
    } catch (error) {
      console.error("Stream comparison error:", error);
    } finally {
      if (isMounted.current) setIsStreaming(false);
    }
  }, [flushBuffer]);

  const reset = useCallback(() => {
    setOutput('');
    setMetadata(null);
    setDebug(null);
    setIsStreaming(false);
    outputBuffer.current = '';
    if (rafId.current) cancelAnimationFrame(rafId.current);
  }, []);

  const abort = useCallback(() => {
      // In a real implementation, we would pass an AbortSignal to the service
      setIsStreaming(false);
      if (rafId.current) cancelAnimationFrame(rafId.current);
  }, []);

  // Cleanup
  useEffect(() => {
      isMounted.current = true;
      return () => { 
          isMounted.current = false; 
          if (rafId.current) cancelAnimationFrame(rafId.current);
      };
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
