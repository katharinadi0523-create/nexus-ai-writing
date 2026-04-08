import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Mode } from '../types/writing';
import { scenarioStore, setActiveScenarioId, ScenarioId } from '../constants/scenarioData';
import { InputArea } from '../components/InputArea';
import { KnowledgeBaseSelector } from '../components/KnowledgeBaseSelector';
import { MemoryModal } from '../components/MemoryModal';
import { ParamsModal } from '../components/ParamsModal';
import { WritingTemplateModal } from '../components/WritingTemplateModal';
import { Star } from 'lucide-react';
import { getScenarioIcon } from '../utils/scenarioVisuals';
import { useIterationMode } from '../contexts/IterationModeContext';
import { getWritingTemplateById } from '../constants/writingTemplates';
import type { LocalWorkspaceSelection } from '../types/localWorkspace';
import {
  createLocalWorkspaceSelectionFromFiles,
  isValidLocalWorkspaceSelection,
} from '../utils/localWorkspace';

const FAVORITE_AGENTS_STORAGE_KEY = 'favoriteAgentIds';
const FAVORITE_TEMPLATES_STORAGE_KEY = 'favoriteWritingTemplateIds';
const SELECTED_TEMPLATE_STORAGE_KEY = 'selectedWritingTemplateId';
const SELECTED_LOCAL_WORKSPACE_STORAGE_KEY = 'selectedLocalWorkspace';
const AGENTS_PER_PAGE = 6;

