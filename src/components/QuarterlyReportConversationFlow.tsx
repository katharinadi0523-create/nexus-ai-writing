import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bot,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Database,
  FileText,
  FolderOpen,
  FolderSearch,
  ScanSearch,
  Sparkles,
  Workflow,
} from 'lucide-react';
import {
  buildQuarterlyReportKnowledgeHits,
  buildQuarterlyReportKnowledgeRetrieveRounds,
  buildQuarterlyReportLocalRetrieveRounds,
  buildQuarterlyReportFusionSummary,
  getQuarterlyReportMetricsEcho,
  getQuarterlyReportKnowledgeRetrieveSubtitle,
  getQuarterlyReportLocalRetrieveSubtitle,
  getQuarterlyReportParameterSummary,
  getQuarterlyReportPeriodEcho,
  getQuarterlyReportRichTextExecutionStepsForContext,
  quarterlyReportAnalysisCards,
  quarterlyReportResultTags,
  quarterlyReportRichTextOutputs,
  quarterlyReportTemplateCard,
} from '../constants/quarterly-report-flow-data';
import { getKnowledgeBasesByKeys } from '../constants/knowledgeBases';
import type { LocalWorkspaceSelection } from '../types/localWorkspace';
import type { QuarterlyReportSelectedAnswers } from '../types/quarterlyReportDemo';

interface QuarterlyReportConversationFlowProps {
  currentStep: number;
  autoPlay: boolean;
  selectedAnswers: QuarterlyReportSelectedAnswers;
  mountedKnowledgeBaseIds: string[];
  selectedLocalWorkspace: LocalWorkspaceSelection | null;
  onNextStep: () => void;
  onAnswerQuestion: (questionId: keyof QuarterlyReportSelectedAnswers, value: boolean) => void;
}

interface ConversationMessageProps {
  tone?: 'neutral' | 'status' | 'success';
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children?: React.ReactNode;
  action?: React.ReactNode;
  compact?: boolean;
}

export const ConversationMessage: React.FC<ConversationMessageProps> = ({
  tone = 'neutral',
  title,
  subtitle,
  icon,
  children,
  action,
  compact = false,
}) => {
  const toneClassName =
    tone === 'status'
      ? 'border-sky-200 bg-sky-50/90'
      : tone === 'success'
        ? 'border-emerald-200 bg-emerald-50/90'
        : 'border-slate-200 bg-white';

  const iconClassName =
    tone === 'status'
      ? 'bg-sky-100 text-sky-700'
      : tone === 'success'
        ? 'bg-emerald-100 text-emerald-700'
        : 'bg-slate-100 text-slate-600';

  return (
    <div className={`${compact ? 'rounded-[20px] p-3.5 shadow-none' : 'rounded-[22px] p-4 shadow-sm'} border ${toneClassName}`}>
      <div className="flex items-start gap-3">
        <div
          className={`flex flex-shrink-0 items-center justify-center ${compact ? 'h-9 w-9 rounded-xl' : 'h-10 w-10 rounded-2xl'} ${iconClassName}`}
        >
          {icon || <Bot className="h-5 w-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className={`${compact ? 'text-[13px]' : 'text-sm'} font-semibold text-slate-900`}>{title}</div>
          {subtitle ? (
            <div className={`${compact ? 'mt-1 text-[13px]' : 'mt-1 text-sm'} leading-6 text-slate-500`}>
              {subtitle}
            </div>
          ) : null}
          {children ? <div className={compact ? 'mt-2.5' : 'mt-3'}>{children}</div> : null}
          {action ? <div className={compact ? 'mt-3 flex justify-end' : 'mt-4 flex justify-end'}>{action}</div> : null}
        </div>
      </div>
    </div>
  );
};

const StepButton: React.FC<{
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}> = ({ onClick, disabled = false, children }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
      disabled
        ? 'cursor-not-allowed bg-slate-100 text-slate-300'
        : 'bg-slate-900 text-white hover:bg-slate-800'
    }`}
  >
    {children}
    <ChevronRight className="h-4 w-4" />
  </button>
);

const CodePanel: React.FC<{
  label: string;
  payload: unknown;
  tone: 'input' | 'output';
}> = ({ label, payload, tone }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const themeClassName =
    tone === 'input'
      ? 'border-sky-200 bg-sky-50/90'
      : 'border-emerald-200 bg-emerald-50/90';
  const badgeClassName =
    tone === 'input'
      ? 'bg-sky-100 text-sky-700'
      : 'bg-emerald-100 text-emerald-700';
  const iconClassName =
    tone === 'input'
      ? 'text-sky-500'
      : 'text-emerald-500';

  return (
    <div className={`rounded-2xl border ${themeClassName}`}>
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left"
      >
        <div className="flex items-center gap-3">
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-[0.08em] ${badgeClassName}`}>
            {label}
          </span>
          <span className="text-[12px] text-slate-500">
            {isExpanded ? '点击收起明细' : '点击展开明细'}
          </span>
        </div>
        <ChevronDown
          className={`h-4 w-4 transition-transform ${iconClassName} ${isExpanded ? 'rotate-180' : ''}`}
        />
      </button>

      {isExpanded ? (
        <div className="border-t border-white/70 px-3 py-3">
          <pre className="whitespace-pre-wrap break-words rounded-xl bg-white/90 p-3 font-mono text-[11px] leading-5 text-slate-700 shadow-sm">
            {JSON.stringify(payload, null, 2)}
          </pre>
        </div>
      ) : null}
    </div>
  );
};

