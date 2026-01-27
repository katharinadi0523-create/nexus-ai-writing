import React, { useState, useEffect, useCallback } from 'react';
import { Mode, WritingState, getNextState, isValidTransition } from '../types/writing';
import { getActiveScenarioData } from '../constants/mockData';
import { InputArea } from './InputArea';
import { ThinkingAnimation } from './ThinkingAnimation';
import { OutlineConfirm } from './OutlineConfirm';
import { AgentConfigPanel } from './AgentConfigPanel';

interface CopilotSectionProps {
  className?: string;
}

export const CopilotSection: React.FC<CopilotSectionProps> = ({ className }) => {
  const [mode, setMode] = useState<Mode>(Mode.GENERAL);
  const [writingState, setWritingState] = useState<WritingState>(WritingState.INPUT);
  const [input, setInput] = useState<string>('');
  const [agentId, setAgentId] = useState<string | undefined>();
  const [memoryConfig, setMemoryConfig] = useState<Record<string, any>>({});
  const [paramsConfig, setParamsConfig] = useState<Record<string, any>>({});
  const [outline, setOutline] = useState<string>('');

  const scenarioData = getActiveScenarioData();

  // 检测输入中的 @ 字符，切换到智能体模式
  useEffect(() => {
    if (input.includes('@') && mode === Mode.GENERAL) {
      setMode(Mode.AGENT);
      setWritingState(WritingState.INPUT);
      if (scenarioData) {
        setAgentId(scenarioData.agentConfig.id);
      }
    }
  }, [input, mode, scenarioData]);

  // 当切换到智能体模式时，自动设置智能体 ID
  useEffect(() => {
    if (mode === Mode.AGENT && !agentId && scenarioData) {
      setAgentId(scenarioData.agentConfig.id);
    }
  }, [mode, agentId, scenarioData]);

  // 处理发送查询
  const handleSendQuery = useCallback(() => {
    if (!input.trim()) return;

    if (mode === Mode.GENERAL) {
      // 通用模式：INPUT -> THINKING
      setWritingState(WritingState.THINKING);
      
      // 模拟思考过程，然后进入大纲确认
      setTimeout(() => {
        if (scenarioData) {
          setOutline(scenarioData.generalData.outline);
        }
        setWritingState(WritingState.OUTLINE_CONFIRM);
      }, 1500);
    } else {
      // 智能体模式：发送查询时，如果已配置记忆，可以开始生成
      // 否则保持在 INPUT 状态，显示配置面板等待用户配置
      // 注意：智能体模式的生成由 AgentConfigPanel 的"开始生成"按钮触发
    }
  }, [input, mode, scenarioData]);

  // 处理大纲确认
  const handleOutlineConfirm = useCallback(() => {
    if (isValidTransition(mode, writingState, WritingState.GENERATING)) {
      setWritingState(WritingState.GENERATING);
      // 模拟生成过程
      setTimeout(() => {
        setWritingState(WritingState.FINISHED);
      }, 2000);
    }
  }, [mode, writingState]);

  // 处理模式切换
  const handleModeToggle = useCallback((newMode: Mode) => {
    setMode(newMode);
    setWritingState(WritingState.INPUT);
    if (newMode === Mode.AGENT && scenarioData) {
      setAgentId(scenarioData.agentConfig.id);
    } else {
      setAgentId(undefined);
      setMemoryConfig({});
      setParamsConfig({});
    }
  }, [scenarioData]);

  // 处理记忆配置更新
  const handleMemoryConfigChange = useCallback((config: Record<string, any>) => {
    setMemoryConfig(config);
  }, []);

  // 处理参数配置更新
  const handleParamsConfigChange = useCallback((config: Record<string, any>) => {
    setParamsConfig(config);
  }, []);

  // 渲染当前状态对应的 UI
  const renderStateContent = () => {
    switch (writingState) {
      case WritingState.INPUT:
        if (mode === Mode.AGENT) {
          return (
            <AgentConfigPanel
              agentConfig={scenarioData?.agentConfig}
              memoryConfig={memoryConfig}
              paramsConfig={paramsConfig}
              onMemoryConfigChange={handleMemoryConfigChange}
              onParamsConfigChange={handleParamsConfigChange}
              onStartGenerate={() => {
                setWritingState(WritingState.GENERATING);
                setTimeout(() => {
                  setWritingState(WritingState.FINISHED);
                }, 2000);
              }}
            />
          );
        }
        return null;

      case WritingState.THINKING:
        return <ThinkingAnimation />;

      case WritingState.OUTLINE_CONFIRM:
        return (
          <OutlineConfirm
            outline={outline}
            onConfirm={handleOutlineConfirm}
            onCancel={() => setWritingState(WritingState.INPUT)}
          />
        );

      case WritingState.GENERATING:
        return (
          <div className="flex items-center justify-center py-8">
            <div className="text-gray-500">正在生成内容...</div>
          </div>
        );

      case WritingState.FINISHED:
        return (
          <div className="flex items-center justify-center py-8">
            <div className="text-green-600">内容生成完成！</div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={`flex flex-col h-full ${className || ''}`}>
      {/* 输入区域 */}
      <InputArea
        mode={mode}
        input={input}
        onInputChange={setInput}
        onSend={handleSendQuery}
        onModeToggle={handleModeToggle}
        disabled={writingState === WritingState.THINKING || writingState === WritingState.GENERATING}
      />

      {/* 状态内容区域 */}
      <div className="flex-1 overflow-y-auto">
        {renderStateContent()}
      </div>
    </div>
  );
};
