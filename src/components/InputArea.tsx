import React, { useState, useRef, useEffect } from 'react';
import { Mode } from '../types/writing';
import { getActiveScenarioData, mockDataStore, setActiveScenarioId, ScenarioId, AgentCategory } from '../constants/mockData';
import { Sparkles, Brain, GitBranch, List, BookOpen, Clock, Sliders, Paperclip, Mic, Send, ChevronUp, Search, ArrowLeftRight } from 'lucide-react';
import { KnowledgeBaseList } from './KnowledgeBaseList';

interface InputAreaProps {
  mode: Mode;
  input: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onModeToggle?: (mode: Mode) => void;
  onStepGenerationToggle?: () => void;
  onKnowledgeBaseClick?: () => void;
  onMemoryClick?: () => void;
  onParamsClick?: () => void;
  onAgentSelect?: (scenarioId: ScenarioId) => void;
  disabled?: boolean;
  stepGenerationEnabled?: boolean;
  selectedKnowledgeBases?: string[];
  onKnowledgeBaseRemove?: (id: string) => void;
  selectedScenarioId?: ScenarioId; // 添加当前选择的场景 ID
}

export const InputArea: React.FC<InputAreaProps> = ({
  mode,
  input,
  onInputChange,
  onSend,
  onModeToggle,
  onStepGenerationToggle,
  onKnowledgeBaseClick,
  onMemoryClick,
  onParamsClick,
  onAgentSelect,
  disabled = false,
  stepGenerationEnabled = true, // 默认开启
  selectedKnowledgeBases = [],
  onKnowledgeBaseRemove,
  selectedScenarioId,
}) => {
  const [isAgentDropdownOpen, setIsAgentDropdownOpen] = useState(false);
  const [isKnowledgeBaseListOpen, setIsKnowledgeBaseListOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const knowledgeBaseListRef = useRef<HTMLDivElement>(null);

  // 使用 state 确保当 activeScenarioId 变化时重新获取数据
  const [scenarioData, setScenarioData] = useState(() => getActiveScenarioData());
  const agentConfig = scenarioData?.agentConfig;
  const category = scenarioData?.category || 'GENERAL';
  const allScenarios = Object.values(mockDataStore);

  // 监听 mode 和 selectedScenarioId 变化，重新获取场景数据
  useEffect(() => {
    const currentData = getActiveScenarioData();
    setScenarioData(currentData);
  }, [mode, selectedScenarioId]);

  // 当选择智能体时，更新场景数据
  const handleAgentSelectInternal = (scenarioId: ScenarioId) => {
    setActiveScenarioId(scenarioId);
    const newData = getActiveScenarioData();
    setScenarioData(newData);
    setIsAgentDropdownOpen(false);
    setSearchQuery('');
    if (onAgentSelect) {
      onAgentSelect(scenarioId);
    }
  };

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsAgentDropdownOpen(false);
        setSearchQuery('');
      }
      if (knowledgeBaseListRef.current && !knowledgeBaseListRef.current.contains(event.target as Node)) {
        setIsKnowledgeBaseListOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!disabled && input.trim()) {
        onSend();
      }
    }
  };

  const handleAgentSelect = handleAgentSelectInternal;

  const handleGeneralAgentSelect = () => {
    // 选择通用智能体，清除当前选择的场景
    setScenarioData(null);
    setIsAgentDropdownOpen(false);
    setSearchQuery('');
    if (onAgentSelect) {
      onAgentSelect('' as ScenarioId);
    }
  };

  // 过滤智能体列表
  const filteredScenarios = allScenarios.filter((scenario) =>
    scenario.agentConfig.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    scenario.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 渲染身份标识按钮（带下拉）
  const renderIdentityButton = () => {
    const getIcon = () => {
      if (!agentConfig || mode === Mode.GENERAL) {
        return <Sparkles className="w-4 h-4 text-yellow-500 animate-pulse" />;
      }
      const IconComponent = category === 'PLANNING' ? Brain : category === 'WORKFLOW' ? GitBranch : Sparkles;
      const iconColor = category === 'PLANNING' ? 'text-purple-500' : category === 'WORKFLOW' ? 'text-blue-500' : 'text-yellow-500';
      return <IconComponent className={`w-4 h-4 ${iconColor}`} />;
    };

    const getButtonText = () => {
      if (!agentConfig || mode === Mode.GENERAL) {
        return '通用写作智能体';
      }
      // 根据类别显示不同的文本
      if (category === 'PLANNING') {
        return '自主规划...';
      } else if (category === 'WORKFLOW') {
        return '工作流智...';
      }
      return agentConfig.name;
    };

    return (
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsAgentDropdownOpen(!isAgentDropdownOpen)}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all shadow-sm ${
            mode === Mode.GENERAL
              ? 'bg-white/80 backdrop-blur-sm border border-gray-200 text-gray-700 hover:bg-white/90'
              : 'bg-blue-500/80 backdrop-blur-sm text-white hover:bg-blue-500/90'
          }`}
        >
          {getIcon()}
          <span className="max-w-[200px] truncate">{getButtonText()}</span>
          <ChevronUp className={`w-4 h-4 transition-transform ${isAgentDropdownOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* 下拉菜单 */}
        {isAgentDropdownOpen && (
          <div className="absolute top-full left-0 mt-2 w-[320px] bg-white border border-gray-200 rounded-lg shadow-xl z-50">
            {/* 搜索框 */}
            <div className="p-2 border-b border-gray-200">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜索智能体名称"
                  className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  autoFocus
                />
              </div>
            </div>

            {/* 智能体列表 */}
            <div className="max-h-[300px] overflow-y-auto">
              {/* 通用智能体选项 */}
              <div
                onClick={handleGeneralAgentSelect}
                className={`px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                  !agentConfig || mode === Mode.GENERAL ? 'bg-blue-50' : ''
                }`}
              >
                <div className="w-8 h-8 bg-yellow-100 rounded flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-yellow-500" />
                </div>
                <span className="text-sm font-medium text-gray-700">通用智能体</span>
              </div>

              {/* 其他智能体 */}
              {filteredScenarios.map((scenario) => {
                const IconComponent = scenario.category === 'PLANNING' ? Brain : scenario.category === 'WORKFLOW' ? GitBranch : Sparkles;
                const iconColor = scenario.category === 'PLANNING' ? 'text-purple-500' : scenario.category === 'WORKFLOW' ? 'text-blue-500' : 'text-yellow-500';
                const bgColor = scenario.category === 'PLANNING' ? 'bg-purple-100' : scenario.category === 'WORKFLOW' ? 'bg-blue-100' : 'bg-yellow-100';
                const isSelected = scenario.id === scenarioData?.id;

                return (
                  <div
                    key={scenario.id}
                    onClick={() => handleAgentSelect(scenario.id)}
                    className={`px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                      isSelected ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className={`w-8 h-8 ${bgColor} rounded flex items-center justify-center`}>
                      <IconComponent className={`w-4 h-4 ${iconColor}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-700 truncate">
                        {scenario.agentConfig.name}
                      </div>
                    </div>
                  </div>
                );
              })}

              {filteredScenarios.length === 0 && searchQuery && (
                <div className="px-4 py-8 text-center text-sm text-gray-400">
                  未找到匹配的智能体
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // 渲染功能按钮组
  const renderFunctionButtons = () => {
    const buttons = [];

    if (mode === Mode.GENERAL) {
      // 通用模式：分步生成切换 + 知识库
      buttons.push(
        <button
          key="step-generation"
          onClick={onStepGenerationToggle}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all shadow-sm ${
            stepGenerationEnabled
              ? 'bg-blue-500/80 backdrop-blur-sm text-white hover:bg-blue-500/90'
              : 'bg-white/80 backdrop-blur-sm border border-gray-200 text-gray-700 hover:bg-white/90'
          }`}
        >
          <List className="w-4 h-4" />
          <span>分步生成</span>
        </button>
      );

      // 知识库按钮 - 显示选择数量
      if (onKnowledgeBaseClick) {
        buttons.push(
          <div key="knowledge-base" className="relative" ref={knowledgeBaseListRef}>
            <button
              onClick={() => {
                if (selectedKnowledgeBases && selectedKnowledgeBases.length > 0) {
                  setIsKnowledgeBaseListOpen(!isKnowledgeBaseListOpen);
                } else {
                  onKnowledgeBaseClick();
                }
              }}
              className="flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-full text-sm font-medium text-gray-700 hover:bg-white/90 transition-all shadow-sm"
            >
              <BookOpen className="w-4 h-4" />
              <span>知识库</span>
              {selectedKnowledgeBases && selectedKnowledgeBases.length > 0 && (
                <span className="px-2 py-0.5 bg-blue-500 text-white text-xs rounded-full">
                  {selectedKnowledgeBases.length}
                </span>
              )}
            </button>

            {/* 知识库列表弹窗 */}
            {isKnowledgeBaseListOpen && selectedKnowledgeBases && selectedKnowledgeBases.length > 0 && (
              <KnowledgeBaseList
                selectedIds={selectedKnowledgeBases}
                onRemove={(id) => {
                  if (onKnowledgeBaseRemove) {
                    onKnowledgeBaseRemove(id);
                  }
                }}
                onClose={() => setIsKnowledgeBaseListOpen(false)}
              />
            )}
          </div>
        );
      }
    } else {
      // 智能体模式：写作模式切换 + 记忆
      // 确保在智能体模式下显示按钮
      if (agentConfig) {
        if (onModeToggle) {
          buttons.push(
            <button
              key="writing-mode"
              onClick={() => onModeToggle(Mode.GENERAL)}
              className="flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-full text-sm font-medium text-gray-700 hover:bg-white/90 transition-all shadow-sm"
            >
              <ArrowLeftRight className="w-4 h-4" />
              <span>写作模式 ⇌</span>
            </button>
          );
        }

        if (onMemoryClick) {
          buttons.push(
            <button
              key="memory"
              onClick={onMemoryClick}
              className="flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-full text-sm font-medium text-gray-700 hover:bg-white/90 transition-all shadow-sm"
            >
              <Clock className="w-4 h-4" />
              <span>记忆</span>
            </button>
          );
        }

        // 工作流类额外增加参数按钮
        if (category === 'WORKFLOW' && onParamsClick) {
          buttons.push(
            <button
              key="params"
              onClick={onParamsClick}
              className="flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-full text-sm font-medium text-gray-700 hover:bg-white/90 transition-all shadow-sm"
            >
              <Sliders className="w-4 h-4" />
              <span>参数</span>
            </button>
          );
        }
      }
    }

    return buttons;
  };

  return (
    <div className="border-t border-gray-200 p-4 bg-white">
      {/* 功能按钮组 */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {renderIdentityButton()}
        {renderFunctionButtons()}
      </div>

      {/* 输入框 */}
      <div className="relative">
        <textarea
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="您好, 有什么可以帮您?"
          disabled={disabled}
          className="w-full px-4 py-3 pr-32 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
          rows={3}
        />
        <div className="absolute right-2 bottom-2 flex items-center gap-2">
          <button
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
            title="附件"
          >
            <Paperclip className="w-4 h-4" />
          </button>
          <button
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
            title="语音输入"
          >
            <Mic className="w-4 h-4" />
          </button>
          <button
            onClick={onSend}
            disabled={disabled || !input.trim()}
            className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            title="发送"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 底部提示 */}
      <div className="mt-2 text-xs text-gray-400 text-center">
        内容由AI生成,仅供参考
      </div>
    </div>
  );
};