interface HomeViewProps {
  onStartWriting: (
    input: string,
    mode: Mode,
    scenarioId?: ScenarioId,
    selectedTemplateId?: string,
    selectedLocalWorkspace?: LocalWorkspaceSelection
  ) => void;
  selectedScenarioId?: ScenarioId;
  onScenarioSelect?: (scenarioId: ScenarioId | null) => void;
  mountedKnowledgeBaseIds: string[];
  onMountedKnowledgeBaseChange: (ids: string[]) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  onStartWriting,
  selectedScenarioId,
  onScenarioSelect,
  mountedKnowledgeBaseIds,
  onMountedKnowledgeBaseChange,
}) => {
  const { isIterationMode } = useIterationMode();
  const [input, setInput] = useState<string>('');
  const [stepGenerationEnabled, setStepGenerationEnabled] = useState<boolean>(true); // 默认开启
  const [selectedAgentId, setSelectedAgentId] = useState<ScenarioId | null>(selectedScenarioId || null);
  const [isKnowledgeBaseOpen, setIsKnowledgeBaseOpen] = useState<boolean>(false);
  const [isMemoryModalOpen, setIsMemoryModalOpen] = useState<boolean>(false);
  const [isParamsModalOpen, setIsParamsModalOpen] = useState<boolean>(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState<boolean>(false);
  const [isReadingWorkspace, setIsReadingWorkspace] = useState<boolean>(false);
  const [activeAgentTab, setActiveAgentTab] = useState<'organization' | 'favorite'>('organization');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const workspacePickerRef = useRef<HTMLInputElement | null>(null);
  const [favoriteAgentIds, setFavoriteAgentIds] = useState<ScenarioId[]>(() => {
    if (typeof window === 'undefined') {
      return Object.values(scenarioStore)
        .filter((scenario) => scenario.isFavorite)
        .map((scenario) => scenario.id);
    }

    try {
      const saved = window.localStorage.getItem(FAVORITE_AGENTS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed as ScenarioId[];
        }
      }
    } catch (error) {
      console.error('读取收藏智能体失败:', error);
    }

    return Object.values(scenarioStore)
      .filter((scenario) => scenario.isFavorite)
      .map((scenario) => scenario.id);
  });
  const [favoriteTemplateIds, setFavoriteTemplateIds] = useState<string[]>(() => {
    if (typeof window === 'undefined') {
      return [];
    }

    try {
      const saved = window.localStorage.getItem(FAVORITE_TEMPLATES_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((item): item is string => typeof item === 'string');
        }
      }
    } catch (error) {
      console.error('读取收藏模板失败:', error);
    }

    return [];
  });
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(() => {
    if (typeof window === 'undefined') {
      return null;
    }

    try {
      const saved = window.localStorage.getItem(SELECTED_TEMPLATE_STORAGE_KEY);
      if (saved && getWritingTemplateById(saved)) {
        return saved;
      }
    } catch (error) {
      console.error('读取已选模板失败:', error);
    }

    return null;
  });
  const [selectedLocalWorkspace, setSelectedLocalWorkspace] = useState<LocalWorkspaceSelection | null>(() => {
    if (typeof window === 'undefined') {
      return null;
    }

    try {
      const saved = window.localStorage.getItem(SELECTED_LOCAL_WORKSPACE_STORAGE_KEY);
      if (!saved) {
        return null;
      }

      const parsed = JSON.parse(saved);
      if (isValidLocalWorkspaceSelection(parsed)) {
        return parsed;
      }
    } catch (error) {
      console.error('读取本地工作空间失败:', error);
    }

    return null;
  });

  const allScenarios = Object.values(scenarioStore);
  const selectedTemplate = getWritingTemplateById(selectedTemplateId);
  const selectedWorkspaceMeta = useMemo(() => {
    if (isReadingWorkspace) {
      return '读取中';
    }

    if (!selectedLocalWorkspace) {
      return null;
    }

    return `${selectedLocalWorkspace.fileCount} 个文件`;
  }, [isReadingWorkspace, selectedLocalWorkspace]);

  // 同步外部选择的场景
  useEffect(() => {
    if (selectedScenarioId) {
      setSelectedAgentId(selectedScenarioId);
      setActiveScenarioId(selectedScenarioId);
    }
  }, [selectedScenarioId]);

  useEffect(() => {
    try {
      window.localStorage.setItem(FAVORITE_AGENTS_STORAGE_KEY, JSON.stringify(favoriteAgentIds));
    } catch (error) {
      console.error('保存收藏智能体失败:', error);
    }
  }, [favoriteAgentIds]);

  useEffect(() => {
    try {
      window.localStorage.setItem(FAVORITE_TEMPLATES_STORAGE_KEY, JSON.stringify(favoriteTemplateIds));
    } catch (error) {
      console.error('保存收藏模板失败:', error);
    }
  }, [favoriteTemplateIds]);

  useEffect(() => {
    try {
      if (selectedTemplateId) {
        window.localStorage.setItem(SELECTED_TEMPLATE_STORAGE_KEY, selectedTemplateId);
      } else {
        window.localStorage.removeItem(SELECTED_TEMPLATE_STORAGE_KEY);
      }
    } catch (error) {
      console.error('保存已选模板失败:', error);
    }
  }, [selectedTemplateId]);

  useEffect(() => {
    try {
      if (selectedLocalWorkspace) {
        window.localStorage.setItem(
          SELECTED_LOCAL_WORKSPACE_STORAGE_KEY,
          JSON.stringify(selectedLocalWorkspace)
        );
      } else {
        window.localStorage.removeItem(SELECTED_LOCAL_WORKSPACE_STORAGE_KEY);
      }
    } catch (error) {
      console.error('保存本地工作空间失败:', error);
    }
  }, [selectedLocalWorkspace]);

  useEffect(() => {
    if (!isIterationMode && isTemplateModalOpen) {
      setIsTemplateModalOpen(false);
    }
  }, [isIterationMode, isTemplateModalOpen]);

  const handleSend = () => {
    if (!input.trim()) return;
    
    // 如果选择了智能体，使用 AGENT 模式；否则使用 GENERAL 模式
    const mode = selectedAgentId ? Mode.AGENT : Mode.GENERAL;
    
    // 如果选择了智能体，设置 activeScenarioId
    if (selectedAgentId) {
      setActiveScenarioId(selectedAgentId);
    }
    
    onStartWriting(
      input,
      mode,
      selectedAgentId || undefined,
      selectedTemplateId || undefined,
      selectedLocalWorkspace || undefined
    );
  };

  const handleAgentCardClick = (scenarioId: ScenarioId) => {
    const newSelection = selectedAgentId === scenarioId ? null : scenarioId;
    setSelectedAgentId(newSelection);
    
    if (newSelection) {
      setActiveScenarioId(newSelection);
      
      // 如果输入框有内容，自动跳转到工作台
      if (input.trim()) {
        onStartWriting(
          input,
          Mode.AGENT,
          newSelection,
          selectedTemplateId || undefined,
          selectedLocalWorkspace || undefined
        );
      }
    }
    
    if (onScenarioSelect) {
      onScenarioSelect(newSelection);
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'PLANNING':
        return 'border-purple-500 bg-purple-50';
      case 'WORKFLOW':
        return 'border-blue-500 bg-blue-50';
      default:
        return 'border-yellow-500 bg-yellow-50';
    }
  };

  const toggleFavoriteAgent = (scenarioId: ScenarioId, e: React.MouseEvent) => {
    e.stopPropagation();

    setFavoriteAgentIds((prev) =>
      prev.includes(scenarioId)
        ? prev.filter((id) => id !== scenarioId)
        : [...prev, scenarioId]
    );
  };

  const displayedScenarios =
    activeAgentTab === 'favorite'
      ? allScenarios.filter((scenario) => favoriteAgentIds.includes(scenario.id))
      : allScenarios;
  const totalPages = Math.max(1, Math.ceil(displayedScenarios.length / AGENTS_PER_PAGE));
  const pagedScenarios = displayedScenarios.slice(
    (currentPage - 1) * AGENTS_PER_PAGE,
    currentPage * AGENTS_PER_PAGE
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [activeAgentTab]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const handleWorkspacePick = () => {
    workspacePickerRef.current?.click();
  };

  const handleWorkspaceFilesChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = event.target.files;
    if (!files || files.length === 0) {
      return;
    }

    setIsReadingWorkspace(true);
    try {
      const nextWorkspace = await createLocalWorkspaceSelectionFromFiles(files);
      setSelectedLocalWorkspace(nextWorkspace);
    } catch (error) {
      console.error('读取本地工作空间失败:', error);
    } finally {
      setIsReadingWorkspace(false);
      event.target.value = '';
    }
  };

  const directoryInputProps =
    {
      directory: '',
      webkitdirectory: '',
      multiple: true,
    } as React.InputHTMLAttributes<HTMLInputElement> & {
      directory?: string;
      webkitdirectory?: string;
    };

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-y-auto bg-gray-50">
      <input
        {...directoryInputProps}
        ref={workspacePickerRef}
        type="file"
        className="hidden"
        onChange={handleWorkspaceFilesChange}
      />

      {/* 主标题 */}
      <div className="text-center py-12">
        <h1 className="text-6xl font-bold text-gray-800 mb-4">
          Hi, 我是智能写作助手
        </h1>
        <p className="text-xl text-gray-500">
          融合大模型能力, 支持知识库学习、全文搜索文献、对接智能体等功能, 生成文档
        </p>
      </div>

      {/* 输入区域 */}
      <div className="w-full max-w-4xl mx-auto px-8 mb-8">
        <InputArea
          mode={selectedAgentId ? Mode.AGENT : Mode.GENERAL}
          input={input}
          onInputChange={setInput}
          onSend={handleSend}
          onStepGenerationToggle={() => setStepGenerationEnabled(!stepGenerationEnabled)}
          stepGenerationEnabled={stepGenerationEnabled}
          onKnowledgeBaseClick={() => setIsKnowledgeBaseOpen(true)}
          selectedKnowledgeBases={mountedKnowledgeBaseIds}
          onKnowledgeBaseRemove={(id) => {
            onMountedKnowledgeBaseChange(
              mountedKnowledgeBaseIds.filter((item) => item !== id)
            );
          }}
          showMountedKnowledgeBasesInline
          showTemplateEntry={isIterationMode}
          selectedTemplateLabel={selectedTemplate?.name || null}
          onTemplateClick={() => setIsTemplateModalOpen(true)}
          showWorkspaceEntry={isIterationMode}
          selectedWorkspaceLabel={
            isReadingWorkspace ? '正在读取工作空间' : selectedLocalWorkspace?.folderName || null
          }
          selectedWorkspaceMeta={selectedWorkspaceMeta}
          onWorkspaceClick={handleWorkspacePick}
          selectedScenarioId={selectedAgentId || undefined}
          onMemoryClick={() => {
            setIsMemoryModalOpen(true);
          }}
          onParamsClick={() => {
            setIsParamsModalOpen(true);
          }}
          onAgentSelect={(scenarioId) => {
            if (scenarioId) {
              setSelectedAgentId(scenarioId);
              setActiveScenarioId(scenarioId);
              if (onScenarioSelect) {
                onScenarioSelect(scenarioId);
              }
            } else {
              setSelectedAgentId(null);
              if (onScenarioSelect) {
                onScenarioSelect(null);
              }
            }
          }}
        />

        {isIterationMode && selectedTemplate ? (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-sm">
            <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-amber-700">
              当前模板
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <div className="text-sm font-semibold text-slate-900">{selectedTemplate.name}</div>
              <div className="text-sm text-slate-500">{selectedTemplate.description}</div>
            </div>
          </div>
        ) : null}
        
        {/* 推荐问题 */}
        {selectedAgentId && (() => {
          const selectedScenario = allScenarios.find(s => s.id === selectedAgentId);
          if (selectedScenario) {
            const suggestedQuestions =
              selectedScenario.suggestedQuestions?.filter((item) => item.trim()) ||
              (selectedScenario.suggestedQuestion
                ? [selectedScenario.suggestedQuestion]
                : [`写一篇${selectedScenario.name}`]);
            const handleSuggestedQuestionClick = (suggestedQuestion: string) => {
              setInput(suggestedQuestion);
              // 使用 setTimeout 确保输入框更新后再发送
              setTimeout(() => {
                const mode = selectedAgentId ? Mode.AGENT : Mode.GENERAL;
                if (selectedAgentId) {
                  setActiveScenarioId(selectedAgentId);
                }
                onStartWriting(
                  suggestedQuestion,
                  mode,
                  selectedAgentId || undefined,
                  selectedTemplateId || undefined
                );
              }, 0);
            };
            return (
              <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="text-sm text-gray-500 mb-2">推荐问题：</div>
                <div className="flex flex-col gap-2">
                  {suggestedQuestions.map((suggestedQuestion) => (
                    <button
                      key={suggestedQuestion}
                      onClick={() => handleSuggestedQuestionClick(suggestedQuestion)}
                      className="px-4 py-2.5 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 hover:border-blue-300 transition-all shadow-sm hover:shadow-md w-full text-left"
                    >
                      {suggestedQuestion}
                    </button>
                  ))}
                </div>
              </div>
            );
          }
          return null;
        })()}
      </div>

      {/* 智能体列表区域 */}
      <div className="flex-1 w-full max-w-6xl mx-auto px-8 pb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-semibold text-gray-700">智能体</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveAgentTab('organization')}
                className={`px-3 py-1 text-sm font-medium border-b-2 transition-colors ${
                  activeAgentTab === 'organization'
                    ? 'text-blue-600 border-blue-600'
                    : 'text-gray-500 border-transparent hover:text-gray-700'
                }`}
              >
                我的组织
              </button>
              <button
                onClick={() => setActiveAgentTab('favorite')}
                className={`px-3 py-1 text-sm font-medium border-b-2 transition-colors ${
                  activeAgentTab === 'favorite'
                    ? 'text-blue-600 border-blue-600'
                    : 'text-gray-500 border-transparent hover:text-gray-700'
                }`}
              >
                我的收藏
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-1">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  currentPage === 1
                    ? 'cursor-not-allowed text-gray-300'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                上一页
              </button>
              <div className="px-2 text-sm text-gray-500">
                {currentPage} / {totalPages}
              </div>
              <button
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  currentPage === totalPages
                    ? 'cursor-not-allowed text-gray-300'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                下一页
              </button>
            </div>
            <button className="px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
              + 创建智能体
            </button>
          </div>
        </div>

        {/* 智能体卡片网格 */}
        <div className="grid min-h-[320px] grid-cols-3 gap-4">
          {pagedScenarios.map((scenario) => {
            const IconComponent = getScenarioIcon(scenario.cardIcon, scenario.category);
            const isSelected = selectedAgentId === scenario.id;
            const colorClass = getCategoryColor(scenario.category);
            const isFavorite = favoriteAgentIds.includes(scenario.id);
            const cardTags = scenario.cardTags?.slice(0, 2) || ['通用写作', '业务支持'];

            return (
              <div
                key={scenario.id}
                onClick={() => handleAgentCardClick(scenario.id)}
                className={`relative p-6 bg-white rounded-xl border-2 cursor-pointer transition-all hover:shadow-lg ${
                  isSelected ? colorClass : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <button
                  type="button"
                  onClick={(e) => toggleFavoriteAgent(scenario.id, e)}
                  className={`absolute right-4 top-4 rounded-full border p-1.5 transition-colors ${
                    isFavorite
                      ? 'border-blue-200 bg-blue-50 text-blue-500 hover:bg-blue-100'
                      : 'border-gray-200 bg-white text-gray-400 hover:border-gray-300 hover:text-gray-600'
                  }`}
                  title={isFavorite ? '取消收藏' : '收藏智能体'}
                >
                  <Star className={`h-3.5 w-3.5 ${isFavorite ? 'fill-current' : ''}`} />
                </button>
                <div className="flex items-start gap-4 pr-8">
                  <div className={`p-3 rounded-lg ${
                    scenario.category === 'PLANNING' ? 'bg-purple-100' :
                    scenario.category === 'WORKFLOW' ? 'bg-blue-100' :
                    'bg-yellow-100'
                  }`}>
                    <IconComponent className={`w-6 h-6 ${
                      scenario.category === 'PLANNING' ? 'text-purple-600' :
                      scenario.category === 'WORKFLOW' ? 'text-blue-600' :
                      'text-yellow-600'
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-800 mb-1">{scenario.agentConfig.name}</h3>
                    <div className="mb-2">
                      <p className="text-[11px] uppercase tracking-[0.08em] text-gray-400">
                        {scenario.publisherLabel || '组织/发布者'}
                      </p>
                      <p className="text-xs font-medium text-gray-600">
                        {scenario.publisherValue || '-'}
                      </p>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2">{scenario.agentConfig.description}</p>
                    <div className="flex items-center gap-2 mt-3">
                      {cardTags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {activeAgentTab === 'favorite' && displayedScenarios.length === 0 && (
          <div className="mt-6 rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">
            暂无收藏智能体，点击卡片右上角星标即可加入“我的收藏”
          </div>
        )}

      </div>

      {/* 知识库选择器弹窗 */}
      <KnowledgeBaseSelector
        isOpen={isKnowledgeBaseOpen}
        onClose={() => setIsKnowledgeBaseOpen(false)}
        initialSelectedIds={mountedKnowledgeBaseIds}
        onConfirm={(selectedIds) => {
          onMountedKnowledgeBaseChange(selectedIds);
          setIsKnowledgeBaseOpen(false);
        }}
      />

      {/* 记忆变量弹窗 */}
      <MemoryModal
        isOpen={isMemoryModalOpen}
        onClose={() => setIsMemoryModalOpen(false)}
        onUpdate={(values) => {
          console.log('记忆变量已更新:', values);
        }}
      />

      {/* 参数配置弹窗 */}
      <ParamsModal
        isOpen={isParamsModalOpen}
        onClose={() => setIsParamsModalOpen(false)}
        onUpdate={(values) => {
          console.log('参数配置已更新:', values);
        }}
      />

      <WritingTemplateModal
        isOpen={isTemplateModalOpen}
        initialSelectedTemplateId={selectedTemplateId}
        initialFavoriteTemplateIds={favoriteTemplateIds}
        onClose={() => setIsTemplateModalOpen(false)}
        onConfirm={({ selectedTemplateId: nextSelectedTemplateId, favoriteTemplateIds: nextFavoriteTemplateIds }) => {
          setSelectedTemplateId(nextSelectedTemplateId);
          setFavoriteTemplateIds(nextFavoriteTemplateIds);
          setIsTemplateModalOpen(false);
        }}
      />

      <div className="pointer-events-none absolute bottom-5 right-6 z-10">
        <div className="group pointer-events-auto inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white/90 px-2 py-2 shadow-sm backdrop-blur-sm transition-all hover:border-gray-300 hover:shadow-md">
          <span className="flex h-4 w-4 items-center justify-center rounded-full border border-gray-300 text-[10px] font-semibold lowercase leading-none text-gray-400">
            c
          </span>
          <span className="max-w-0 overflow-hidden whitespace-nowrap text-xs text-gray-500 opacity-0 transition-all duration-200 group-hover:ml-1 group-hover:max-w-xs group-hover:opacity-100">
            designed &amp; coded by Rowan DI
          </span>
        </div>
      </div>
    </div>
  );
};
