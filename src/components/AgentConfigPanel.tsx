import React, { useState, useEffect } from 'react';
import { AgentConfig } from '../constants/mockData';

interface AgentConfigPanelProps {
  agentConfig?: AgentConfig;
  memoryConfig: Record<string, any>;
  paramsConfig: Record<string, any>;
  onMemoryConfigChange: (config: Record<string, any>) => void;
  onParamsConfigChange: (config: Record<string, any>) => void;
  onStartGenerate: () => void;
}

export const AgentConfigPanel: React.FC<AgentConfigPanelProps> = ({
  agentConfig,
  memoryConfig,
  paramsConfig,
  onMemoryConfigChange,
  onParamsConfigChange,
  onStartGenerate,
}) => {
  const [localMemoryConfig, setLocalMemoryConfig] = useState<Record<string, any>>(memoryConfig);
  const [localParamsConfig, setLocalParamsConfig] = useState<Record<string, any>>(paramsConfig);

  // 初始化默认值
  useEffect(() => {
    if (agentConfig) {
      const initialMemory: Record<string, any> = {};
      const initialParams: Record<string, any> = {};

      agentConfig.memoryConfigs.forEach((config) => {
        if (config.defaultValue) {
          initialMemory[config.key] = config.defaultValue;
        }
      });

      agentConfig.paramConfigs.forEach((config) => {
        if (config.defaultValue) {
          initialParams[config.key] = config.defaultValue;
        }
      });

      setLocalMemoryConfig(initialMemory);
      setLocalParamsConfig(initialParams);
    }
  }, [agentConfig]);

  // 同步到父组件
  useEffect(() => {
    onMemoryConfigChange(localMemoryConfig);
  }, [localMemoryConfig, onMemoryConfigChange]);

  useEffect(() => {
    onParamsConfigChange(localParamsConfig);
  }, [localParamsConfig, onParamsConfigChange]);

  if (!agentConfig) {
    return (
      <div className="p-6 text-center text-gray-400">
        请先选择智能体
      </div>
    );
  }

  const handleMemoryChange = (key: string, value: string) => {
    setLocalMemoryConfig((prev) => ({ ...prev, [key]: value }));
  };

  const handleParamChange = (key: string, value: string) => {
    setLocalParamsConfig((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="p-6 bg-white border border-gray-200 rounded-lg m-4">
      {/* 智能体信息 */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-1">{agentConfig.name}</h3>
        <p className="text-sm text-gray-500">{agentConfig.description}</p>
      </div>

      {/* 记忆配置 */}
      {agentConfig.memoryConfigs.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            记忆配置
          </h4>
          <div className="space-y-3">
            {agentConfig.memoryConfigs.map((config) => (
              <div key={config.key}>
                <label className="block text-sm text-gray-600 mb-1">{config.label}</label>
                <input
                  type="text"
                  value={localMemoryConfig[config.key] || ''}
                  onChange={(e) => handleMemoryChange(config.key, e.target.value)}
                  placeholder={config.placeholder || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 参数配置 */}
      {agentConfig.paramConfigs.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            参数配置
          </h4>
          <div className="space-y-3">
            {agentConfig.paramConfigs.map((config) => (
              <div key={config.key}>
                <label className="block text-sm text-gray-600 mb-1">{config.label}</label>
                {config.type === 'select' && config.options ? (
                  <select
                    value={localParamsConfig[config.key] || ''}
                    onChange={(e) => handleParamChange(config.key, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">请选择</option>
                    {config.options.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={localParamsConfig[config.key] || ''}
                    onChange={(e) => handleParamChange(config.key, e.target.value)}
                    placeholder={config.defaultValue || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 生成按钮 */}
      <div className="flex items-center justify-end">
        <button
          onClick={onStartGenerate}
          className="px-6 py-2 text-sm text-white bg-blue-500 rounded-md hover:bg-blue-600 transition-colors"
        >
          开始生成
        </button>
      </div>
    </div>
  );
};
