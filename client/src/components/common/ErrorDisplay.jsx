import React from 'react';
import { AlertCircle } from 'lucide-react';

const ErrorDisplay = ({ 
  error, 
  className = '',
  size = 'medium' 
}) => {
  if (!error) return null;
  
  const sizeClasses = {
    small: 'p-2',
    medium: 'p-3',
    large: 'p-4'
  };
  
  const iconSizes = {
    small: 'h-4 w-4',
    medium: 'h-4 w-4',
    large: 'h-5 w-5'
  };
  
  return (
    <div className={`bg-red-50 border border-red-200 rounded-lg ${sizeClasses[size]} ${className}`}>
      <div className="flex items-center">
        <AlertCircle className={`${iconSizes[size]} text-red-500 mr-2`} />
        <span className="text-sm text-red-700">{error}</span>
      </div>
    </div>
  );
};

export default ErrorDisplay;
