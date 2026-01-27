import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { getActiveScenarioData } from '../constants/mockData';
import { getMemoryValues, setMemoryValues, resetMemoryValues } from '../store/writingStore';

interface MemoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: (values: Record<string, any>) => void;
}

export const MemoryModal: React.FC<MemoryModalProps> = ({
  isOpen,
  onClose,
  onUpdate,
}) => {
  const scenarioData = getActiveScenarioData();
  const memoryConfigs = scenarioData?.agentConfig.memoryConfigs || [];
  
  // 本地状态，用于表单编辑
  const [values, setValues] = useState<Record<string, any>>({});

  // 当弹窗打开或场景变化时，初始化表单值
  useEffect(() => {
    if (isOpen && scenarioData) {
      const currentSavedValues = getMemoryValues(scenarioData.id);
      const initialValues: Record<string, any> = {};
      memoryConfigs.forEach((config) => {
        // 优先使用已保存的值，其次使用默认值
        initialValues[config.key] = currentSavedValues[config.key] ?? config.defaultValue ?? '';
      });
      setValues(initialValues);
    }
  }, [isOpen, scenarioData?.id, memoryConfigs]);

  const handleValueChange = (key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    if (scenarioData) {
      resetMemoryValues(scenarioData.id);
      const initialValues: Record<string, any> = {};
      memoryConfigs.forEach((config) => {
        initialValues[config.key] = config.defaultValue ?? '';
      });
      setValues(initialValues);
    }
  };

  const handleUpdate = () => {
    if (scenarioData) {
      // 保存到全局状态
      setMemoryValues(scenarioData.id, values);
      
      // 通知父组件
      if (onUpdate) {
        onUpdate(values);
      }
      
      onClose();
    }
  };

  if (!isOpen || !scenarioData) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-[600px] max-h-[80vh] flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">记忆变量</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto p-4">
          {memoryConfigs.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              当前智能体没有配置记忆变量
            </div>
          ) : (
            <div className="space-y-4">
              {/* 表头 */}
              <div className="grid grid-cols-2 gap-4 pb-2 border-b border-gray-200">
                <div className="text-sm font-medium text-gray-700">变量名</div>
                <div className="text-sm font-medium text-gray-700">变量值</div>
              </div>

              {/* 变量列表 */}
              {memoryConfigs.map((config) => (
                <div key={config.key} className="grid grid-cols-2 gap-4 items-center">
                  <div className="text-sm text-gray-800">
                    <span className="text-red-500">*</span>
                    {config.label}
                  </div>
                  <div>
                    <input
                      type="text"
                      value={values[config.key] || ''}
                      onChange={(e) => handleValueChange(config.key, e.target.value)}
                      placeholder={config.placeholder || '请输入'}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="p-4 border-t border-gray-200 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleReset}
            className="px-4 py-2 text-sm border border-blue-500 text-blue-500 rounded hover:bg-blue-50 transition-colors"
          >
            重置
          </button>
          <button
            onClick={handleUpdate}
            className="px-4 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            更新
          </button>
        </div>
      </div>
    </div>
  );
};
