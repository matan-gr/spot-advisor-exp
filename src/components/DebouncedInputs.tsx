import React, { useState, useEffect } from 'react';

export const DebouncedInput = ({ 
  value, 
  onCommit, 
  delay = 300, 
  className,
  type = "text",
  ...props 
}: React.InputHTMLAttributes<HTMLInputElement> & { 
  value: string | number, 
  onCommit: (val: any) => void, 
  delay?: number 
}) => {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (localValue !== value) {
        onCommit(localValue);
      }
    }, delay);
    return () => clearTimeout(handler);
  }, [localValue, onCommit, delay, value]);

  return (
    <input 
      {...props} 
      type={type}
      className={className}
      value={localValue} 
      onChange={(e) => setLocalValue(e.target.value)} 
    />
  );
};

export const DebouncedTextarea = ({ 
  value, 
  onCommit, 
  delay = 300, 
  className,
  ...props 
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { 
  value: string, 
  onCommit: (val: string) => void, 
  delay?: number 
}) => {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (localValue !== value) {
        onCommit(localValue);
      }
    }, delay);
    return () => clearTimeout(handler);
  }, [localValue, onCommit, delay, value]);

  return (
    <textarea 
      {...props} 
      className={className}
      value={localValue} 
      onChange={(e) => setLocalValue(e.target.value)} 
    />
  );
};
