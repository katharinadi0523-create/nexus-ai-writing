import React from 'react';

export const ThinkingAnimation: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
      </div>
      <div className="text-gray-500 text-sm">AI 正在思考中...</div>
    </div>
  );
};
