import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GeneralContentSource, Mode, WritingState, isValidTransition } from '../types/writing';
import type {
  CopilotProgressIntent,
  CopilotProgressStage,
  CopilotProgressState,
  CopilotResponse,
  PendingCopilotEdit,
} from '../types/copilot';
import { mockDataStore, ScenarioId, setActiveScenarioId } from '../constants/mockData';
import { Editor } from '../components/Editor';
import type { RewriteType } from '../components/RewriteWindow';
import { CopilotSidebar } from '../components/CopilotSidebar';
import { ArrowLeft, Clock, Edit2 } from 'lucide-react';
import { getTask, updateTask } from '../utils/taskStore';
import type { Task } from '../utils/taskStore';
import { streamAgent } from '../services/agentClient';
import { queryCopilotWithQwen } from '../services/copilotClient';
import { rewriteWithQwen } from '../services/qwenClient';
import { generateOutlineWithQwen, streamArticleWithQwen, streamThoughtWithQwen } from '../services/writingClient';
import type {
  AgentConfigSnapshot,
  AgentWriteConfirmation,
  ChatMessageVariant,
} from '../types/chat';
import type { WritingDocument, WritingDocumentStatus } from '../types/document';

interface WorkspaceViewProps {
  initialInput: string;
  initialMode: Mode;
  initialScenarioId?: ScenarioId;
  taskId?: string | null;
  onBack?: () => void;
  mountedKnowledgeBaseIds: string[];
  onMountedKnowledgeBaseChange: (ids: string[]) => void;
}

type ThinkingPhase = 'outline' | 'article' | 'edit' | null;
type ThinkingStatus = 'idle' | 'streaming' | 'done' | 'error';
type ChatMessage = {
  id?: string;
  role: 'user' | 'ai';
  content: string | JSX.Element;
  variant?: ChatMessageVariant;
  title?: string;
  configSnapshot?: AgentConfigSnapshot;
  writeConfirmation?: AgentWriteConfirmation;
  documentId?: string;
};

interface HeadingEntry {
  title: string;
  level: number;
  start: number;
}

