import React, { useState, useEffect } from 'react';
import { Mode } from '../types/writing';
import { mockDataStore, setActiveScenarioId, ScenarioId } from '../constants/mockData';
import { InputArea } from '../components/InputArea';
import { KnowledgeBaseSelector } from '../components/KnowledgeBaseSelector';
import { MemoryModal } from '../components/MemoryModal';
import { ParamsModal } from '../components/ParamsModal';
import { Brain, GitBranch, Sparkles } from 'lucide-react';

interface HomeViewProps {
  onStartWriting: (input: string, mode: Mode, scenarioId?: ScenarioId) => void;
  selectedScenarioId?: ScenarioId;
  onScenarioSelect?: (scenarioId: ScenarioId | null) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  onStartWriting,
  selectedScenarioId,
  onScenarioSelect,
}) => {
  const [input, setInput] = useState<string>('');
  const [stepGenerationEnabled, setStepGenerationEnabled] = useState<boolean>(true); // 默认开启
  const [selectedAgentId, setSelectedAgentId] = useState<ScenarioId | null>(selectedScenarioId || null);
  const [isKnowledgeBaseOpen, setIsKnowledgeBaseOpen] = useState<boolean>(false);
  const [selectedKnowledgeBases, setSelectedKnowledgeBases] = useState<string[]>([]);
  const [isMemoryModalOpen, setIsMemoryModalOpen] = useState<boolean>(false);
  const [isParamsModalOpen, setIsParamsModalOpen] = useState<boolean>(false);

  const allScenarios = Object.values(mockDataStore);

  // 同步外部选择的场景
  useEffect(() => {
    if (selectedScenarioId) {
      setSelectedAgentId(selectedScenarioId);
      setActiveScenarioId(selectedScenarioId);
    }
  }, [selectedScenarioId]);

  const handleSend = () => {
    if (!input.trim()) return;
    
    // 如果选择了智能体，使用 AGENT 模式；否则使用 GENERAL 模式
    const mode = selectedAgentId ? Mode.AGENT : Mode.GENERAL;
    
    // 如果选择了智能体，设置 activeScenarioId
    if (selectedAgentId) {
      setActiveScenarioId(selectedAgentId);
    }
    
    onStartWriting(input, mode, selectedAgentId || undefined);
  };

  const handleAgentCardClick = (scenarioId: ScenarioId) => {
    const newSelection = selectedAgentId === scenarioId ? null : scenarioId;
    setSelectedAgentId(newSelection);
    
    if (newSelection) {
      setActiveScenarioId(newSelection);
      
      // 如果输入框有内容，自动跳转到工作台
      if (input.trim()) {
        onStartWriting(input, Mode.AGENT, newSelection);
      }
    }
    
    if (onScenarioSelect) {
      onScenarioSelect(newSelection);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'PLANNING':
        return Brain;
      case 'WORKFLOW':
        return GitBranch;
      default:
        return Sparkles;
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

  return (
    <div className="h-screen flex flex-col bg-gray-50">
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
          selectedKnowledgeBases={selectedKnowledgeBases}
          onKnowledgeBaseRemove={(id) => {
            setSelectedKnowledgeBases((prev) => prev.filter((item) => item !== id));
          }}
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
      </div>

      {/* 智能体列表区域 */}
      <div className="w-full max-w-6xl mx-auto px-8 flex-1 overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-semibold text-gray-700">智能体</h2>
            <div className="flex items-center gap-2">
              <button className="px-3 py-1 text-sm font-medium text-blue-600 border-b-2 border-blue-600">
                我的组织
              </button>
              <button className="px-3 py-1 text-sm font-medium text-gray-500 hover:text-gray-700">
                我的收藏
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
              + 创建智能体
            </button>
          </div>
        </div>

        {/* 智能体卡片网格 */}
        <div className="grid grid-cols-3 gap-4">
          {allScenarios.map((scenario) => {
            const IconComponent = getCategoryIcon(scenario.category);
            const isSelected = selectedAgentId === scenario.id;
            const colorClass = getCategoryColor(scenario.category);

            return (
              <div
                key={scenario.id}
                onClick={() => handleAgentCardClick(scenario.id)}
                className={`p-6 bg-white rounded-xl border-2 cursor-pointer transition-all hover:shadow-lg ${
                  isSelected ? colorClass : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start gap-4">
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
                    <p className="text-xs text-gray-500 mb-2">@发布者</p>
                    <p className="text-sm text-gray-600 line-clamp-2">{scenario.agentConfig.description}</p>
                    <div className="flex items-center gap-2 mt-3">
                      <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">办公人事</span>
                      <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">企业服务</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

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
    </div>
  );
};
