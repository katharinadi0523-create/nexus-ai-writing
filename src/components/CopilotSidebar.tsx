import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Mode, WritingState } from '../types/writing';
import type { CopilotProgressState, PendingCopilotEdit } from '../types/copilot';
import { getActiveScenarioData, setActiveScenarioId } from '../constants/mockData';
import type { AgentConfig } from '../constants/mockData';
import type {
  AgentConfigSnapshot,
  AgentWriteConfirmation,
  ChatMessageVariant,
} from '../types/chat';
import type { WritingDocument } from '../types/document';
import { InputArea } from './InputArea';
import { ThinkingAnimation } from './ThinkingAnimation';
import { OutlineConfirm } from './OutlineConfirm';
import { AgentConfigPanel } from './AgentConfigPanel';
import { KnowledgeBaseSelector } from './KnowledgeBaseSelector';
import { MemoryModal } from './MemoryModal';
import { ParamsModal } from './ParamsModal';

type ThinkingPhase = 'outline' | 'article' | 'edit' | null;
type ThinkingStatus = 'idle' | 'streaming' | 'done' | 'error';

interface SidebarMessage {
  id?: string;
  role: 'user' | 'ai';
  content: string | JSX.Element;
  variant?: ChatMessageVariant;
  title?: string;
  configSnapshot?: AgentConfigSnapshot;
  writeConfirmation?: AgentWriteConfirmation;
  documentId?: string;
}

interface CopilotSidebarProps {
  mode: Mode;
  writingState: WritingState;
  input: string;
  initialPrompt: string;
  outline: string;
  documentTitle?: string;
  thinkingPhase: ThinkingPhase;
  thinkingStatus: ThinkingStatus;
  thinkingContent: string;
  memoryConfig: Record<string, any>;
  paramsConfig: Record<string, any>;
  messages?: SidebarMessage[];
  pendingEdit?: PendingCopilotEdit | null;
  isApplyingPendingEdit?: boolean;
  isCopilotResponding?: boolean;
  copilotProgress?: CopilotProgressState | null;
  documents?: WritingDocument[];
  activeDocumentId?: string | null;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onModeToggle: (mode: Mode) => void;
  onOutlineConfirm: (outline: string) => void;
  onMemoryConfigChange: (config: Record<string, any>) => void;
  onParamsConfigChange: (config: Record<string, any>) => void;
  onStartGenerate: () => void;
  onAcceptPendingEdit?: () => void;
  onRejectPendingEdit?: () => void;
  onMessagesChange?: (messages: SidebarMessage[]) => void;
  onDocumentSelect?: (documentId: string) => void;
  onDocumentDelete?: (documentId: string) => void;
  onConfirmAgentWrite?: (messageId: string) => void;
  onCancelAgentWrite?: (messageId: string) => void;
  mountedKnowledgeBaseIds: string[];
  onMountedKnowledgeBaseChange: (ids: string[]) => void;
  className?: string;
}

type TabType = 'chat' | 'doc' | 'kb';

function getCopilotProgressCopy(
  progress: CopilotProgressState,
  mode: Mode
): { title: string; subtitle: string } {
  switch (progress.intent) {
    case 'edit':
      if (progress.stage === 'locating') {
        return {
          title: '正在定位原文位置',
          subtitle: '比对章节标题和相关片段，准备锁定修改范围',
        };
      }
      if (progress.stage === 'rewriting') {
        return {
          title: '正在生成修改建议',
          subtitle: '已完成需求分析，正在输出待确认的修改版本',
        };
      }
      return {
        title: '正在理解修改需求',
        subtitle: '判断你想修改哪一段，以及需要扩写、润色还是重写',
      };
    case 'qa':
      if (progress.stage === 'retrieving') {
        return {
          title: '正在检索相关内容',
          subtitle: '正在从当前文档中提取和问题最相关的段落',
        };
      }
      if (progress.stage === 'answering') {
        return {
          title: '正在整理回答',
          subtitle: '已完成内容检索，正在组织最终答复',
        };
      }
      return {
        title: '正在理解你的问题',
        subtitle: '先判断你的意图，再准备基于当前文档回答',
      };
    case 'restart':
    case 'agent_write_related':
    case 'agent_write_unrelated':
      return {
        title: mode === Mode.AGENT ? '正在评估新写作请求' : '正在理解新的写作需求',
        subtitle:
          mode === Mode.AGENT
            ? '判断是否继续沿用当前智能体进入新一轮写作'
            : '正在判断是否切换回文章生成流程',
      };
    case 'chat':
      if (progress.stage === 'chatting') {
        return {
          title: '正在组织回复',
          subtitle: '正在根据当前上下文生成自然回应',
        };
      }
      return {
        title: '正在理解你的消息',
        subtitle: '先判断你的意图，再组织合适的回复',
      };
    default:
      if (progress.stage === 'drafting') {
        return {
          title: '正在整理回复',
          subtitle: '已完成意图判断，正在生成最终结果',
        };
      }
      return {
        title: '正在判断你的意图',
        subtitle: '分析你是想修改、问答、闲聊，还是重新写作',
      };
  }
}

