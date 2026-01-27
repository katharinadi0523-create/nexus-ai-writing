import React, { useState, useEffect } from 'react';
import { X, HelpCircle } from 'lucide-react';
import { getActiveScenarioData } from '../constants/mockData';
import { getParamValues, setParamValues, resetParamValues } from '../store/writingStore';

interface ParamsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: (values: Record<string, any>) => void;
}

export const ParamsModal: React.FC<ParamsModalProps> = ({
  isOpen,
  onClose,
  onUpdate,
}) => {
  const scenarioData = getActiveScenarioData();
  const paramConfigs = scenarioData?.agentConfig.paramConfigs || [];
  
  // 本地状态，用于表单编辑
  const [values, setValues] = useState<Record<string, any>>({});
  const [fileUploadMode, setFileUploadMode] = useState<Record<string, 'local' | 'url'>>({});

  // 当弹窗打开或场景变化时，初始化表单值
  useEffect(() => {
    if (isOpen && scenarioData) {
      const currentSavedValues = getParamValues(scenarioData.id);
      const initialValues: Record<string, any> = {};
      paramConfigs.forEach((config) => {
        // 优先使用已保存的值，其次使用默认值
        initialValues[config.key] = currentSavedValues[config.key] ?? config.defaultValue ?? '';
        // 初始化文件上传模式
        if (config.type === 'file' && !fileUploadMode[config.key]) {
          setFileUploadMode((prev) => ({ ...prev, [config.key]: 'local' }));
        }
      });
      setValues(initialValues);
    }
  }, [isOpen, scenarioData?.id, paramConfigs]);

  const handleValueChange = (key: string, value: any) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    if (scenarioData) {
      resetParamValues(scenarioData.id);
      const initialValues: Record<string, any> = {};
      paramConfigs.forEach((config) => {
        initialValues[config.key] = config.defaultValue ?? '';
      });
      setValues(initialValues);
    }
  };

  const handleUpdate = () => {
    if (scenarioData) {
      // 验证必填项（所有字段都视为必填，根据设计图都有红色星号）
      const missingFields = paramConfigs.filter((config) => {
        const value = values[config.key];
        return !value || (typeof value === 'string' && value.trim() === '');
      });

      if (missingFields.length > 0) {
        alert(`请填写以下必填项：${missingFields.map((f) => f.label).join('、')}`);
        return;
      }

      // 保存到全局状态
      setParamValues(scenarioData.id, values);
      
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
          <h2 className="text-lg font-semibold text-gray-800">变量配置</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* 说明文字 */}
        <div className="px-4 pt-4">
          <p className="text-sm text-gray-600">
            请先填写输入变量值,填完后会将变量值带入后续的对话中
          </p>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto p-4">
          {paramConfigs.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              当前智能体没有配置参数
            </div>
          ) : (
            <div className="space-y-4">
              {paramConfigs.map((config) => (
                <div key={config.key} className="space-y-2">
                  <label className="flex items-center gap-1 text-sm text-gray-700">
                    <span className="text-red-500">*</span>
                    <span>{config.label}</span>
                    {config.type === 'file' && (
                      <HelpCircle className="w-4 h-4 text-gray-400" />
                    )}
                    <span className="text-xs text-gray-500 ml-1">({config.type})</span>
                  </label>

                  {config.type === 'select' && config.options ? (
                    <select
                      value={values[config.key] || ''}
                      onChange={(e) => handleValueChange(config.key, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    >
                      <option value="">请选择</option>
                      {config.options.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  ) : config.type === 'file' ? (
                    <div className="space-y-2">
                      {/* 文件上传模式切换 */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setFileUploadMode((prev) => ({ ...prev, [config.key]: 'local' }))}
                          className={`px-4 py-2 text-sm rounded transition-colors ${
                            (fileUploadMode[config.key] || 'local') === 'local'
                              ? 'bg-blue-500 text-white'
                              : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          本地上传
                        </button>
                        <button
                          type="button"
                          onClick={() => setFileUploadMode((prev) => ({ ...prev, [config.key]: 'url' }))}
                          className={`px-4 py-2 text-sm rounded transition-colors ${
                            (fileUploadMode[config.key] || 'local') === 'url'
                              ? 'bg-blue-500 text-white'
                              : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          链接URL
                        </button>
                      </div>

                      {/* 文件输入 */}
                      {(fileUploadMode[config.key] || 'local') === 'local' ? (
                        <div className="relative">
                          <input
                            type="file"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                handleValueChange(config.key, file.name);
                              }
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          />
                          {values[config.key] && (
                            <div className="mt-1 text-xs text-gray-500">
                              已选择: {values[config.key]}
                            </div>
                          )}
                        </div>
                      ) : (
                        <input
                          type="url"
                          value={values[config.key] || ''}
                          onChange={(e) => handleValueChange(config.key, e.target.value)}
                          placeholder="请输入文件链接URL"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        />
                      )}
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={values[config.key] || ''}
                      onChange={(e) => handleValueChange(config.key, e.target.value)}
                      placeholder="请选择"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                  )}
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
