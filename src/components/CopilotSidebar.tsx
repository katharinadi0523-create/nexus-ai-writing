import React, { useState, useCallback, useEffect } from 'react';
import { Mode, WritingState, isValidTransition } from '../types/writing';
import { getActiveScenarioData, ScenarioId, setActiveScenarioId } from '../constants/mockData';
import { InputArea } from './InputArea';
import { ThinkingAnimation } from './ThinkingAnimation';
import { OutlineConfirm } from './OutlineConfirm';
import { AgentConfigPanel } from './AgentConfigPanel';
import { KnowledgeBaseSelector } from './KnowledgeBaseSelector';
import { MemoryModal } from './MemoryModal';
import { ParamsModal } from './ParamsModal';

interface CopilotSidebarProps {
  mode: Mode;
  writingState: WritingState;
  input: string;
  outline: string;
  memoryConfig: Record<string, any>;
  paramsConfig: Record<string, any>;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onModeToggle: (mode: Mode) => void;
  onOutlineConfirm: () => void;
  onMemoryConfigChange: (config: Record<string, any>) => void;
  onParamsConfigChange: (config: Record<string, any>) => void;
  onStartGenerate: () => void;
  className?: string;
}

type TabType = 'chat' | 'doc' | 'kb';

export const CopilotSidebar: React.FC<CopilotSidebarProps> = ({
  mode,
  writingState,
  input,
  outline,
  memoryConfig,
  paramsConfig,
  onInputChange,
  onSend,
  onModeToggle,
  onOutlineConfirm,
  onMemoryConfigChange,
  onParamsConfigChange,
  onStartGenerate,
  className,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('chat');
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'ai'; content: string | JSX.Element }>>([]);
  const [isKnowledgeBaseOpen, setIsKnowledgeBaseOpen] = useState<boolean>(false);
  const [selectedKnowledgeBases, setSelectedKnowledgeBases] = useState<string[]>([]);
  const [isMemoryModalOpen, setIsMemoryModalOpen] = useState<boolean>(false);
  const [isParamsModalOpen, setIsParamsModalOpen] = useState<boolean>(false);
  const [documentCardVisible, setDocumentCardVisible] = useState<boolean>(false);
  const [initialized, setInitialized] = useState<boolean>(false);

  const scenarioData = getActiveScenarioData();
  const currentScenarioId = scenarioData?.id;

  // 初始化：如果有输入且还未初始化，添加用户消息
  useEffect(() => {
    if (input && !initialized && (writingState === WritingState.THINKING || writingState === WritingState.OUTLINE_CONFIRM)) {
      setMessages([{ role: 'user', content: input }]);
      setInitialized(true);
    }
  }, [input, initialized, writingState]);

  // 当发送消息时，添加到消息列表
  const handleSend = useCallback(() => {
    if (!input.trim()) return;
    
    // 添加用户消息
    const userMessage = input;
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    
    // 调用父组件的发送处理
    onSend();
  }, [input, onSend]);

  // 当状态变化时，添加 AI 回复
  useEffect(() => {
    if (writingState === WritingState.OUTLINE_CONFIRM && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === 'user' && !messages.some((m, i) => i === messages.length && m.role === 'ai')) {
        setMessages((prev) => [
          ...prev,
          { 
            role: 'ai', 
            content: (
              <div>
                <div className="text-sm text-gray-700 mb-4">
                  根据你的需求，我基于知识检索你写了如下大纲。你可以直接修改大纲，确认无误后，你可以点击下方「基于大纲生成文档」按键，我将为你生成完成文档内容。
                </div>
                <OutlineConfirm
                  outline={outline}
                  onConfirm={onOutlineConfirm}
                  onCancel={() => {}}
                />
              </div>
            )
          }
        ]);
      }
    }
  }, [writingState, messages, outline, onOutlineConfirm]);

  // 当确认大纲后，添加进一步思考的消息和文档卡片
  useEffect(() => {
    if (writingState === WritingState.GENERATING && messages.length > 0) {
      // 检查是否已经有"进一步思考"的消息
      const hasThinkingMessage = messages.some((m) => {
        if (typeof m.content === 'string') {
          return m.content.includes('深度思考完成') || m.content.includes('根据你的需求，我为你生成了');
        }
        return false;
      });
      
      if (!hasThinkingMessage) {
        // 添加进一步思考的消息
        setMessages((prev) => [
          ...prev,
          { 
            role: 'ai', 
            content: '深度思考完成'
          },
          { 
            role: 'ai', 
            content: `根据你的需求，我为你生成了《${scenarioData?.name || '文档'}》`
          }
        ]);
        // 显示文档卡片
        setDocumentCardVisible(true);
      }
    }
  }, [writingState, messages, scenarioData]);

  // 渲染对话内容
  const renderChatContent = () => {
    return (
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* 历史消息 */}
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                msg.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {msg.role === 'user' ? (
                <div className="flex items-start gap-2 flex-row-reverse">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-sm">👤</span>
                  </div>
                  <div>{msg.content}</div>
                </div>
              ) : (
                <div className="flex items-start gap-2">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-sm">🤖</span>
                  </div>
                  <div className="flex-1">{typeof msg.content === 'string' ? msg.content : msg.content}</div>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* AI 思考中 */}
        {writingState === WritingState.THINKING && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-lg p-3 bg-gray-100">
              <div className="flex items-start gap-2">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-sm">🤖</span>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-2">深度思考完成</div>
                  <ThinkingAnimation />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 文档卡片（生成全文时显示） */}
        {writingState === WritingState.GENERATING && documentCardVisible && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-lg p-3 bg-white border border-gray-200 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {scenarioData?.name || '新文档'}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">文档生成中...</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 智能体配置面板 */}
        {writingState === WritingState.INPUT && mode === Mode.AGENT && (
          <AgentConfigPanel
            agentConfig={scenarioData?.agentConfig}
            memoryConfig={memoryConfig}
            paramsConfig={paramsConfig}
            onMemoryConfigChange={onMemoryConfigChange}
            onParamsConfigChange={onParamsConfigChange}
            onStartGenerate={onStartGenerate}
          />
        )}
      </div>
    );
  };

  return (
    <div className={`flex flex-col h-full bg-white border-l border-gray-200 ${className || ''}`}>
      {/* 页签切换 */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'chat'
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
              : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
          }`}
        >
          对话
        </button>
        <button
          onClick={() => setActiveTab('doc')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'doc'
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
              : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
          }`}
        >
          文档
        </button>
        <button
          onClick={() => setActiveTab('kb')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'kb'
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
              : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
          }`}
        >
          知识
        </button>
      </div>

      {/* 内容区域 */}
      {activeTab === 'chat' && renderChatContent()}
      {activeTab === 'doc' && (
        <div className="flex-1 overflow-y-auto p-4">
          <div className="text-gray-500 text-center mt-8">文档列表</div>
        </div>
      )}
      {activeTab === 'kb' && (
        <div className="flex-1 overflow-y-auto p-4">
          <div className="text-gray-500 text-center mt-8">知识库</div>
        </div>
      )}

      {/* 输入区域 */}
      {activeTab === 'chat' && (
        <div className="border-t border-gray-200">
          <InputArea
            mode={mode}
            input={input}
            onInputChange={onInputChange}
            onSend={handleSend}
            onModeToggle={onModeToggle}
            onKnowledgeBaseClick={() => setIsKnowledgeBaseOpen(true)}
            selectedKnowledgeBases={selectedKnowledgeBases}
            onKnowledgeBaseRemove={(id) => {
              setSelectedKnowledgeBases((prev) => prev.filter((item) => item !== id));
            }}
            selectedScenarioId={currentScenarioId}
            onMemoryClick={() => setIsMemoryModalOpen(true)}
            onParamsClick={() => setIsParamsModalOpen(true)}
            onAgentSelect={(scenarioId) => {
              if (scenarioId) {
                setActiveScenarioId(scenarioId);
              }
            }}
            disabled={writingState === WritingState.THINKING || writingState === WritingState.GENERATING}
          />
        </div>
      )}

      {/* 知识库选择器弹窗 */}
      <KnowledgeBaseSelector
        isOpen={isKnowledgeBaseOpen}
        onClose={() => setIsKnowledgeBaseOpen(false)}
        initialSelectedIds={selectedKnowledgeBases}
        onConfirm={(selectedIds) => {
          setSelectedKnowledgeBases(selectedIds);
          setIsKnowledgeBaseOpen(false);
        }}
      />

      {/* 记忆变量弹窗 */}
      <MemoryModal
        isOpen={isMemoryModalOpen}
        onClose={() => setIsMemoryModalOpen(false)}
        onUpdate={(values) => {
          onMemoryConfigChange(values);
        }}
      />

      {/* 参数配置弹窗 */}
      <ParamsModal
        isOpen={isParamsModalOpen}
        onClose={() => setIsParamsModalOpen(false)}
        onUpdate={(values) => {
          onParamsConfigChange(values);
        }}
      />
    </div>
  );
};