const getHeadingEntries = (document: string): HeadingEntry[] => {
  const regex = /^#{1,6}\s+(.+)$/gm;
  const headings: HeadingEntry[] = [];

  for (const match of document.matchAll(regex)) {
    const raw = match[0];
    const title = match[1]?.trim();
    const start = match.index ?? -1;
    if (!title || start < 0) {
      continue;
    }

    const levelMatch = raw.match(/^#{1,6}/);
    headings.push({
      title,
      level: levelMatch ? levelMatch[0].length : 1,
      start,
    });
  }

  return headings;
};

const getSectionRange = (
  document: string,
  sectionTitle?: string
): { start: number; end: number } | null => {
  if (!sectionTitle?.trim()) {
    return null;
  }

  const headings = getHeadingEntries(document);
  const targetIndex = headings.findIndex((heading) => heading.title === sectionTitle.trim());
  if (targetIndex === -1) {
    return null;
  }

  const target = headings[targetIndex];
  let end = document.length;

  for (let index = targetIndex + 1; index < headings.length; index += 1) {
    if (headings[index].level <= target.level) {
      end = headings[index].start;
      break;
    }
  }

  return {
    start: target.start,
    end,
  };
};

const findAllIndices = (source: string, target: string): number[] => {
  if (!target) {
    return [];
  }

  const indices: number[] = [];
  let fromIndex = 0;

  while (fromIndex <= source.length - target.length) {
    const foundIndex = source.indexOf(target, fromIndex);
    if (foundIndex === -1) {
      break;
    }

    indices.push(foundIndex);
    fromIndex = foundIndex + target.length;
  }

  return indices;
};

const resolveReplacementRange = (
  document: string,
  targetText: string,
  sectionTitle?: string
): { start: number; end: number } | null => {
  const normalizedTarget = targetText.trim();
  if (!normalizedTarget) {
    return null;
  }

  const sectionRange = getSectionRange(document, sectionTitle);
  if (sectionRange) {
    const sectionText = document.slice(sectionRange.start, sectionRange.end);
    const sectionMatches = findAllIndices(sectionText, normalizedTarget);
    if (sectionMatches.length === 1) {
      return {
        start: sectionRange.start + sectionMatches[0],
        end: sectionRange.start + sectionMatches[0] + normalizedTarget.length,
      };
    }
  }

  const globalMatches = findAllIndices(document, normalizedTarget);
  if (globalMatches.length !== 1) {
    return null;
  }

  return {
    start: globalMatches[0],
    end: globalMatches[0] + normalizedTarget.length,
  };
};

const applyPendingEditToDocument = (
  document: string,
  pendingEdit: PendingCopilotEdit
): string | null => {
  const range = resolveReplacementRange(
    document,
    pendingEdit.targetText,
    pendingEdit.sectionTitle
  );
  if (!range) {
    return null;
  }

  return `${document.slice(0, range.start)}${pendingEdit.replacementText}${document.slice(range.end)}`;
};

const serializeChatHistory = (messages: ChatMessage[]): Array<{ role: 'user' | 'ai'; content: string }> => {
  return messages
    .filter(
      (message): message is ChatMessage & { content: string } =>
        typeof message.content === 'string' &&
        message.content.trim().length > 0 &&
        !message.variant
    )
    .map((message) => ({
      role: message.role,
      content: message.content,
    }))
    .slice(-4);
};

const upsertMessageById = (
  messages: ChatMessage[],
  nextMessage: ChatMessage & { id: string }
): ChatMessage[] => {
  const messageIndex = messages.findIndex((message) => message.id === nextMessage.id);
  if (messageIndex === -1) {
    return [...messages, nextMessage];
  }

  const nextMessages = [...messages];
  nextMessages[messageIndex] = {
    ...nextMessages[messageIndex],
    ...nextMessage,
  };
  return nextMessages;
};

const appendMessage = (
  messages: ChatMessage[],
  nextMessage: ChatMessage
): ChatMessage[] => {
  if (nextMessage.id && messages.some((message) => message.id === nextMessage.id)) {
    return messages;
  }

  return [...messages, nextMessage];
};

const createDocumentId = () => `doc_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

const EDIT_INTENT_PATTERN =
  /(改写|修改|润色|扩写|扩充|精简|缩写|补充|补写|完善|优化|调整|重写|改成|改为|删除|增加|替换|续写|补全|改动)/;

const EDIT_TARGET_PATTERN =
  /(这段|这一段|这个段落|段落|章节|小节|这部分|原文|这句话|这句|这一节|标题)/;

const RESTART_INTENT_PATTERN =
  /(再写一篇|重写一篇|重新写|重新生成|重新来|另写一篇|换个主题|换一篇|新写一篇|再来一篇|重新开始写|重新开始生成|重新起草|再生成一篇|写一篇新的)/;

const DOCUMENT_QA_HINT_PATTERN =
  /(根据原文|根据文章|根据文档|文中|原文中|文章里|文档里|这篇|这段|这一段|该段|段落|章节|上文|前文|全文|本文|本段|报告中|项目中)/;

const QA_INTENT_PATTERN =
  /[?？]|为什么|为何|原因|哪些|哪里|如何|怎么|是否|是不是|有无|多少|总结|概括|解释/;

const CHAT_INTENT_PATTERN = /(你好|在吗|谢谢|辛苦|收到|明白|好的|ok|可以|哈哈|聊聊|随便聊)/i;
const CHAT_FAST_TRACK_PATTERN =
  /^(你好|在吗|谢谢|辛苦了?|收到|明白|好的|ok|可以|哈哈|聊聊|随便聊|你知道|你了解|你听说过|介绍一下|讲讲|你怎么看|你觉得)/i;

const COPILOT_PROGRESS_PLAN: Record<
  CopilotProgressIntent,
  Array<{ stage: CopilotProgressStage; delay: number }>
> = {
  unknown: [
    { stage: 'routing', delay: 0 },
    { stage: 'drafting', delay: 1400 },
  ],
  edit: [
    { stage: 'routing', delay: 0 },
    { stage: 'locating', delay: 900 },
    { stage: 'rewriting', delay: 2600 },
  ],
  qa: [
    { stage: 'routing', delay: 0 },
    { stage: 'retrieving', delay: 900 },
    { stage: 'answering', delay: 2600 },
  ],
  chat: [
    { stage: 'routing', delay: 0 },
    { stage: 'chatting', delay: 1200 },
  ],
  restart: [
    { stage: 'routing', delay: 0 },
    { stage: 'planning', delay: 1000 },
  ],
  agent_write_related: [
    { stage: 'routing', delay: 0 },
    { stage: 'planning', delay: 1000 },
  ],
  agent_write_unrelated: [
    { stage: 'routing', delay: 0 },
    { stage: 'planning', delay: 1000 },
  ],
};

const isLikelyEditIntent = (query: string): boolean => {
  const normalized = query.trim();
  if (!normalized) {
    return false;
  }

  return (
    EDIT_INTENT_PATTERN.test(normalized) ||
    (EDIT_TARGET_PATTERN.test(normalized) && /(改|写|删|补|扩|缩|润|调|优化|重写)/.test(normalized))
  );
};

const isLikelyLightweightChat = (query: string): boolean => {
  const normalized = query.trim();
  if (!normalized) {
    return false;
  }

  if (isLikelyEditIntent(normalized) || RESTART_INTENT_PATTERN.test(normalized)) {
    return false;
  }

  if (DOCUMENT_QA_HINT_PATTERN.test(normalized)) {
    return false;
  }

  if (CHAT_INTENT_PATTERN.test(normalized) || CHAT_FAST_TRACK_PATTERN.test(normalized)) {
    return true;
  }

  return /^(嗯|嗯嗯|好|好的|收到|明白了|辛苦了?|谢谢(你)?|thx|thanks)[!！。,. ]*$/i.test(normalized);
};

const predictCopilotIntent = (query: string): CopilotProgressIntent => {
  const normalized = query.trim();
  if (!normalized) {
    return 'unknown';
  }

  if (isLikelyEditIntent(normalized)) {
    return 'edit';
  }

  if (RESTART_INTENT_PATTERN.test(normalized)) {
    return 'restart';
  }

  if (isLikelyLightweightChat(normalized)) {
    return 'chat';
  }

  if (DOCUMENT_QA_HINT_PATTERN.test(normalized) || QA_INTENT_PATTERN.test(normalized)) {
    return 'qa';
  }

  return 'unknown';
};

const buildInitialDocuments = (task: Task | null): WritingDocument[] => {
  if (task?.documents?.length) {
    return task.documents;
  }

  if (!task?.content?.trim()) {
    return [];
  }

  return [
    {
      id: 'doc_legacy',
      title: task.documentName || '新文档_1',
      content: task.content,
      prompt: task.input,
      createdAt: task.updatedAt || task.createdAt || Date.now(),
      status: task.writingState === WritingState.GENERATING ? 'generating' : 'finished',
      scenarioId: task.scenarioId,
    },
  ];
};

const resolveInitialActiveDocumentId = (
  task: Task | null,
  documents: WritingDocument[]
): string | null => {
  if (task?.activeDocumentId && documents.some((document) => document.id === task.activeDocumentId)) {
    return task.activeDocumentId;
  }

  return documents[0]?.id ?? null;
};

export const WorkspaceView: React.FC<WorkspaceViewProps> = ({
  initialInput,
  initialMode,
  initialScenarioId,
  taskId,
  onBack,
  mountedKnowledgeBaseIds,
  onMountedKnowledgeBaseChange,
}) => {
  const initialTask = taskId ? getTask(taskId) : null;
  const initialDocuments = buildInitialDocuments(initialTask);
  const initialActiveDocumentId = resolveInitialActiveDocumentId(initialTask, initialDocuments);
  const initialActiveDocument =
    initialDocuments.find((document) => document.id === initialActiveDocumentId) || null;
  const [mode, setMode] = useState<Mode>(initialTask?.mode ?? initialMode);
  const [writingState, setWritingState] = useState<WritingState>(
    initialTask?.writingState ?? WritingState.THINKING
  );
  const [input, setInput] = useState<string>('');
  const [submittedPrompt, setSubmittedPrompt] = useState<string>(initialTask?.input ?? initialInput);
  const [currentScenarioId, setCurrentScenarioId] = useState<ScenarioId | undefined>(
    initialTask?.scenarioId ?? initialScenarioId
  );
  const [generalContentSource, setGeneralContentSource] = useState<GeneralContentSource>(
    'api'
  );
  const [agentId, setAgentId] = useState<string | undefined>();
  const [memoryConfig, setMemoryConfig] = useState<Record<string, any>>(
    initialTask?.memoryConfig ?? {}
  );
  const [paramsConfig, setParamsConfig] = useState<Record<string, any>>(
    initialTask?.paramsConfig ?? {}
  );
  const [outline, setOutline] = useState<string>(initialTask?.outline ?? '');
  const [documents, setDocuments] = useState<WritingDocument[]>(initialDocuments);
  const [activeDocumentId, setActiveDocumentId] = useState<string | null>(initialActiveDocumentId);
  const [content, setContent] = useState<string>(
    initialActiveDocument?.content ?? initialTask?.content ?? ''
  );
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [thinkingPhase, setThinkingPhase] = useState<ThinkingPhase>(null);
  const [thinkingStatus, setThinkingStatus] = useState<ThinkingStatus>('idle');
  const [thinkingContent, setThinkingContent] = useState<string>('');
  const [documentName, setDocumentName] = useState<string>(
    initialActiveDocument?.title ?? initialTask?.documentName ?? '新文档_1'
  );
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [messages, setMessages] = useState<ChatMessage[]>(
    (initialTask?.messages ?? []).map((m) => ({
      role: m.role,
      content: m.content,
      variant: m.variant,
      title: m.title,
      configSnapshot: m.configSnapshot,
      writeConfirmation: m.writeConfirmation,
      documentId: m.documentId,
    }))
  );
  const [pendingCopilotEdit, setPendingCopilotEdit] = useState<PendingCopilotEdit | null>(null);
  const [isCopilotResponding, setIsCopilotResponding] = useState<boolean>(false);
  const [isApplyingPendingEdit, setIsApplyingPendingEdit] = useState<boolean>(false);
  const [copilotProgress, setCopilotProgress] = useState<CopilotProgressState | null>(null);
  const currentTaskIdRef = useRef<string | null>(taskId || null);
  const activeDocumentIdRef = useRef<string | null>(initialActiveDocumentId);
  const generalRequestSeqRef = useRef(0);
  const articleRequestSeqRef = useRef(0);
  const articleStreamRef = useRef(0);
  const thinkingRequestSeqRef = useRef(0);
  const copilotProgressTimerRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);

  const scenarioData = currentScenarioId ? mockDataStore[currentScenarioId] || null : null;

  const loadDocumentIntoEditor = useCallback((document: WritingDocument | null) => {
    setContent(document?.content || '');
    setDocumentName(document?.title || '新文档_1');
  }, []);

  const applyDocumentPatch = useCallback(
    (documentId: string, patch: Partial<WritingDocument>) => {
      setDocuments((prev) =>
        prev.map((document) =>
          document.id === documentId ? { ...document, ...patch } : document
        )
      );

      if (activeDocumentIdRef.current === documentId) {
        if (patch.content !== undefined) {
          setContent(patch.content);
        }
        if (patch.title !== undefined) {
          setDocumentName(patch.title);
        }
      }
    },
    []
  );

  const createDocumentEntry = useCallback(
    ({
      prompt,
      title,
      status,
      content: documentContent = '',
    }: {
      prompt: string;
      title: string;
      status: WritingDocumentStatus;
      content?: string;
    }) => {
      const documentId = createDocumentId();
      const nextDocument: WritingDocument = {
        id: documentId,
        title,
        content: documentContent,
        prompt,
        createdAt: Date.now(),
        status,
        scenarioId: currentScenarioId,
      };

      setDocuments((prev) => [nextDocument, ...prev]);
      setActiveDocumentId(documentId);
      activeDocumentIdRef.current = documentId;
      loadDocumentIntoEditor(nextDocument);
      return documentId;
    },
    [currentScenarioId, loadDocumentIntoEditor]
  );

  const selectDocument = useCallback(
    (documentId: string) => {
      const targetDocument = documents.find((document) => document.id === documentId);
      if (!targetDocument) {
        return;
      }

      setActiveDocumentId(documentId);
      activeDocumentIdRef.current = documentId;
      setPendingCopilotEdit(null);
      loadDocumentIntoEditor(targetDocument);
    },
    [documents, loadDocumentIntoEditor]
  );

  const deleteDocument = useCallback(
    (documentId: string) => {
      const targetIndex = documents.findIndex((document) => document.id === documentId);
      if (targetIndex === -1) {
        return;
      }

      const remainingDocuments = documents.filter((document) => document.id !== documentId);
      const fallbackDocument =
        remainingDocuments[targetIndex] || remainingDocuments[targetIndex - 1] || remainingDocuments[0] || null;

      setDocuments(remainingDocuments);
      setMessages((prev) =>
        prev.filter(
          (message) => !(message.variant === 'document-card' && message.documentId === documentId)
        )
      );

      if (activeDocumentIdRef.current === documentId) {
        const nextActiveDocumentId = fallbackDocument?.id || null;
        setActiveDocumentId(nextActiveDocumentId);
        activeDocumentIdRef.current = nextActiveDocumentId;
        setPendingCopilotEdit(null);
        loadDocumentIntoEditor(fallbackDocument);
        return;
      }

      if (activeDocumentId === documentId) {
        setActiveDocumentId(fallbackDocument?.id || null);
        activeDocumentIdRef.current = fallbackDocument?.id || null;
      }
    },
    [documents, activeDocumentId, loadDocumentIntoEditor]
  );

  const appendDocumentCardMessage = useCallback((documentId: string) => {
    setMessages((prev) =>
      appendMessage(prev, {
        id: `document-card-${documentId}`,
        role: 'ai',
        content: '',
        variant: 'document-card',
        documentId,
      })
    );
  }, []);

  const extractFirstH1Title = useCallback((text: string): string | null => {
    const h1Match = text.match(/^#\s+(.+)$/m);
    if (h1Match) {
      return h1Match[1].trim();
    }
    return null;
  }, []);

  const resetThinking = useCallback(() => {
    thinkingRequestSeqRef.current += 1;
    setThinkingPhase(null);
    setThinkingStatus('idle');
    setThinkingContent('');
  }, []);

  const clearCopilotProgressTimers = useCallback(() => {
    copilotProgressTimerRef.current.forEach((timerId) => clearTimeout(timerId));
    copilotProgressTimerRef.current = [];
  }, []);

  const resetCopilotProgress = useCallback(() => {
    clearCopilotProgressTimers();
    setCopilotProgress(null);
  }, [clearCopilotProgressTimers]);

  const startCopilotProgress = useCallback(
    (query: string) => {
      const predictedIntent = predictCopilotIntent(query);
      const progressPlan = COPILOT_PROGRESS_PLAN[predictedIntent] || COPILOT_PROGRESS_PLAN.unknown;

      clearCopilotProgressTimers();
      setCopilotProgress({
        intent: predictedIntent,
        stage: progressPlan[0]?.stage || 'routing',
      });

      progressPlan.slice(1).forEach(({ stage, delay }) => {
        const timerId = setTimeout(() => {
          setCopilotProgress((current) => {
            if (!current) {
              return current;
            }
            return {
              intent: current.intent,
              stage,
            };
          });
        }, delay);

        copilotProgressTimerRef.current.push(timerId);
      });

      return predictedIntent;
    },
    [clearCopilotProgressTimers]
  );

  const streamRemoteThinking = useCallback(
    async ({
      phase,
      prompt,
      outline,
      knowledgeBaseIds = [],
      ignoreError = false,
    }: {
      phase: Exclude<ThinkingPhase, null>;
      prompt: string;
      outline?: string;
      knowledgeBaseIds?: string[];
      ignoreError?: boolean;
    }) => {
      const requestId = ++thinkingRequestSeqRef.current;
      setThinkingPhase(phase);
      setThinkingStatus('streaming');
      setThinkingContent('');

      try {
        const finalThinking = await streamThoughtWithQwen({
          prompt,
          outline,
          phase,
          knowledgeBaseIds,
          onChunk: (_delta, accumulated) => {
            if (requestId !== thinkingRequestSeqRef.current) {
              return;
            }
            setThinkingContent(accumulated);
          },
        });

        if (requestId !== thinkingRequestSeqRef.current) {
          return '';
        }

        setThinkingContent(finalThinking);
        setThinkingStatus('done');
        return finalThinking;
      } catch (error) {
        if (requestId !== thinkingRequestSeqRef.current) {
          return '';
        }

        if (ignoreError) {
          setThinkingPhase(null);
          setThinkingStatus('idle');
          setThinkingContent('');
          return '';
        }

        const messageText = error instanceof Error ? error.message : '思考过程生成失败';
        setThinkingStatus('error');
        setThinkingContent(messageText);
        throw error;
      }
    },
    []
  );

  const runGeneralFlow = useCallback(
    async (query: string) => {
      const trimmedQuery = query.trim();
      if (!trimmedQuery) {
        return;
      }

      const requestId = ++generalRequestSeqRef.current;

      setSubmittedPrompt(trimmedQuery);
      setPendingCopilotEdit(null);
      setIsCopilotResponding(false);
      setIsApplyingPendingEdit(false);
      resetCopilotProgress();
      setWritingState(WritingState.THINKING);
      setOutline('');
      setContent('');
      setIsGenerating(false);
      setThinkingPhase('outline');
      setThinkingStatus('streaming');
      setThinkingContent('');

      setCurrentScenarioId(undefined);
      setGeneralContentSource('api');

      try {
        const thinkingPromise = streamRemoteThinking({
          phase: 'outline',
          prompt: trimmedQuery,
          knowledgeBaseIds: mountedKnowledgeBaseIds,
        }).catch(() => '');

        const [generatedOutline] = await Promise.all([
          generateOutlineWithQwen({
            prompt: trimmedQuery,
            knowledgeBaseIds: mountedKnowledgeBaseIds,
          }),
          thinkingPromise,
        ]);

        if (requestId !== generalRequestSeqRef.current) {
          return;
        }

        setOutline(generatedOutline);
        const title = extractFirstH1Title(generatedOutline);
        if (title) {
          setDocumentName(title);
        }
        setWritingState(WritingState.OUTLINE_CONFIRM);
      } catch (error) {
        if (requestId !== generalRequestSeqRef.current) {
          return;
        }

        const messageText =
          error instanceof Error ? error.message : '大纲生成失败，请稍后重试。';
        setWritingState(WritingState.INPUT);
        setMessages((prev) => [...prev, { role: 'ai', content: `大纲生成失败：${messageText}` }]);
      }
    },
    [extractFirstH1Title, mountedKnowledgeBaseIds, streamRemoteThinking, resetCopilotProgress]
  );

  useEffect(() => {
    if (currentScenarioId) {
      setActiveScenarioId(currentScenarioId);
    }
  }, [currentScenarioId]);

  useEffect(() => {
    activeDocumentIdRef.current = activeDocumentId;
  }, [activeDocumentId]);

  useEffect(() => {
    if (taskId) {
      const task = getTask(taskId);
      if (task) {
        const taskDocuments = buildInitialDocuments(task);
        const nextActiveDocumentId = resolveInitialActiveDocumentId(task, taskDocuments);
        const nextActiveDocument =
          taskDocuments.find((document) => document.id === nextActiveDocumentId) || null;

        currentTaskIdRef.current = taskId;
        setMode(task.mode);
        setWritingState(task.writingState);
        setInput('');
        setSubmittedPrompt(task.input);
        setCurrentScenarioId(task.scenarioId);
        setGeneralContentSource('api');
        setDocuments(taskDocuments);
        setActiveDocumentId(nextActiveDocumentId);
        activeDocumentIdRef.current = nextActiveDocumentId;
        setContent(nextActiveDocument?.content ?? task.content);
        setThinkingPhase(null);
        setThinkingStatus('idle');
        setThinkingContent('');
        setPendingCopilotEdit(null);
        setIsCopilotResponding(false);
        setIsApplyingPendingEdit(false);
        resetCopilotProgress();
        setDocumentName(nextActiveDocument?.title ?? task.documentName ?? '新文档_1');
        setOutline(task.outline);
        setMemoryConfig(task.memoryConfig || {});
        setParamsConfig(task.paramsConfig || {});
        setMessages(
          (task.messages || []).map((m) => ({
            role: m.role,
            content: m.content,
            variant: m.variant,
            title: m.title,
            configSnapshot: m.configSnapshot,
            writeConfirmation: m.writeConfirmation,
            documentId: m.documentId,
          }))
        );
        if (task.scenarioId) {
          setActiveScenarioId(task.scenarioId);
        }
      }
    } else {
      currentTaskIdRef.current = null;
    }
  }, [taskId, resetCopilotProgress]);

  const saveCurrentTask = useCallback(() => {
    if (currentTaskIdRef.current) {
      updateTask(currentTaskIdRef.current, {
        mode,
        writingState,
        input: submittedPrompt,
        content,
        documentName,
        outline,
        memoryConfig,
        paramsConfig,
        documents,
        activeDocumentId,
        messages: messages.length > 0 ? messages : [],
        scenarioId: currentScenarioId,
        generalContentSource,
      });
    }
  }, [
    mode,
    writingState,
    submittedPrompt,
    content,
    documentName,
    outline,
    memoryConfig,
    paramsConfig,
    documents,
    activeDocumentId,
    messages,
    currentScenarioId,
    generalContentSource,
  ]);

  const handleBack = useCallback(() => {
    saveCurrentTask();
    if (onBack) {
      onBack();
    }
  }, [saveCurrentTask, onBack]);

  useEffect(() => {
    if (currentTaskIdRef.current) {
      const interval = setInterval(() => {
        saveCurrentTask();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [saveCurrentTask]);

  useEffect(() => {
    if (currentTaskIdRef.current) {
      saveCurrentTask();
    }
  }, [writingState, content, documentName, messages, outline, saveCurrentTask]);

  useEffect(() => {
    if (initialScenarioId) {
      setCurrentScenarioId(initialScenarioId);
      setActiveScenarioId(initialScenarioId);
    }
  }, [initialScenarioId]);

  const [hasInitialized, setHasInitialized] = useState<boolean>(() => {
    if (taskId) {
      const task = getTask(taskId);
      if (task && (task.content || task.writingState !== WritingState.THINKING)) {
        return true;
      }
    }
    return false;
  });

  useEffect(() => {
    if (taskId) {
      const task = getTask(taskId);
      if (task) {
        if (task.content || task.writingState !== WritingState.THINKING) {
          setHasInitialized(true);
          return;
        }
      }
    }

    if (initialInput && !hasInitialized && writingState === WritingState.THINKING) {
      setHasInitialized(true);

      if (mode === Mode.GENERAL) {
        void runGeneralFlow(initialInput);
      } else {
        if (scenarioData) {
          setAgentId(scenarioData.agentConfig.id);
        }
        setWritingState(WritingState.INPUT);
      }
    }
  }, [initialInput, hasInitialized, writingState, mode, taskId, runGeneralFlow, scenarioData]);

  useEffect(() => {
    if (input.includes('@') && mode === Mode.GENERAL) {
      setMode(Mode.AGENT);
      setWritingState(WritingState.INPUT);
      if (scenarioData) {
        setAgentId(scenarioData.agentConfig.id);
      }
    }
  }, [input, mode, scenarioData]);

  useEffect(() => {
    if (mode === Mode.AGENT && !agentId && scenarioData) {
      setAgentId(scenarioData.agentConfig.id);
    }
  }, [mode, agentId, scenarioData]);

  const handleDocumentCopilotResult = useCallback(
    (trimmedQuery: string, result: CopilotResponse) => {
      if (result.intent === 'edit') {
        if (
          result.edit?.status === 'ready' &&
          result.edit.targetText?.trim() &&
          typeof result.edit.replacementText === 'string'
        ) {
          const nextPendingEdit: PendingCopilotEdit = {
            instruction: trimmedQuery,
            sectionTitle: result.edit.sectionTitle?.trim() || undefined,
            targetText: result.edit.targetText,
            replacementText: result.edit.replacementText,
          };

          const previewDocument = applyPendingEditToDocument(content, nextPendingEdit);
          if (!previewDocument) {
            setMessages((prev) => [
              ...prev,
              {
                role: 'ai',
                content: '我暂时没法稳定定位到唯一修改位置，请再说具体章节名，或者直接贴出要修改的原句。',
              },
            ]);
            return;
          }

          setPendingCopilotEdit(nextPendingEdit);
          setMessages((prev) => [
            ...prev,
            {
              role: 'ai',
              content: result.reply.trim() || '我已经定位到对应内容，请确认是否接受这次修改。',
            },
          ]);
          return;
        }

        setMessages((prev) => [
          ...prev,
          {
            role: 'ai',
            content: result.reply.trim() || '我还需要你再说明一下具体要改哪一段。',
          },
        ]);
        return;
      }

      setMessages((prev) => [
        ...prev,
        {
          role: 'ai',
          content: result.reply.trim() || '我暂时没有可返回的内容，请稍后再试。',
        },
      ]);
    },
    [content]
  );

  const handleGeneralCopilotTurn = useCallback(
    async (query: string) => {
      const trimmedQuery = query.trim();
      if (!trimmedQuery || !content.trim()) {
        return;
      }

      setPendingCopilotEdit(null);
      setIsCopilotResponding(true);
      const predictedIntent = startCopilotProgress(trimmedQuery);
      const useLightweightChat = predictedIntent === 'chat';
      let startedNewWritingFlow = false;

      try {
        const result = await queryCopilotWithQwen({
          message: trimmedQuery,
          document: useLightweightChat ? '' : content,
          outline: useLightweightChat ? '' : outline,
          title: documentName,
          history: useLightweightChat ? [] : serializeChatHistory(messages),
          mode: 'general',
          knowledgeBaseIds: useLightweightChat ? [] : mountedKnowledgeBaseIds,
          lightweightChat: useLightweightChat,
        });

        if (result.intent === 'restart') {
          setIsCopilotResponding(false);
          resetCopilotProgress();
          startedNewWritingFlow = true;
          void runGeneralFlow(result.topic?.trim() || trimmedQuery);
          return;
        }

        handleDocumentCopilotResult(trimmedQuery, result);
      } catch (error) {
        const messageText = error instanceof Error ? error.message : 'Copilot 处理失败，请稍后重试。';
        setMessages((prev) => [...prev, { role: 'ai', content: `处理失败：${messageText}` }]);
      } finally {
        setIsCopilotResponding(false);
        if (!startedNewWritingFlow) {
          resetCopilotProgress();
        }
      }
    },
    [
      content,
      outline,
      documentName,
      messages,
      startCopilotProgress,
      resetCopilotProgress,
      runGeneralFlow,
      handleDocumentCopilotResult,
      mountedKnowledgeBaseIds,
    ]
  );

  function handleConfirmAgentWrite(messageId: string) {
    const confirmationMessage = messages.find((message) => message.id === messageId);
    const topic = confirmationMessage?.writeConfirmation?.topic?.trim();
    if (!topic) {
      return;
    }

    setMessages((prev) => {
      const updatedMessages = prev.map((message) =>
        message.id === messageId && message.writeConfirmation
          ? {
              ...message,
              writeConfirmation: {
                ...message.writeConfirmation,
                status: 'confirmed' as const,
              },
            }
          : message
      );

      return [
        ...updatedMessages,
        {
          role: 'user',
          content: `确认使用当前智能体生成：${topic}`,
        },
      ];
    });

    startAgentDocumentGeneration({
      promptText: topic,
      appendConfigSnapshot: false,
    });
  }

  function handleCancelAgentWrite(messageId: string) {
    setMessages((prev) => {
      const updatedMessages = prev.map((message) =>
        message.id === messageId && message.writeConfirmation
          ? {
              ...message,
              writeConfirmation: {
                ...message.writeConfirmation,
                status: 'cancelled' as const,
              },
            }
          : message
      );

      return [
        ...updatedMessages,
        {
          role: 'ai',
          content: '已取消使用当前智能体生成该主题。',
        },
      ];
    });
  }

  async function handleAgentCopilotTurn(query: string) {
    const trimmedQuery = query.trim();
    if (!trimmedQuery || !content.trim() || !scenarioData?.agentConfig) {
      return;
    }

    setPendingCopilotEdit(null);
    setIsCopilotResponding(true);
    const predictedIntent = startCopilotProgress(trimmedQuery);
    const useLightweightChat = predictedIntent === 'chat';
    let startedNewWritingFlow = false;

    try {
      const result = await queryCopilotWithQwen({
        message: trimmedQuery,
        document: useLightweightChat ? '' : content,
        outline: useLightweightChat ? '' : outline,
        title: documentName,
        history: useLightweightChat ? [] : serializeChatHistory(messages),
        mode: 'agent',
        agentContext: {
          agentName: scenarioData.agentConfig.name,
          agentDescription: scenarioData.agentConfig.description,
        },
        lightweightChat: useLightweightChat,
      });

      if (result.intent === 'agent_write_related' || result.intent === 'restart') {
        setIsCopilotResponding(false);
        resetCopilotProgress();
        startedNewWritingFlow = true;
        startAgentDocumentGeneration({
          promptText: result.topic || trimmedQuery,
          appendConfigSnapshot: false,
        });
        return;
      }

      if (result.intent === 'agent_write_unrelated') {
        const topic = result.topic?.trim() || trimmedQuery;
        setMessages((prev) => [
          ...prev,
          {
            id: `agent-write-confirmation-${Date.now()}`,
            role: 'ai',
            content:
              result.reply.trim() ||
              `如果需要非当前智能体相关主题的写作，可以新开任务，使用通用智能体模式；请问您确认要使用当前智能体生成《${topic}》吗？`,
            variant: 'agent-write-confirmation',
            writeConfirmation: {
              topic,
              agentName: scenarioData.agentConfig.name,
              status: 'pending',
            },
          },
        ]);
        return;
      }

      handleDocumentCopilotResult(trimmedQuery, result);
    } catch (error) {
      const messageText = error instanceof Error ? error.message : 'Copilot 处理失败，请稍后重试。';
      setMessages((prev) => [...prev, { role: 'ai', content: `处理失败：${messageText}` }]);
    } finally {
      setIsCopilotResponding(false);
      if (!startedNewWritingFlow) {
        resetCopilotProgress();
      }
    }
  }

  function handleSendQuery() {
    const query = input.trim();
    if (!query) {
      return;
    }

    setInput('');

    if (mode === Mode.GENERAL) {
      if (writingState === WritingState.FINISHED && content.trim()) {
        void handleGeneralCopilotTurn(query);
        return;
      }

      void runGeneralFlow(query);
      return;
    }

    if (mode === Mode.AGENT && writingState === WritingState.FINISHED && content.trim()) {
      void handleAgentCopilotTurn(query);
    }
  }

  const handleAcceptPendingEdit = useCallback(() => {
    if (!pendingCopilotEdit) {
      return;
    }

    setIsApplyingPendingEdit(true);
    const nextContent = applyPendingEditToDocument(content, pendingCopilotEdit);
    if (!nextContent) {
      setPendingCopilotEdit(null);
      setIsApplyingPendingEdit(false);
      setMessages((prev) => [
        ...prev,
        {
          role: 'ai',
          content: '应用修改失败：文档内容已经变化，请重新描述这次修改需求。',
        },
      ]);
      return;
    }

    const nextTitle = extractFirstH1Title(nextContent);
    if (activeDocumentIdRef.current) {
      applyDocumentPatch(activeDocumentIdRef.current, {
        content: nextContent,
        ...(nextTitle ? { title: nextTitle } : {}),
        status: 'finished',
        errorMessage: undefined,
      });
    } else {
      setContent(nextContent);
      if (nextTitle) {
        setDocumentName(nextTitle);
      }
    }
    setPendingCopilotEdit(null);
    setIsApplyingPendingEdit(false);
    setMessages((prev) => [...prev, { role: 'ai', content: '已根据你的要求更新左侧文档。' }]);
  }, [content, pendingCopilotEdit, extractFirstH1Title, applyDocumentPatch]);

  const handleRejectPendingEdit = useCallback(() => {
    if (!pendingCopilotEdit) {
      return;
    }

    setPendingCopilotEdit(null);
    setMessages((prev) => [...prev, { role: 'ai', content: '这次修改已取消，你可以继续补充更精确的要求。' }]);
  }, [pendingCopilotEdit]);

  const handleOutlineConfirm = useCallback(
    async (confirmedOutline: string) => {
      if (!isValidTransition(mode, writingState, WritingState.GENERATING)) {
        return;
      }

      setOutline(confirmedOutline);
      setPendingCopilotEdit(null);
      setWritingState(WritingState.GENERATING);
      setIsGenerating(true);
      setMessages((prev) => [...prev, { role: 'user', content: '确认大纲，开始生成' }]);

      const outlineTitle = extractFirstH1Title(confirmedOutline);
      const initialDocumentTitle =
        outlineTitle || submittedPrompt.slice(0, 40) || '新文档_1';
      const documentId = createDocumentEntry({
        prompt: submittedPrompt,
        title: initialDocumentTitle,
        status: 'generating',
      });
      appendDocumentCardMessage(documentId);

      if (currentTaskIdRef.current) {
        saveCurrentTask();
      }

      const requestId = ++articleRequestSeqRef.current;
      const streamId = ++articleStreamRef.current;
      const thinkingRequestId = ++thinkingRequestSeqRef.current;
      let hasReceivedThought = false;
      setThinkingPhase('article');
      setThinkingStatus('streaming');
      setThinkingContent('');

      try {
        const generatedArticle = await streamArticleWithQwen({
          prompt: submittedPrompt,
          outline: confirmedOutline,
          knowledgeBaseIds: mountedKnowledgeBaseIds,
          onThoughtChunk: (_delta, accumulatedThought) => {
            if (thinkingRequestId !== thinkingRequestSeqRef.current) {
              return;
            }
            hasReceivedThought = true;
            setThinkingStatus('streaming');
            setThinkingContent(accumulatedThought);
          },
          onChunk: (_delta, accumulated) => {
            if (streamId !== articleStreamRef.current) {
              return;
            }

            if (thinkingRequestId === thinkingRequestSeqRef.current) {
              setThinkingStatus(hasReceivedThought ? 'done' : 'idle');
            }

            const streamedTitle = extractFirstH1Title(accumulated);
            applyDocumentPatch(documentId, {
              content: accumulated,
              ...(streamedTitle ? { title: streamedTitle } : {}),
            });
          },
        });

        if (requestId !== articleRequestSeqRef.current) {
          return;
        }

        if (thinkingRequestId === thinkingRequestSeqRef.current) {
          setThinkingStatus(hasReceivedThought ? 'done' : 'idle');
        }

        const finalTitle = extractFirstH1Title(generatedArticle);
        applyDocumentPatch(documentId, {
          content: generatedArticle,
          title: finalTitle || initialDocumentTitle,
          status: 'finished',
          errorMessage: undefined,
        });
        setIsGenerating(false);
        setWritingState(WritingState.FINISHED);
      } catch (error) {
        if (requestId !== articleRequestSeqRef.current) {
          return;
        }

        const messageText =
          error instanceof Error ? error.message : '全文生成失败，请稍后重试。';
        if (thinkingRequestId === thinkingRequestSeqRef.current) {
          setThinkingStatus('error');
          setThinkingContent((prev) => prev.trim() || messageText);
        }
        applyDocumentPatch(documentId, {
          status: 'error',
          errorMessage: messageText,
        });
        setWritingState(WritingState.OUTLINE_CONFIRM);
        setIsGenerating(false);
        setMessages((prev) => [...prev, { role: 'ai', content: `全文生成失败：${messageText}` }]);
      }
    },
    [
      mode,
      writingState,
      appendDocumentCardMessage,
      createDocumentEntry,
      extractFirstH1Title,
      saveCurrentTask,
      submittedPrompt,
      applyDocumentPatch,
      mountedKnowledgeBaseIds,
    ]
  );

  const handleModeToggle = useCallback(
    (newMode: Mode) => {
      setMode(newMode);
      setWritingState(WritingState.INPUT);
      setIsGenerating(false);
      setPendingCopilotEdit(null);
      setIsCopilotResponding(false);
      setIsApplyingPendingEdit(false);
      resetCopilotProgress();
      resetThinking();

      if (newMode === Mode.AGENT && scenarioData) {
        setAgentId(scenarioData.agentConfig.id);
      } else {
        setAgentId(undefined);
        setMemoryConfig({});
        setParamsConfig({});
        setCurrentScenarioId(undefined);
        setGeneralContentSource('api');
      }
    },
    [scenarioData, resetCopilotProgress, resetThinking]
  );

  useEffect(() => {
    return () => {
      clearCopilotProgressTimers();
    };
  }, [clearCopilotProgressTimers]);

  const handleMemoryConfigChange = useCallback((config: Record<string, any>) => {
    setMemoryConfig(config);
  }, []);

  const handleParamsConfigChange = useCallback((config: Record<string, any>) => {
    setParamsConfig(config);
  }, []);

  const buildAgentConfigSnapshot = useCallback((): AgentConfigSnapshot | null => {
    if (!scenarioData?.agentConfig) {
      return null;
    }

    const memoryItems = scenarioData.agentConfig.memoryConfigs.reduce<AgentConfigSnapshot['memoryItems']>(
      (items, config) => {
        const value = memoryConfig[config.key];
        if (typeof value === 'string') {
          if (!value.trim()) {
            return items;
          }
          items.push({
            key: config.key,
            label: config.label,
            value: value.trim(),
          });
          return items;
        }

        if (value !== undefined && value !== null) {
          items.push({
            key: config.key,
            label: config.label,
            value: String(value),
          });
        }

        return items;
      },
      []
    );

    const paramItems = scenarioData.agentConfig.paramConfigs.reduce<AgentConfigSnapshot['paramItems']>(
      (items, config) => {
        const value = paramsConfig[config.key];
        if (typeof value === 'string') {
          if (!value.trim()) {
            return items;
          }
          items.push({
            key: config.key,
            label: config.label,
            value: value.trim(),
            type: config.type,
          });
          return items;
        }

        if (value !== undefined && value !== null) {
          items.push({
            key: config.key,
            label: config.label,
            value: String(value),
            type: config.type,
          });
        }

        return items;
      },
      []
    );

    return {
      agentName: scenarioData.agentConfig.name,
      agentDescription: scenarioData.agentConfig.description,
      memoryItems,
      paramItems,
    };
  }, [memoryConfig, paramsConfig, scenarioData]);

  const startAgentDocumentGeneration = useCallback(
    ({
      promptText,
      appendConfigSnapshot,
    }: {
      promptText: string;
      appendConfigSnapshot: boolean;
    }) => {
      const trimmedPrompt = promptText.trim();
      if (!trimmedPrompt) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'ai',
            content: '当前智能体缺少可用问题，请先返回首页输入问题后再开始生成。',
          },
        ]);
        return;
      }

      if (scenarioData?.agentRuntime?.source !== 'appforge') {
        setMessages((prev) => [
          ...prev,
          {
            role: 'ai',
            content: '当前智能体已下线或尚未接入真实接口，无法继续生成。',
          },
        ]);
        return;
      }

      const initialDocumentTitle =
        trimmedPrompt.slice(0, 40) || scenarioData?.name || '新文档_1';
      const configSnapshot = buildAgentConfigSnapshot();
      const agentInputs = scenarioData.agentConfig.paramConfigs.reduce<Record<string, unknown>>(
        (acc, config) => {
          const value = paramsConfig[config.key];
          if (typeof value === 'string') {
            if (value.trim()) {
              acc[config.key] = value.trim();
            }
            return acc;
          }

          if (value !== undefined && value !== null) {
            acc[config.key] = value;
          }
          return acc;
        },
        {}
      );

      setInput('');
      setSubmittedPrompt(trimmedPrompt);
      setWritingState(WritingState.GENERATING);
      setIsGenerating(false);
      setPendingCopilotEdit(null);
      setThinkingPhase(null);
      setThinkingStatus('idle');
      setThinkingContent('');

      const documentId = createDocumentEntry({
        prompt: trimmedPrompt,
        title: initialDocumentTitle,
        status: 'generating',
      });
      appendDocumentCardMessage(documentId);

      if (appendConfigSnapshot) {
        if (configSnapshot && (configSnapshot.memoryItems.length > 0 || configSnapshot.paramItems.length > 0)) {
          setMessages((prev) => [
            ...prev,
            {
              role: 'user',
              content: '',
              variant: 'agent-config',
              configSnapshot,
            },
          ]);
        } else {
          setMessages((prev) => [...prev, { role: 'user', content: '开始生成' }]);
        }
      }

      const requestId = ++articleRequestSeqRef.current;

      void (async () => {
        try {
          const streamResult = await streamAgent({
            scenarioId: scenarioData.id,
            query: trimmedPrompt,
            inputs: agentInputs,
            onWorkflowMessage: (payload) => {
              if (requestId !== articleRequestSeqRef.current) {
                return;
              }

              setMessages((prev) =>
                appendMessage(prev, {
                  id: `${requestId}:${payload.id || `workflow-message-${Date.now()}-${prev.length}`}`,
                  role: 'ai',
                  content: payload.content || '',
                  variant: 'workflow-message',
                  title: payload.title,
                })
              );
            },
            onResult: (text) => {
              if (requestId !== articleRequestSeqRef.current) {
                return;
              }

              const streamedTitle = extractFirstH1Title(text);
              applyDocumentPatch(documentId, {
                content: text,
                ...(streamedTitle ? { title: streamedTitle } : {}),
              });
            },
          });

          if (requestId !== articleRequestSeqRef.current) {
            return;
          }

          if (!streamResult.result.trim()) {
            throw new Error('未获取到工作流结束节点内容。');
          }

          const finalTitle = extractFirstH1Title(streamResult.result);
          applyDocumentPatch(documentId, {
            content: streamResult.result,
            title: finalTitle || initialDocumentTitle,
            status: 'finished',
            errorMessage: undefined,
          });

          setThinkingPhase(null);
          setThinkingStatus('idle');
          setThinkingContent('');
          setIsGenerating(false);
          setWritingState(WritingState.FINISHED);
        } catch (error) {
          if (requestId !== articleRequestSeqRef.current) {
            return;
          }

          const messageText =
            error instanceof Error ? error.message : '全文生成失败，请稍后重试。';
          applyDocumentPatch(documentId, {
            status: 'error',
            errorMessage: messageText,
          });
          setThinkingPhase(null);
          setThinkingStatus('error');
          setThinkingContent(messageText);
          setIsGenerating(false);
          setWritingState(WritingState.INPUT);
          setMessages((prev) => [...prev, { role: 'ai', content: `全文生成失败：${messageText}` }]);
        }
      })();
    },
    [
      appendDocumentCardMessage,
      buildAgentConfigSnapshot,
      scenarioData,
      paramsConfig,
      extractFirstH1Title,
      createDocumentEntry,
      applyDocumentPatch,
    ]
  );

  const handleStartGenerate = useCallback(() => {
    const promptText = (submittedPrompt.trim() || scenarioData?.suggestedQuestion || '').trim();
    startAgentDocumentGeneration({
      promptText,
      appendConfigSnapshot: true,
    });
  }, [submittedPrompt, scenarioData, startAgentDocumentGeneration]);

  const handleDocumentNameChange = useCallback(
    (nextName: string) => {
      setDocumentName(nextName);
      if (activeDocumentIdRef.current) {
        applyDocumentPatch(activeDocumentIdRef.current, {
          title: nextName,
        });
      }
    },
    [applyDocumentPatch]
  );

  const handleSave = () => {
    console.log('保存文档:', { documentName, content });
  };

  const handleRewriteRequest = useCallback(
    async (selectedText: string, type: RewriteType, customPrompt?: string): Promise<string> => {
      const typeLabels: Record<RewriteType, string> = {
        continue: '续写',
        polish: '润色',
        expand: '扩写',
        custom: '自定义',
      };
      const prompt = type === 'custom' && customPrompt ? customPrompt : typeLabels[type];
      const message = `对选中内容「${selectedText.slice(0, 30)}${selectedText.length > 30 ? '...' : ''}」进行${prompt}`;
      setMessages((prev) => [...prev, { role: 'user', content: message }]);

      try {
        const result = await rewriteWithQwen({
          selectedText,
          type,
          customPrompt,
        });
        setMessages((prev) => [...prev, { role: 'ai', content: `已完成${prompt}。` }]);
        return result;
      } catch (error) {
        const messageText = error instanceof Error ? error.message : '改写失败，请稍后重试。';
        setMessages((prev) => [...prev, { role: 'ai', content: `改写失败：${messageText}` }]);
        throw error;
      }
    },
    []
  );

  const handleDownload = () => {
    console.log('导出文档:', { documentName, content });
  };

  const handleHistory = () => {
    console.log('查看历史编辑记录');
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <div className="h-14 bg-white border-b border-gray-200 flex items-center px-4">
        <button
          onClick={handleBack}
          className="p-2 hover:bg-gray-100 rounded transition-colors mr-4"
          title="返回首页"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>

        <div className="flex-1">
          <select className="text-sm font-medium text-gray-700 bg-transparent border-none focus:outline-none cursor-pointer">
            <option>{mode === Mode.GENERAL ? '通用写作智能体' : scenarioData?.agentConfig?.name || '通用写作智能体'}</option>
          </select>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-[2] relative flex flex-col">
          <div className="h-12 bg-white border-b border-gray-200 flex items-center px-4 gap-4">
            <div className="flex items-center gap-2 min-w-0" style={{ flex: '1 1 0%', maxWidth: 'none' }}>
              {isEditingName ? (
                <input
                  type="text"
                  value={documentName}
                  onChange={(e) => handleDocumentNameChange(e.target.value)}
                  onBlur={() => setIsEditingName(false)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setIsEditingName(false);
                    }
                  }}
                  className="px-2 py-1 border border-blue-500 rounded text-sm focus:outline-none min-w-0 flex-1"
                  autoFocus
                />
              ) : (
                <div className="flex items-center gap-2" style={{ minWidth: 0, flex: '1 1 0%', overflow: 'visible' }}>
                  <span className="text-sm font-medium text-gray-700" style={{ whiteSpace: 'nowrap', overflow: 'visible' }}>
                    {documentName}
                  </span>
                  <button
                    onClick={() => setIsEditingName(true)}
                    className="p-1 hover:bg-gray-100 rounded flex-shrink-0"
                    title="编辑文档名"
                  >
                    <Edit2 className="w-3 h-3 text-gray-400" />
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleHistory}
                className="p-2 hover:bg-gray-100 rounded transition-colors"
                title="历史编辑记录"
              >
                <Clock className="w-4 h-4 text-gray-600" />
              </button>
              <button
                onClick={handleSave}
                className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors"
              >
                保存
              </button>
              <button
                onClick={handleDownload}
                className="px-3 py-1.5 text-sm bg-blue-500 text-white hover:bg-blue-600 rounded transition-colors"
              >
                下载
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-hidden">
            <Editor
              content={content}
              writingState={writingState}
              onContentChange={(newContent) => {
                if (pendingCopilotEdit) {
                  setPendingCopilotEdit(null);
                }
                setContent(newContent);
                if (activeDocumentIdRef.current) {
                  applyDocumentPatch(activeDocumentIdRef.current, {
                    content: newContent,
                  });
                }
              }}
              onRewriteRequest={handleRewriteRequest}
            />
          </div>
        </div>

        <div className="flex-1 border-l border-gray-200">
          <CopilotSidebar
            mode={mode}
            writingState={writingState}
            input={input}
            initialPrompt={submittedPrompt}
            outline={outline}
            documentTitle={documentName}
            documents={documents}
            activeDocumentId={activeDocumentId}
            thinkingPhase={thinkingPhase}
            thinkingStatus={thinkingStatus}
            thinkingContent={thinkingContent}
            memoryConfig={memoryConfig}
            paramsConfig={paramsConfig}
            messages={messages}
            pendingEdit={pendingCopilotEdit}
            isApplyingPendingEdit={isApplyingPendingEdit || isCopilotResponding}
            isCopilotResponding={isCopilotResponding}
            copilotProgress={copilotProgress}
            onInputChange={setInput}
            onSend={handleSendQuery}
            onModeToggle={handleModeToggle}
            onOutlineConfirm={handleOutlineConfirm}
            onMemoryConfigChange={(config) => {
              setMemoryConfig(config);
              handleMemoryConfigChange(config);
            }}
            onParamsConfigChange={(config) => {
              setParamsConfig(config);
              handleParamsConfigChange(config);
            }}
            onStartGenerate={handleStartGenerate}
            onAcceptPendingEdit={handleAcceptPendingEdit}
            onRejectPendingEdit={handleRejectPendingEdit}
            onMessagesChange={setMessages}
            onConfirmAgentWrite={handleConfirmAgentWrite}
            onCancelAgentWrite={handleCancelAgentWrite}
            onDocumentSelect={selectDocument}
            onDocumentDelete={deleteDocument}
            mountedKnowledgeBaseIds={mountedKnowledgeBaseIds}
            onMountedKnowledgeBaseChange={onMountedKnowledgeBaseChange}
          />
        </div>
      </div>
    </div>
  );
};