const RetrievalMiniStep: React.FC<{
  title: string;
  objective: string;
  hitCount: number;
  queryInput: unknown;
  output: unknown;
}> = ({ title, objective, hitCount, queryInput, output }) => {
  return (
    <div className="rounded-[20px] border border-slate-200 bg-white/90 p-3.5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[13px] font-semibold text-slate-900">{title}</div>
          <div className="mt-1 text-[12px] leading-5 text-slate-500">{objective}</div>
        </div>
        <div className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-medium text-slate-500">
          {hitCount} 个命中
        </div>
      </div>

      <div className="mt-3 space-y-2">
        <CodePanel label="input arguments" payload={queryInput} tone="input" />
        <CodePanel label="output" payload={output} tone="output" />
      </div>
    </div>
  );
};

const StepSection: React.FC<{
  stepNumber: number;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}> = ({ stepNumber, title, subtitle, icon, action, children }) => (
  <div className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex items-start gap-3">
      <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">
          Step {stepNumber}
        </div>
        <div className="mt-1 text-[18px] font-semibold leading-tight text-slate-900 md:text-[20px]">
          {title}
        </div>
        <div className="mt-2 text-sm leading-6 text-slate-500">{subtitle}</div>
        {action ? <div className="mt-4 flex justify-end">{action}</div> : null}
      </div>
    </div>

    <div className="mt-5 ml-3 pl-1">
      <div className="space-y-3">{children}</div>
    </div>
  </div>
);

