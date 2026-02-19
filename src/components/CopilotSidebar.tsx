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
  messages?: Array<{ role: 'user' | 'ai'; content: string | JSX.Element }>;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onModeToggle: (mode: Mode) => void;
  onOutlineConfirm: () => void;
  onMemoryConfigChange: (config: Record<string, any>) => void;
  onParamsConfigChange: (config: Record<string, any>) => void;
  onStartGenerate: () => void;
  onMessagesChange?: (messages: Array<{ role: 'user' | 'ai'; content: string | JSX.Element }>) => void;
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
  messages: externalMessages,
  onInputChange,
  onSend,
  onModeToggle,
  onOutlineConfirm,
  onMemoryConfigChange,
  onParamsConfigChange,
  onStartGenerate,
  onMessagesChange,
  className,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('chat');
  const [internalMessages, setInternalMessages] = useState<Array<{ role: 'user' | 'ai'; content: string | JSX.Element }>>([]);
  const [isKnowledgeBaseOpen, setIsKnowledgeBaseOpen] = useState<boolean>(false);
  const [selectedKnowledgeBases, setSelectedKnowledgeBases] = useState<string[]>([]);
  const [isMemoryModalOpen, setIsMemoryModalOpen] = useState<boolean>(false);
  const [isParamsModalOpen, setIsParamsModalOpen] = useState<boolean>(false);
  const [documentCardVisible, setDocumentCardVisible] = useState<boolean>(false);
  const [initialized, setInitialized] = useState<boolean>(false);

  const scenarioData = getActiveScenarioData();
  const currentScenarioId = scenarioData?.id;

  // 使用外部传入的 messages 或内部 messages
  const messages = externalMessages !== undefined ? externalMessages : internalMessages;

  // 更新 messages 的统一方法
  const updateMessages = useCallback((newMessages: Array<{ role: 'user' | 'ai'; content: string | JSX.Element }>) => {
    if (externalMessages !== undefined && onMessagesChange) {
      // 外部管理 messages，直接更新
      onMessagesChange(newMessages);
    } else {
      // 内部管理 messages
      setInternalMessages(newMessages);
    }
  }, [externalMessages, onMessagesChange]);

  // 如果外部传入了 messages，同步到内部状态（用于初始化标记）
  useEffect(() => {
    if (externalMessages !== undefined) {
      if (externalMessages.length > 0) {
        setInitialized(true);
      }
      // 同步外部 messages 到内部，以防外部 messages 被清空时能恢复
      if (externalMessages.length > 0) {
        setInternalMessages(externalMessages);
      }
    }
  }, [externalMessages]);

  // 初始化：如果有输入且还未初始化，添加用户消息
  useEffect(() => {
    // 如果外部传入了 messages，不自动初始化
    if (externalMessages !== undefined && externalMessages.length > 0) {
      return;
    }
    
    // 通用模式：THINKING 或 OUTLINE_CONFIRM 状态时添加第一条消息
    // 智能体模式：INPUT 状态时添加第一条消息
    if (input && !initialized && (
      writingState === WritingState.THINKING || 
      writingState === WritingState.OUTLINE_CONFIRM ||
      (writingState === WritingState.INPUT && mode === Mode.AGENT)
    )) {
      updateMessages([{ role: 'user', content: input }]);
      setInitialized(true);
    }
  }, [input, initialized, writingState, mode, externalMessages, updateMessages]);

  // 当发送消息时，添加到消息列表
  const handleSend = useCallback(() => {
    if (!input.trim()) return;
    
    // 添加用户消息
    const userMessage = input;
    updateMessages([...messages, { role: 'user', content: userMessage }]);
    
    // 调用父组件的发送处理
    onSend();
  }, [input, onSend, messages, updateMessages]);

  // 当状态变化时，添加 AI 回复
  useEffect(() => {
    if (writingState === WritingState.OUTLINE_CONFIRM) {
      // 检查是否已经有包含 OutlineConfirm 的 AI 消息
      const hasOutlineMessage = messages.some((m) => {
        if (m.role === 'ai' && typeof m.content !== 'string') {
          // 检查是否是 React 元素且包含 OutlineConfirm
          const content = m.content as any;
          if (content && content.props && content.props.children) {
            // 检查子元素中是否有 OutlineConfirm
            const children = Array.isArray(content.props.children) 
              ? content.props.children 
              : [content.props.children];
            return children.some((child: any) => 
              child && child.type && (child.type.name === 'OutlineConfirm' || child.type.displayName === 'OutlineConfirm')
            );
          }
        }
        return false;
      });
      
      // 如果还没有大纲确认消息，且 outline 有值，添加一个
      if (!hasOutlineMessage && outline && outline.trim()) {
        updateMessages([
          ...messages,
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
  }, [writingState, messages, outline, onOutlineConfirm, updateMessages]);

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
        const newMessages = [
          ...messages,
          { 
            role: 'ai' as const, 
            content: '深度思考完成'
          },
          { 
            role: 'ai' as const, 
            content: `根据你的需求，我为你生成了《${scenarioData?.name || '文档'}》`
          }
        ];
        updateMessages(newMessages);
        // 显示文档卡片
        setDocumentCardVisible(true);
      }
    }
  }, [writingState, messages, scenarioData, updateMessages]);

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