const ThinkingCard: React.FC<{
  phase: ThinkingPhase;
  status: ThinkingStatus;
  content: string;
  titleOverride?: string;
  subtitleOverride?: string;
}> = ({ phase, status, content, titleOverride, subtitleOverride }) => {
  if (status === 'idle' || !phase) {
    return null;
  }

  const title =
    titleOverride ||
    (status === 'streaming' ? '深度思考中...' : status === 'error' ? '思考过程生成失败' : '深度思考完成');
  const subtitle =
    subtitleOverride ||
    (phase === 'outline'
      ? '正在梳理需求、组织大纲结构'
      : phase === 'article'
        ? '正在规划成文顺序、逐段展开正文'
        : '正在定位原文范围、整理修改方案');

  return (
    <div className="flex justify-start">
      <div className="max-w-[88%] rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm">
            🧠
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-1 text-sm font-medium text-gray-900">{title}</div>
            <div className="mb-3 text-xs text-gray-500">{subtitle}</div>
            {content.trim() ? (
              <div className="whitespace-pre-wrap text-sm leading-6 text-gray-700">{content}</div>
            ) : (
              <ThinkingAnimation />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const CopilotProgressCard: React.FC<{
  progress: CopilotProgressState;
  mode: Mode;
}> = ({ progress, mode }) => {
  const copy = getCopilotProgressCopy(progress, mode);

  return (
    <div className="flex justify-start">
      <div className="max-w-[88%] rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm">
            🤖
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-1 text-sm font-medium text-gray-900">{copy.title}</div>
            <div className="mb-3 text-xs text-gray-500">{copy.subtitle}</div>
            <ThinkingAnimation />
          </div>
        </div>
      </div>
    </div>
  );
};

const PendingEditCard: React.FC<{
  pendingEdit: PendingCopilotEdit;
  isApplying: boolean;
  onAccept: () => void;
  onReject: () => void;
}> = ({ pendingEdit, isApplying, onAccept, onReject }) => {
  return (
    <div className="flex justify-start">
      <div className="max-w-[88%] rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
        <div className="mb-2 text-sm font-medium text-amber-900">待确认修改</div>
        {pendingEdit.sectionTitle ? (
          <div className="mb-3 text-xs text-amber-700">定位章节：{pendingEdit.sectionTitle}</div>
        ) : null}
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-white/80 bg-white/80 p-3">
            <div className="mb-2 text-xs font-medium text-gray-500">原文片段</div>
            <div className="whitespace-pre-wrap text-sm leading-6 text-gray-700">
              {pendingEdit.targetText}
            </div>
          </div>
          <div className="rounded-xl border border-white/80 bg-white/80 p-3">
            <div className="mb-2 text-xs font-medium text-gray-500">修改后</div>
            <div className="whitespace-pre-wrap text-sm leading-6 text-gray-900">
              {pendingEdit.replacementText}
            </div>
          </div>
        </div>
        <div className="mt-3 flex justify-end gap-2">
          <button
            onClick={onReject}
            disabled={isApplying}
            className="rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            放弃修改
          </button>
          <button
            onClick={onAccept}
            disabled={isApplying}
            className="rounded-lg bg-amber-500 px-3 py-1.5 text-sm text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isApplying ? '应用中...' : '接受修改'}
          </button>
        </div>
      </div>
    </div>
  );
};

const DocumentCard: React.FC<{
  title: string;
  status: 'generating' | 'finished';
}> = ({ title, status }) => {
  return (
    <div className="flex justify-start">
      <div className="max-w-[80%] rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded bg-blue-100">
            <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-gray-900">{title}</div>
            <div className="mt-1 text-xs text-gray-500">
              {status === 'generating' ? '全文生成中' : '全文生成完成'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const AgentWriteConfirmationCard: React.FC<{
  messageId: string;
  content: string;
  writeConfirmation: AgentWriteConfirmation;
  onConfirm?: (messageId: string) => void;
  onCancel?: (messageId: string) => void;
}> = ({ messageId, content, writeConfirmation, onConfirm, onCancel }) => {
  const isPending = writeConfirmation.status === 'pending';

  return (
    <div className="flex justify-start">
      <div className="max-w-[88%] rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
        <div className="mb-2 flex items-center gap-2 text-sm font-medium text-amber-900">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-sm">
            🤖
          </span>
          <span>继续使用当前智能体</span>
        </div>
        <div className="whitespace-pre-wrap text-sm leading-6 text-amber-950">{content}</div>
        <div className="mt-3 rounded-xl border border-amber-200 bg-white/80 p-3">
          <div className="text-xs text-amber-700">拟生成主题</div>
          <div className="mt-1 text-sm font-medium text-gray-900">{writeConfirmation.topic}</div>
        </div>
        {isPending ? (
          <div className="mt-3 flex justify-end gap-2">
            <button
              onClick={() => onCancel?.(messageId)}
              className="rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:bg-white"
            >
              取消
            </button>
            <button
              onClick={() => onConfirm?.(messageId)}
              className="rounded-lg bg-amber-500 px-3 py-1.5 text-sm text-white hover:bg-amber-600"
            >
              确认生成
            </button>
          </div>
        ) : (
          <div className="mt-3 text-xs text-amber-700">
            {writeConfirmation.status === 'confirmed'
              ? '已确认，正在按当前智能体继续生成。'
              : '已取消本次生成。'}
          </div>
        )}
      </div>
    </div>
  );
};

const DocumentListCard: React.FC<{
  document: WritingDocument;
  isActive: boolean;
  onSelect?: (documentId: string) => void;
  onDelete?: (documentId: string) => void;
}> = ({ document, isActive, onSelect, onDelete }) => {
  const statusText =
    document.status === 'generating'
      ? '全文生成中'
      : document.status === 'error'
        ? '生成失败'
        : '全文生成完成';
  const timeText = new Date(document.createdAt).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      className={`w-full rounded-2xl border p-4 transition-colors ${
        isActive
          ? 'border-blue-300 bg-blue-50 shadow-sm'
          : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${
            document.status === 'error' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
          }`}
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        <button onClick={() => onSelect?.(document.id)} className="min-w-0 flex-1 text-left">
          <div className="truncate text-sm font-medium text-gray-900">{document.title}</div>
          <div className="mt-1 text-xs text-gray-500">{statusText}</div>
          <div className="mt-3 text-xs text-gray-400">生成时间：{timeText}</div>
        </button>
        <div className="ml-3 flex-shrink-0">
          <button
            onClick={() => onDelete?.(document.id)}
            className="rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-600 transition-colors hover:bg-red-50"
          >
            删除
          </button>
        </div>
      </div>
    </div>
  );
};

const buildSnapshotAgentConfig = (snapshot: AgentConfigSnapshot): AgentConfig => ({
  id: `snapshot-${snapshot.agentName}`,
  name: snapshot.agentName,
  description: snapshot.agentDescription,
  memoryConfigs: snapshot.memoryItems.map((item) => ({
    key: item.key,
    label: item.label,
    defaultValue: item.value,
  })),
  paramConfigs: snapshot.paramItems.map((item) => ({
    key: item.key,
    label: item.label,
    type: item.type || 'text',
    defaultValue: item.value,
    required: false,
  })),
});

const buildSnapshotValueMap = (items: AgentConfigSnapshot['memoryItems']) =>
  Object.fromEntries(items.map((item) => [item.key, item.value]));

const AgentConfigMessageCard: React.FC<{
  snapshot: AgentConfigSnapshot;
}> = ({ snapshot }) => {
  return (
    <div className="flex justify-end">
      <div className="w-full max-w-[88%]">
        <AgentConfigPanel
          agentConfig={buildSnapshotAgentConfig(snapshot)}
          memoryConfig={buildSnapshotValueMap(snapshot.memoryItems)}
          paramsConfig={buildSnapshotValueMap(snapshot.paramItems)}
          onMemoryConfigChange={() => {}}
          onParamsConfigChange={() => {}}
          onStartGenerate={() => {}}
          readOnly
          className="m-0"
          actionLabel="配置已确认"
        />
      </div>
    </div>
  );
};

export const CopilotSidebar: React.FC<CopilotSidebarProps> = ({
  mode,
  writingState,
  input,
  initialPrompt,
  outline,
  documentTitle,
  thinkingPhase,
  thinkingStatus,
  thinkingContent,
  memoryConfig,
  paramsConfig,
  messages: externalMessages,
  pendingEdit,
  isApplyingPendingEdit = false,
  isCopilotResponding = false,
  copilotProgress = null,
  documents = [],
  activeDocumentId,
  onInputChange,
  onSend,
  onModeToggle,
  onOutlineConfirm,
  onMemoryConfigChange,
  onParamsConfigChange,
  onStartGenerate,
  onAcceptPendingEdit,
  onRejectPendingEdit,
  onMessagesChange,
  onDocumentSelect,
  onDocumentDelete,
  onConfirmAgentWrite,
  onCancelAgentWrite,
  mountedKnowledgeBaseIds,
  onMountedKnowledgeBaseChange,
  className,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('chat');
  const [internalMessages, setInternalMessages] = useState<SidebarMessage[]>([]);
  const [isKnowledgeBaseOpen, setIsKnowledgeBaseOpen] = useState<boolean>(false);
  const [isMemoryModalOpen, setIsMemoryModalOpen] = useState<boolean>(false);
  const [isParamsModalOpen, setIsParamsModalOpen] = useState<boolean>(false);
  const [initialized, setInitialized] = useState<boolean>(false);
  const [pendingDeleteDocumentId, setPendingDeleteDocumentId] = useState<string | null>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const scenarioData = getActiveScenarioData();
  const messages = externalMessages !== undefined ? externalMessages : internalMessages;
  const pendingDeleteDocument = pendingDeleteDocumentId
    ? documents.find((document) => document.id === pendingDeleteDocumentId) || null
    : null;

  const updateMessages = useCallback((newMessages: SidebarMessage[]) => {
    if (externalMessages !== undefined && onMessagesChange) {
      onMessagesChange(newMessages);
    } else {
      setInternalMessages(newMessages);
    }
  }, [externalMessages, onMessagesChange]);

  useEffect(() => {
    if (externalMessages !== undefined) {
      if (externalMessages.length > 0) {
        setInitialized(true);
        setInternalMessages(externalMessages);
      }
    }
  }, [externalMessages]);

  useEffect(() => {
    if (externalMessages !== undefined && externalMessages.length > 0) {
      return;
    }

    if (
      initialPrompt &&
      !initialized &&
      (writingState === WritingState.THINKING ||
        writingState === WritingState.OUTLINE_CONFIRM ||
        (writingState === WritingState.INPUT && mode === Mode.AGENT))
    ) {
      updateMessages([{ role: 'user', content: initialPrompt }]);
      setInitialized(true);
    }
  }, [initialPrompt, initialized, writingState, mode, externalMessages, updateMessages]);

  const handleSend = useCallback(() => {
    if (!input.trim()) return;

    const userMessage = input;
    updateMessages([...messages, { role: 'user', content: userMessage }]);
    onInputChange('');
    onSend();
  }, [input, onSend, messages, updateMessages, onInputChange]);

  useEffect(() => {
    const container = chatScrollRef.current;
    if (!container || activeTab !== 'chat') {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth',
      });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [
    activeTab,
    messages,
    pendingEdit,
    thinkingContent,
    thinkingPhase,
    thinkingStatus,
    writingState,
    isCopilotResponding,
    copilotProgress,
  ]);

  const renderChatContent = () => {
    const showOutlineBlock =
      outline.trim() &&
      mode === Mode.GENERAL &&
      writingState === WritingState.OUTLINE_CONFIRM;
    const isOutlineEditable = writingState === WritingState.OUTLINE_CONFIRM;
    const showArticleThinkingCard =
      writingState === WritingState.GENERATING &&
      thinkingPhase === 'article' &&
      thinkingStatus !== 'idle';
    const showEditThinkingCard =
      writingState === WritingState.FINISHED &&
      isCopilotResponding &&
      thinkingPhase === 'edit' &&
      thinkingStatus !== 'idle';
    const editProgressCopy =
      showEditThinkingCard && copilotProgress
        ? getCopilotProgressCopy(copilotProgress, mode)
        : null;
    const showOutlineThinkingCard =
      (writingState === WritingState.THINKING || writingState === WritingState.OUTLINE_CONFIRM) &&
      thinkingPhase === 'outline' &&
      thinkingStatus !== 'idle';
    const showCopilotProgressCard =
      isCopilotResponding &&
      writingState === WritingState.FINISHED &&
      !showEditThinkingCard &&
      Boolean(copilotProgress);

    return (
      <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, index) => (
          <React.Fragment key={msg.id || `message-${index}`}>
            {msg.variant === 'agent-config' && msg.configSnapshot ? (
              <AgentConfigMessageCard snapshot={msg.configSnapshot} />
            ) : msg.variant === 'document-card' && msg.documentId ? (
              (() => {
                const document = documents.find((item) => item.id === msg.documentId);
                if (!document) {
                  return null;
                }

                return (
                  <div
                    className="cursor-pointer"
                    onClick={() => onDocumentSelect?.(document.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        onDocumentSelect?.(document.id);
                      }
                    }}
                  >
                    <DocumentCard
                      title={document.title}
                      status={document.status === 'generating' ? 'generating' : 'finished'}
                    />
                  </div>
                );
              })()
            ) : msg.variant === 'agent-write-confirmation' && msg.writeConfirmation && msg.id ? (
              <AgentWriteConfirmationCard
                messageId={msg.id}
                content={typeof msg.content === 'string' ? msg.content : ''}
                writeConfirmation={msg.writeConfirmation}
                onConfirm={onConfirmAgentWrite}
                onCancel={onCancelAgentWrite}
              />
            ) : (
              <div
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] p-3 ${
                    msg.role === 'user'
                      ? 'rounded-lg bg-blue-500 text-white'
                      : msg.variant === 'workflow-message'
                        ? 'rounded-2xl border border-sky-200 bg-sky-50/80 text-sky-950 shadow-sm'
                        : 'rounded-lg bg-gray-100 text-gray-800'
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
                      <div
                        className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${
                          msg.variant === 'workflow-message' ? 'bg-sky-100' : 'bg-blue-100'
                        }`}
                      >
                        <span className="text-sm">🤖</span>
                      </div>
                      <div className="flex-1">
                        {typeof msg.content === 'string' ? (
                          <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                        ) : (
                          msg.content
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </React.Fragment>
        ))}

        {showOutlineThinkingCard && (
          <ThinkingCard phase={thinkingPhase} status={thinkingStatus} content={thinkingContent} />
        )}

        {showOutlineBlock && (
          <div className="flex justify-start">
            <div className="max-w-[88%] rounded-2xl bg-gray-50 p-4 text-sm text-gray-700">
              <div className="mb-3 leading-6">
                根据你的需求，我已经整理出如下大纲。你可以直接修改，确认无误后点击下方按钮，我会继续基于该大纲生成全文。
              </div>
              <OutlineConfirm
                outline={outline}
                fallbackTitle={documentTitle}
                onConfirm={onOutlineConfirm}
                onCancel={() => {}}
                readOnly={!isOutlineEditable}
              />
            </div>
          </div>
        )}

        {showArticleThinkingCard && (
          <ThinkingCard phase={thinkingPhase} status={thinkingStatus} content={thinkingContent} />
        )}

        {showEditThinkingCard && (
          <ThinkingCard
            phase={thinkingPhase}
            status={thinkingStatus}
            content={thinkingContent}
            titleOverride={editProgressCopy?.title}
            subtitleOverride={editProgressCopy?.subtitle}
          />
        )}

        {showCopilotProgressCard && copilotProgress && (
          <CopilotProgressCard progress={copilotProgress} mode={mode} />
        )}

        {isCopilotResponding && writingState === WritingState.FINISHED && !showEditThinkingCard && !showCopilotProgressCard && (
          <div className="flex justify-start">
            <div className="max-w-[88%] rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm">
                  🤖
                </div>
                <div className="text-sm text-gray-600">正在处理你的消息...</div>
              </div>
            </div>
          </div>
        )}

        {pendingEdit && onAcceptPendingEdit && onRejectPendingEdit && (
          <PendingEditCard
            pendingEdit={pendingEdit}
            isApplying={isApplyingPendingEdit}
            onAccept={onAcceptPendingEdit}
            onReject={onRejectPendingEdit}
          />
        )}

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
    <div className={`relative flex flex-col h-full bg-white border-l border-gray-200 ${className || ''}`}>
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

      {activeTab === 'chat' && renderChatContent()}
      {activeTab === 'doc' && (
        <div className="flex-1 overflow-y-auto p-4">
          {documents.length > 0 ? (
            <div className="space-y-3">
              {documents.map((document) => (
                <DocumentListCard
                  key={document.id}
                  document={document}
                  isActive={document.id === activeDocumentId}
                  onSelect={onDocumentSelect}
                  onDelete={setPendingDeleteDocumentId}
                />
              ))}
            </div>
          ) : (
            <div className="mt-8 text-center text-gray-500">当前还没有文档</div>
          )}
        </div>
      )}
      {activeTab === 'kb' && (
        <div className="flex-1 overflow-y-auto p-4">
          <div className="mt-8 text-center text-gray-500">知识库</div>
        </div>
      )}

      {activeTab === 'chat' && (
        <div className="border-t border-gray-200">
          <InputArea
            mode={mode}
            input={input}
            onInputChange={onInputChange}
            onSend={handleSend}
            onModeToggle={onModeToggle}
            onKnowledgeBaseClick={() => setIsKnowledgeBaseOpen(true)}
            selectedKnowledgeBases={mountedKnowledgeBaseIds}
            onKnowledgeBaseRemove={(id) => {
              onMountedKnowledgeBaseChange(
                mountedKnowledgeBaseIds.filter((item) => item !== id)
              );
            }}
            selectedScenarioId={scenarioData?.id}
            onMemoryClick={() => setIsMemoryModalOpen(true)}
            onParamsClick={() => setIsParamsModalOpen(true)}
            onAgentSelect={(scenarioId) => {
              if (scenarioId) {
                setActiveScenarioId(scenarioId);
              }
            }}
            disabled={
              writingState === WritingState.THINKING ||
              writingState === WritingState.GENERATING ||
              isApplyingPendingEdit
            }
            hideAgentAndModeSelector
          />
        </div>
      )}

      {pendingDeleteDocument ? (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/35 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <div className="text-base font-medium text-gray-900">是否确认删除</div>
            <div className="mt-2 text-sm leading-6 text-gray-600">
              将删除《{pendingDeleteDocument.title}》，删除后不可恢复。
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setPendingDeleteDocumentId(null)}
                className="rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
              >
                取消
              </button>
              <button
                onClick={() => {
                  onDocumentDelete?.(pendingDeleteDocument.id);
                  setPendingDeleteDocumentId(null);
                }}
                className="rounded-lg bg-red-500 px-3 py-1.5 text-sm text-white hover:bg-red-600"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <KnowledgeBaseSelector
        isOpen={isKnowledgeBaseOpen}
        onClose={() => setIsKnowledgeBaseOpen(false)}
        initialSelectedIds={mountedKnowledgeBaseIds}
        onConfirm={(selectedIds) => {
          onMountedKnowledgeBaseChange(selectedIds);
          setIsKnowledgeBaseOpen(false);
        }}
      />

      <MemoryModal
        isOpen={isMemoryModalOpen}
        onClose={() => setIsMemoryModalOpen(false)}
        onUpdate={(values) => {
          onMemoryConfigChange(values);
        }}
      />

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
