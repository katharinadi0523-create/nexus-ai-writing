import React, { useState, useRef, useEffect } from 'react';

export type RewriteType = 'continue' | 'polish' | 'expand' | 'custom';

interface RewriteWindowProps {
  /** 选中的文本 */
  selectedText: string;
  /** 窗口位置 */
  position: { top: number; left: number };
  /** 容器元素的边界（用于避免窗口溢出） */
  containerRect?: DOMRect;
  /** 点击改写选项时的回调 */
  onRewrite: (type: RewriteType, customPrompt?: string) => Promise<void> | void;
  /** 关闭窗口 */
  onClose: () => void;
  /** 是否正在改写 */
  isLoading?: boolean;
}

const REWRITE_OPTIONS: { type: RewriteType; label: string }[] = [
  { type: 'continue', label: '续写' },
  { type: 'polish', label: '润色' },
  { type: 'expand', label: '扩写' },
];

export const RewriteWindow: React.FC<RewriteWindowProps> = ({
  selectedText,
  position,
  containerRect,
  onRewrite,
  onClose,
  isLoading = false,
}) => {
  const [customInput, setCustomInput] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const windowRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const clickedInsideWindow = windowRef.current?.contains(target);
      const clickedInsideInput = inputRef.current?.contains(target);
      if (!clickedInsideWindow && !clickedInsideInput) {
        onClose();
      }
    };
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100); // 延迟添加，避免鼠标松开时立即触发关闭
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  useEffect(() => {
    if (showCustomInput) {
      inputRef.current?.focus();
    }
  }, [showCustomInput]);

  const handleQuickRewrite = (type: RewriteType) => {
    if (isLoading) return;
    if (type === 'custom') {
      setShowCustomInput(true);
      return;
    }
    onRewrite(type);
    onClose();
  };

  const handleCustomSubmit = () => {
    if (isLoading) return;
    const prompt = customInput.trim();
    if (prompt) {
      onRewrite('custom', prompt);
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCustomSubmit();
    }
    if (e.key === 'Escape') {
      setShowCustomInput(false);
      setCustomInput('');
    }
  };

  // 计算窗口位置，避免溢出
  const WINDOW_WIDTH = 280;
  const WINDOW_OFFSET = 8;
  let top = position.top - WINDOW_OFFSET;
  let left = position.left;

  if (containerRect) {
    // 确保不超出右边界
    if (left + WINDOW_WIDTH > containerRect.right) {
      left = containerRect.right - WINDOW_WIDTH - 8;
    }
    if (left < containerRect.left) {
      left = containerRect.left + 8;
    }
  }

  return (
    <div
      ref={windowRef}
      className="fixed z-50 bg-white rounded-lg shadow-lg border border-gray-200 py-2 min-w-[200px] max-w-[320px]"
      style={{
        left: `${left}px`,
        top: `${top}px`,
        transform: 'translateY(-100%)',
      }}
      onMouseDown={(e) => e.preventDefault()}
    >
      <div className="px-3 py-2 border-b border-gray-100">
        <p className="text-xs text-gray-500 truncate" title={selectedText}>
          已选 {selectedText.length} 字
        </p>
      </div>

      <div className="px-2 py-2 space-y-1">
        {REWRITE_OPTIONS.map(({ type, label }) => (
          <button
            key={type}
            onClick={() => handleQuickRewrite(type)}
            onMouseDown={(e) => e.preventDefault()}
            disabled={isLoading}
            className="w-full px-3 py-2 text-sm text-left rounded-md hover:bg-gray-100 text-gray-700 transition-colors"
          >
            {label}
          </button>
        ))}

        {showCustomInput ? (
          <div className="pt-2 border-t border-gray-100 mt-2">
            <input
              ref={inputRef}
              type="text"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入改写要求..."
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-2"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowCustomInput(false);
                  setCustomInput('');
                }}
                onMouseDown={(e) => e.preventDefault()}
                className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded"
              >
                取消
              </button>
              <button
                onClick={handleCustomSubmit}
                onMouseDown={(e) => e.preventDefault()}
                disabled={!customInput.trim()}
                className="px-3 py-1.5 text-sm bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed rounded"
              >
                {isLoading ? '改写中...' : '确定'}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => handleQuickRewrite('custom')}
            onMouseDown={(e) => e.preventDefault()}
            disabled={isLoading}
            className="w-full px-3 py-2 text-sm text-left rounded-md hover:bg-gray-100 text-gray-700 transition-colors flex items-center gap-2"
          >
            <span className="text-gray-400">+</span>
            自定义改写要求
          </button>
        )}
      </div>
    </div>
  );
};
