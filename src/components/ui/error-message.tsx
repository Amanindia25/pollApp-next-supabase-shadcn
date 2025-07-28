import React from 'react';
import { AlertCircle } from 'lucide-react';

interface ErrorMessageProps {
  message: string;
}

export function ErrorMessage({ message }: ErrorMessageProps) {
  if (!message) return null;
  
  return (
    <div className="flex items-center gap-2 p-3 mb-4 text-sm font-medium text-red-800 border border-red-300 rounded-md bg-red-50 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800">
      <AlertCircle className="h-4 w-4" />
      <span>{message}</span>
    </div>
  );
}