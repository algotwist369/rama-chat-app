import React from 'react';

const ToggleButton = ({ 
  options, 
  value, 
  onChange, 
  className = '' 
}) => {
  return (
    <div className={`bg-gray-100 rounded-lg p-1 flex ${className}`}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`px-4 py-2 text-sm font-medium rounded-md ${
            value === option.value
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
};

export default ToggleButton;