export const ChoiceQuestionCard: React.FC<{
  title: string;
  question: string;
  selectedValue: boolean | null;
  onChoose: (value: boolean) => void;
  autoPlay: boolean;
  selectedLabel: string;
  responseText: string;
  summaryText?: string;
  compact?: boolean;
}> = ({
  title,
  question,
  selectedValue,
  onChoose,
  autoPlay,
  selectedLabel,
  responseText,
  summaryText,
  compact = false,
}) => {
  return (
    <div className="space-y-3">
      <ConversationMessage
        title={title}
        subtitle={question}
        icon={<Bot className="h-5 w-5" />}
        compact={compact}
      >
        <div className="flex flex-wrap gap-2">
          {[
            { label: '是', value: true },
            { label: '否', value: false },
          ].map((option) => (
            <button
              key={option.label}
              type="button"
              onClick={() => onChoose(option.value)}
              className={`rounded-full border ${compact ? 'px-3.5 py-1.5 text-[13px]' : 'px-4 py-2 text-sm'} font-medium transition-colors ${
                selectedValue === option.value
                  ? 'border-blue-500 bg-blue-500 text-white'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-800'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </ConversationMessage>

      {selectedValue !== null ? (
        <div className="flex justify-end">
          <div
            className={`rounded-2xl border border-blue-200 bg-blue-500/95 ${
              compact ? 'px-3.5 py-2 text-[13px]' : 'px-4 py-3 text-sm'
            } font-medium text-white shadow-sm shadow-blue-100/80`}
          >
            {selectedLabel}
          </div>
        </div>
      ) : null}

      {selectedValue !== null ? (
        <ConversationMessage
          title={responseText}
          icon={<CheckCircle2 className="h-5 w-5" />}
          tone="success"
          compact={compact}
        >
          {summaryText ? <div className={`${compact ? 'text-[13px]' : 'text-sm'} leading-6 text-emerald-900`}>{summaryText}</div> : null}
        </ConversationMessage>
      ) : null}
    </div>
  );
};

export const AnalysisResultCards: React.FC<{
  compact?: boolean;
}> = ({ compact = false }) => {
  return (
    <div className={`${compact ? 'rounded-[20px] border-slate-100 bg-slate-50/80 p-4' : 'rounded-[22px] border-slate-200 bg-white p-5 shadow-sm'} border`}>
      <div className={`${compact ? 'text-[10px]' : 'text-xs'} font-medium uppercase tracking-[0.18em] text-slate-400`}>
        分析结果
      </div>
      <div className="mt-3 space-y-3">
        {quarterlyReportAnalysisCards.slice(0, 4).map((card, index) => (
          <div key={card.title} className="rounded-2xl bg-white px-4 py-3">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 text-sm font-semibold text-slate-400">
                {index + 1}.
              </div>
              <div className="min-w-0 flex-1">
                <div className={`${compact ? 'text-[13px]' : 'text-sm'} font-semibold text-slate-900`}>
                  {card.title}
                </div>
                <div className={`mt-1 ${compact ? 'text-[13px]' : 'text-sm'} leading-6 text-slate-500`}>
                  {card.value}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const KnowledgeRetrieveCard: React.FC<{
  mountedKnowledgeBaseIds: string[];
  compact?: boolean;
  animateSteps?: boolean;
}> = ({ mountedKnowledgeBaseIds, compact = false, animateSteps = false }) => {
  const mountedKnowledgeBases = useMemo(
    () => getKnowledgeBasesByKeys(mountedKnowledgeBaseIds),
    [mountedKnowledgeBaseIds]
  );
  const knowledgeRetrieveRounds = useMemo(
    () => buildQuarterlyReportKnowledgeRetrieveRounds(mountedKnowledgeBases),
    [mountedKnowledgeBases]
  );
  const knowledgeHitItems = useMemo(
    () => buildQuarterlyReportKnowledgeHits(mountedKnowledgeBases),
    [mountedKnowledgeBases]
  );
  const knowledgeBaseNames = knowledgeHitItems.map((item) => item.title);
  const [visibleRoundCount, setVisibleRoundCount] = useState(knowledgeRetrieveRounds.length);

  useEffect(() => {
    if (!animateSteps) {
      setVisibleRoundCount(knowledgeRetrieveRounds.length);
      return;
    }

    setVisibleRoundCount(Math.min(1, knowledgeRetrieveRounds.length));

    const timerIds = knowledgeRetrieveRounds.slice(1).map((_, index) =>
      window.setTimeout(() => {
        setVisibleRoundCount(index + 2);
      }, (index + 1) * 900)
    );

    return () => {
      timerIds.forEach((timerId) => window.clearTimeout(timerId));
    };
  }, [animateSteps, knowledgeRetrieveRounds]);

  return (
    <div className={`${compact ? 'rounded-[22px] border-slate-100 bg-slate-50/80 p-4 shadow-none' : 'rounded-[24px] border-slate-200 bg-white p-5 shadow-sm'} border`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className={`${compact ? 'text-[10px]' : 'text-xs'} font-medium uppercase tracking-[0.18em] text-slate-400`}>
            知识库深度检索中
          </div>
          <div className={`mt-2 ${compact ? 'text-sm' : 'text-base'} font-semibold text-slate-900`}>
            正在检索已挂载知识库，补齐结构规划、数据口径与案例依据
          </div>
        </div>
        <div className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600">
          {knowledgeHitItems.length} 个知识库
        </div>
      </div>

      <div className="mt-4 rounded-[20px] bg-slate-950 px-4 py-4 shadow-sm">
        <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-emerald-300">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          正在检索
        </div>
        <pre className="mt-3 whitespace-pre-wrap break-words font-mono text-[12px] leading-6 text-slate-200">
          {JSON.stringify(
            {
              knowledge_bases: knowledgeBaseNames,
              retrieval_goal: '为季度工作汇报生成提供结构、口径、案例与风险表达依据',
            },
            null,
            2
          )}
        </pre>
      </div>

      <div className="mt-4 space-y-4">
        {knowledgeRetrieveRounds.slice(0, visibleRoundCount).map((round) => (
          <RetrievalMiniStep
            key={round.title}
            title={round.title}
            objective={round.objective}
            hitCount={round.output.hitCount}
            queryInput={round.queryInput}
            output={round.output}
          />
        ))}

        {animateSteps && visibleRoundCount < knowledgeRetrieveRounds.length ? (
          <div className="rounded-[18px] border border-dashed border-slate-200 bg-white/70 px-4 py-4">
            <div className="flex items-center gap-2 text-[13px] text-slate-500">
              <span className="h-2 w-2 rounded-full bg-sky-400 animate-pulse" />
              正在继续检索下一组相关内容
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export const LocalWorkspaceRetrieveCard: React.FC<{
  selectedLocalWorkspace: LocalWorkspaceSelection | null;
  compact?: boolean;
  animateSteps?: boolean;
}> = ({ selectedLocalWorkspace, compact = false, animateSteps = false }) => {
  const localRetrieveRounds = useMemo(
    () => buildQuarterlyReportLocalRetrieveRounds(selectedLocalWorkspace),
    [selectedLocalWorkspace]
  );
  const [visibleRoundCount, setVisibleRoundCount] = useState(localRetrieveRounds.length);

  useEffect(() => {
    if (!animateSteps) {
      setVisibleRoundCount(localRetrieveRounds.length);
      return;
    }

    setVisibleRoundCount(Math.min(1, localRetrieveRounds.length));

    const timerIds = localRetrieveRounds.slice(1).map((_, index) =>
      window.setTimeout(() => {
        setVisibleRoundCount(index + 2);
      }, (index + 1) * 900)
    );

    return () => {
      timerIds.forEach((timerId) => window.clearTimeout(timerId));
    };
  }, [animateSteps, localRetrieveRounds]);

  return (
    <div className={`${compact ? 'rounded-[22px] border-slate-100 bg-slate-50/80 p-4 shadow-none' : 'rounded-[24px] border-slate-200 bg-white p-5 shadow-sm'} border`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className={`${compact ? 'text-[10px]' : 'text-xs'} font-medium uppercase tracking-[0.18em] text-slate-400`}>
            本地工作空间检索中
          </div>
          <div className={`mt-2 ${compact ? 'text-sm' : 'text-base'} font-semibold text-slate-900`}>
            正在从本地工作空间中提取项目进展、版本发布和风险复盘材料
          </div>
        </div>
        <div className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600">
          {selectedLocalWorkspace?.fileCount || 5} 个文件
        </div>
      </div>

      <div className="mt-4 space-y-4">
        {localRetrieveRounds.slice(0, visibleRoundCount).map((round) => (
          <RetrievalMiniStep
            key={round.title}
            title={round.title}
            objective={round.objective}
            hitCount={round.output.hitCount}
            queryInput={round.queryInput}
            output={round.output}
          />
        ))}

        {animateSteps && visibleRoundCount < localRetrieveRounds.length ? (
          <div className="rounded-[18px] border border-dashed border-slate-200 bg-white/70 px-4 py-4">
            <div className="flex items-center gap-2 text-[13px] text-slate-500">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              正在继续检索下一组本地材料
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export const FusionAnalysisCard: React.FC<{
  mountedKnowledgeBaseIds: string[];
  selectedLocalWorkspace: LocalWorkspaceSelection | null;
  compact?: boolean;
}> = ({ mountedKnowledgeBaseIds, selectedLocalWorkspace, compact = false }) => {
  const mountedKnowledgeBases = useMemo(
    () => getKnowledgeBasesByKeys(mountedKnowledgeBaseIds),
    [mountedKnowledgeBaseIds]
  );
  const fusionSummary = useMemo(
    () => buildQuarterlyReportFusionSummary(mountedKnowledgeBases, selectedLocalWorkspace),
    [mountedKnowledgeBases, selectedLocalWorkspace]
  );

  return (
    <div className={`${compact ? 'rounded-[22px] border-slate-100 bg-slate-50/80 p-4 shadow-none' : 'rounded-[24px] border-slate-200 bg-white p-5 shadow-sm'} border`}>
      <div className={`${compact ? 'text-[10px]' : 'text-xs'} font-medium uppercase tracking-[0.18em] text-slate-400`}>
        融合分析
      </div>
      <div className={`mt-2 ${compact ? 'text-sm' : 'text-base'} font-semibold text-slate-900`}>
        {fusionSummary.summary}
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-3">
        <div className="rounded-2xl bg-white px-4 py-4">
          <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">输入来源</div>
          <div className="mt-3 space-y-2">
            {fusionSummary.sources.map((item) => (
              <div key={item} className="text-[13px] leading-6 text-slate-600">
                {item}
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl bg-white px-4 py-4">
          <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">分析动作</div>
          <div className="mt-3 space-y-2">
            {fusionSummary.actions.map((item) => (
              <div key={item} className="text-[13px] leading-6 text-slate-600">
                {item}
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl bg-white px-4 py-4">
          <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">分析产出</div>
          <div className="mt-3 space-y-2">
            {fusionSummary.outputs.map((item) => (
              <div key={item} className="text-[13px] leading-6 text-slate-600">
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export const RichTextGenerationCard: React.FC<{
  mountedKnowledgeBaseIds: string[];
  selectedLocalWorkspace: LocalWorkspaceSelection | null;
  compact?: boolean;
}> = ({ mountedKnowledgeBaseIds, selectedLocalWorkspace, compact = false }) => {
  const mountedKnowledgeBases = useMemo(
    () => getKnowledgeBasesByKeys(mountedKnowledgeBaseIds),
    [mountedKnowledgeBaseIds]
  );
  const executionSteps = useMemo(
    () => getQuarterlyReportRichTextExecutionStepsForContext(mountedKnowledgeBases, selectedLocalWorkspace),
    [mountedKnowledgeBases, selectedLocalWorkspace]
  );

  return (
    <div className={`${compact ? 'rounded-[22px] border-slate-100 bg-slate-50/80 p-4 shadow-none' : 'rounded-[24px] border-slate-200 bg-white p-5 shadow-sm'} border`}>
      <div className={`${compact ? 'text-[10px]' : 'text-xs'} font-medium uppercase tracking-[0.18em] text-slate-400`}>执行链路</div>
      <div className="mt-4 space-y-3">
        {executionSteps.map((item) => (
          <div key={item} className="flex items-start gap-3 rounded-2xl bg-white px-4 py-3">
            <div className="mt-0.5 h-2.5 w-2.5 flex-shrink-0 rounded-full bg-slate-900" />
            <div className={`${compact ? 'text-[13px]' : 'text-sm'} leading-6 text-slate-700`}>{item}</div>
          </div>
        ))}
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white/80 px-4 py-4">
          <div className="grid gap-2 md:grid-cols-2">
            {quarterlyReportRichTextOutputs.map((item) => (
              <div key={item} className={`rounded-xl bg-white px-3 py-2 ${compact ? 'text-[13px]' : 'text-sm'} font-medium text-slate-600 shadow-sm`}>
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export const QuarterlyReportConversationFlow: React.FC<QuarterlyReportConversationFlowProps> = ({
  currentStep,
  autoPlay,
  selectedAnswers,
  mountedKnowledgeBaseIds,
  selectedLocalWorkspace,
  onNextStep,
  onAnswerQuestion,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isRoadmapExpanded, setIsRoadmapExpanded] = useState(false);
  const mountedKnowledgeBases = useMemo(
    () => getKnowledgeBasesByKeys(mountedKnowledgeBaseIds),
    [mountedKnowledgeBaseIds]
  );
  const stepLabels = useMemo(
    () => [
      '模板确认',
      '参数确认',
      '经营分析工作流',
      '知识库深度检索',
      '本地检索',
      '融合分析',
      '模板富文本生成',
    ],
    []
  );
  const roadmapVisible = currentStep >= 3;
  const activeRoadmapStep = roadmapVisible ? Math.min(Math.max(currentStep - 2, 1), stepLabels.length) : 0;
  const clarificationCompleted =
    selectedAnswers.reportingPeriod !== null && selectedAnswers.includeMetrics !== null;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    container.scrollTo({
      top: container.scrollHeight,
      behavior: 'smooth',
    });
  }, [currentStep, selectedAnswers.includeMetrics, selectedAnswers.reportingPeriod]);

  useEffect(() => {
    if (!roadmapVisible) {
      setIsRoadmapExpanded(false);
    }
  }, [roadmapVisible]);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-200 bg-[linear-gradient(135deg,rgba(248,250,252,0.98),rgba(255,250,245,0.9))] px-4 py-4">
        <div>
          {roadmapVisible ? (
            <>
              <div className="text-lg font-semibold text-slate-900">产品组季度工作汇报</div>
              <div className="mt-1 text-sm text-slate-500">
                系统将结合模板、经营数据与知识依据，逐步完成正式材料初稿生成。
              </div>
            </>
          ) : (
            <>
              <div className="text-lg font-semibold text-slate-900">
                {currentStep === 1 ? '正在分析用户意图' : '正在规划任务步骤'}
              </div>
              <div className="mt-1 text-sm text-slate-500">
                {currentStep === 1
                  ? '正在识别任务类型、输出目标与材料要求。'
                  : '正在梳理后续步骤，准备生成正式汇报内容。'}
              </div>
            </>
          )}
        </div>
        {roadmapVisible ? (
          <div className="mt-3 rounded-2xl border border-slate-200 bg-white/88 px-3 py-3 shadow-sm backdrop-blur-sm">
            <button
              type="button"
              onClick={() => setIsRoadmapExpanded((prev) => !prev)}
              className="flex w-full items-center justify-between gap-3 text-left"
            >
              <div className="min-w-0">
                <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-slate-400">
                  执行步骤
                </div>
                <div className="mt-1 text-[13px] font-medium text-slate-700">
                  当前步骤：Step {activeRoadmapStep} · {stepLabels[activeRoadmapStep - 1]}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400">
                  {isRoadmapExpanded ? '收起' : '展开'}
                </span>
                <ChevronDown
                  className={`h-4 w-4 text-slate-400 transition-transform ${
                    isRoadmapExpanded ? 'rotate-180' : ''
                  }`}
                />
              </div>
            </button>

            {isRoadmapExpanded ? (
              <div className="mt-3 space-y-2">
                {stepLabels.map((label, index) => {
                  const stepNumber = index + 1;
                  const isDone = activeRoadmapStep > stepNumber;
                  const isActive = activeRoadmapStep === stepNumber;

                  return (
                    <div
                      key={label}
                      className={`flex items-center gap-3 rounded-xl border px-3 py-2 ${
                        isActive
                          ? 'border-blue-200 bg-blue-50/85'
                          : isDone
                            ? 'border-emerald-200 bg-emerald-50/80'
                            : 'border-slate-200 bg-slate-50/70'
                      }`}
                    >
                      <div
                        className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                          isActive
                            ? 'bg-blue-100 text-blue-700'
                            : isDone
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-white text-slate-400'
                        }`}
                      >
                        {stepNumber}
                      </div>
                      <div
                        className={`min-w-0 text-[12px] font-medium ${
                          isActive
                            ? 'text-blue-700'
                            : isDone
                              ? 'text-emerald-700'
                              : 'text-slate-500'
                        }`}
                      >
                        {label}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div ref={containerRef} className="flex-1 overflow-y-auto bg-slate-50/80 px-4 pb-12 pt-4">
        <div className="space-y-4">
          <ConversationMessage
            tone="status"
            title="正在分析用户意图"
            subtitle="已识别到用户希望基于固定模板生成一份符合公司规范的季度正式汇报材料。"
            icon={<ScanSearch className="h-5 w-5" />}
            action={currentStep === 1 && !autoPlay ? <StepButton onClick={onNextStep}>继续</StepButton> : undefined}
          />

          {currentStep >= 2 ? (
            <ConversationMessage
              tone="status"
              title="正在规划任务步骤"
              subtitle="已确定本次流程将依次完成模板确认、参数确认、经营分析、知识库深度检索、本地检索、融合分析与模板富文本成稿。"
              icon={<Workflow className="h-5 w-5" />}
              action={currentStep === 2 && !autoPlay ? <StepButton onClick={onNextStep}>开始执行</StepButton> : undefined}
            />
          ) : null}

          {currentStep >= 3 ? (
            <StepSection
              stepNumber={1}
              title="模板确认"
              subtitle="已识别写作任务：季度正式汇报"
              icon={<Sparkles className="h-5 w-5" />}
              action={currentStep === 3 && !autoPlay ? <StepButton onClick={onNextStep}>下一步</StepButton> : undefined}
            >
              <div className="rounded-[20px] border border-slate-100 bg-slate-50/80 px-4 py-4">
                <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">模板已加载</div>
                <div className="mt-2 space-y-1 text-[13px] leading-6 text-slate-500">
                  <div>已选择模板：产品组季度工作汇报</div>
                  <div>将按照模板结构、版式要求和企业规范生成内容</div>
                </div>
              </div>

              <div className="rounded-[20px] border border-slate-100 bg-slate-50/80 p-4">
                <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-slate-400">模板说明</div>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl bg-white px-4 py-3">
                    <div className="text-[11px] text-slate-400">模板名称</div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">{quarterlyReportTemplateCard.name}</div>
                  </div>
                  <div className="rounded-2xl bg-white px-4 py-3">
                    <div className="text-[11px] text-slate-400">适用场景</div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">{quarterlyReportTemplateCard.scenario}</div>
                  </div>
                  <div className="rounded-2xl bg-white px-4 py-3">
                    <div className="text-[11px] text-slate-400">输出形式</div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">{quarterlyReportTemplateCard.output}</div>
                  </div>
                  <div className="rounded-2xl bg-white px-4 py-3">
                    <div className="text-[11px] text-slate-400">能力支持</div>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {quarterlyReportTemplateCard.capabilities.map((item) => (
                        <span key={item} className="rounded-full bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600 shadow-sm">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </StepSection>
          ) : null}

          {currentStep >= 4 ? (
            <StepSection
              stepNumber={2}
              title="参数确认"
              subtitle="在进入正式生成前，请先确认本次汇报的关键参数。"
              icon={<Bot className="h-5 w-5" />}
              action={
                currentStep === 4 && !autoPlay ? (
                  <StepButton onClick={onNextStep} disabled={!clarificationCompleted}>
                    下一步
                  </StepButton>
                ) : undefined
              }
            >
              <div className="rounded-[20px] border border-slate-100 bg-slate-50/80 px-4 py-3 text-[13px] leading-6 text-slate-500">
                请确认汇报周期和数据范围，系统会按你的选择组织后续内容。
              </div>

              <ChoiceQuestionCard
                title="请确认汇报周期"
                question="是否按 2026 年 Q1 作为本次汇报周期？"
                selectedValue={selectedAnswers.reportingPeriod}
                onChoose={(value) => onAnswerQuestion('reportingPeriod', value)}
                autoPlay={autoPlay}
                selectedLabel={selectedAnswers.reportingPeriod === false ? '否' : '是'}
                responseText={getQuarterlyReportPeriodEcho(selectedAnswers.reportingPeriod)}
                compact
              />

              {selectedAnswers.reportingPeriod !== null ? (
                <ChoiceQuestionCard
                  title="请确认数据范围"
                  question="是否纳入经营数据分析结果？"
                  selectedValue={selectedAnswers.includeMetrics}
                  onChoose={(value) => onAnswerQuestion('includeMetrics', value)}
                  autoPlay={autoPlay}
                  selectedLabel={selectedAnswers.includeMetrics === false ? '否' : '是'}
                  responseText={getQuarterlyReportMetricsEcho(selectedAnswers.includeMetrics)}
                  summaryText={
                    clarificationCompleted
                      ? getQuarterlyReportParameterSummary(selectedAnswers)
                      : undefined
                  }
                  compact
                />
              ) : null}
            </StepSection>
          ) : null}

          {currentStep >= 5 ? (
            <StepSection
              stepNumber={3}
              title="经营分析工作流"
              subtitle="正在执行产品经营分析数据洞察工作流。"
              icon={<Database className="h-5 w-5" />}
              action={currentStep === 5 && !autoPlay ? <StepButton onClick={onNextStep}>下一步</StepButton> : undefined}
            >
              <AnalysisResultCards compact />
            </StepSection>
          ) : null}

          {currentStep >= 6 ? (
            <StepSection
              stepNumber={4}
              title="知识库深度检索"
              subtitle={getQuarterlyReportKnowledgeRetrieveSubtitle(mountedKnowledgeBases)}
              icon={<FolderSearch className="h-5 w-5" />}
              action={currentStep === 6 && !autoPlay ? <StepButton onClick={onNextStep}>下一步</StepButton> : undefined}
            >
              <KnowledgeRetrieveCard
                mountedKnowledgeBaseIds={mountedKnowledgeBaseIds}
                compact
                animateSteps={currentStep === 6}
              />
              <ConversationMessage
                title="知识依据提取完成"
                subtitle="已提取可用于“结构规划、表述约束、章节写法”的知识依据。"
                icon={<CheckCircle2 className="h-5 w-5" />}
                tone="success"
                compact
              />
            </StepSection>
          ) : null}

          {currentStep >= 7 ? (
            <StepSection
              stepNumber={5}
              title="本地检索"
              subtitle={getQuarterlyReportLocalRetrieveSubtitle(selectedLocalWorkspace)}
              icon={<FolderOpen className="h-5 w-5" />}
              action={currentStep === 7 && !autoPlay ? <StepButton onClick={onNextStep}>下一步</StepButton> : undefined}
            >
              <LocalWorkspaceRetrieveCard
                selectedLocalWorkspace={selectedLocalWorkspace}
                compact
                animateSteps={currentStep === 7}
              />
              <ConversationMessage
                title="本地材料提取完成"
                subtitle="已提取可用于项目进展、版本发布和风险说明的本地事实。"
                icon={<CheckCircle2 className="h-5 w-5" />}
                tone="success"
                compact
              />
            </StepSection>
          ) : null}

          {currentStep >= 8 ? (
            <StepSection
              stepNumber={6}
              title="融合分析"
              subtitle="正在融合经营分析结果、知识依据与本地工作空间材料。"
              icon={<Workflow className="h-5 w-5" />}
              action={currentStep === 8 && !autoPlay ? <StepButton onClick={onNextStep}>下一步</StepButton> : undefined}
            >
              <FusionAnalysisCard
                mountedKnowledgeBaseIds={mountedKnowledgeBaseIds}
                selectedLocalWorkspace={selectedLocalWorkspace}
                compact
              />
            </StepSection>
          ) : null}

          {currentStep >= 9 ? (
            <StepSection
              stepNumber={7}
              title="模板富文本生成"
              subtitle="正在结合模板、经营分析结果、知识依据与本地材料生成正式初稿。"
              icon={<FileText className="h-5 w-5" />}
            >
              <RichTextGenerationCard
                mountedKnowledgeBaseIds={mountedKnowledgeBaseIds}
                selectedLocalWorkspace={selectedLocalWorkspace}
                compact
              />
              <ConversationMessage
                tone="success"
                title="已完成《产品组 2026 年 Q1 季度工作汇报》初稿生成"
                subtitle="已完成正式材料初稿生成，可继续查看正文结构与内容。"
                icon={<CheckCircle2 className="h-5 w-5" />}
                compact
              >
                <div className="flex flex-wrap gap-2">
                  {quarterlyReportResultTags.map((item) => (
                    <span
                      key={item}
                      className="rounded-full bg-white px-3 py-1 text-xs font-medium text-emerald-700 shadow-sm"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </ConversationMessage>
            </StepSection>
          ) : null}
        </div>
      </div>
    </div>
  );
};
