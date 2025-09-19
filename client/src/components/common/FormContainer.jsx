import React from 'react';

const FormContainer = ({ 
  children, 
  title, 
  subtitle, 
  className = '' 
}) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 py-12 px-4">
      <div className={`p-10 rounded-xl shadow-lg max-w-md w-full space-y-6 ${className}`}>
        <div className="text-center">
          {title && (
            <h2 className="text-2xl font-bold text-white">
              {title}
            </h2>
          )}
          {subtitle && (
            <p className="mt-2 text-sm text-gray-400">
              {subtitle}
            </p>
          )}
        </div>
        {children}
      </div>
    </div>
  );
};

export default FormContainer;
