import React from 'react';
import { FlaskConical, Sparkles } from 'lucide-react';
import { useIterationMode } from '../contexts/IterationModeContext';

export const IterationModeSwitch: React.FC = () => {
  const { isIterationMode, toggleIterationMode } = useIterationMode();

  return (
    <div className="pointer-events-none fixed bottom-2 left-2 z-[70]">
      <div className="group pointer-events-auto relative h-20 w-24">
        <div className="absolute bottom-0 left-0 translate-y-3 opacity-0 transition-all duration-200 ease-out group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100">
          <div className="w-[188px] rounded-[22px] border border-slate-200/80 bg-white/95 p-3 shadow-[0_18px_45px_-28px_rgba(15,23,42,0.65)] backdrop-blur-md">
            <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-slate-400">
              <FlaskConical className="h-3.5 w-3.5" />
              实验入口
            </div>
            <button
              type="button"
              onClick={toggleIterationMode}
              aria-pressed={isIterationMode}
              className="flex w-full items-center justify-between gap-3 rounded-2xl bg-slate-50 px-3 py-2.5 text-left transition-colors hover:bg-slate-100"
            >
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-700">迭代版本</div>
                <div className="text-[11px] text-slate-400">
                  {isIterationMode ? '已开启，仅展示迭代能力' : '默认关闭，保持当前稳定版'}
                </div>
              </div>
              <div
                className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors ${
                  isIterationMode ? 'bg-emerald-500' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                    isIterationMode ? 'translate-x-[22px]' : 'translate-x-0.5'
                  }`}
                />
              </div>
            </button>
            <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-400">
              <Sparkles className="h-3.5 w-3.5" />
              鼠标移到左下角才会显现
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
