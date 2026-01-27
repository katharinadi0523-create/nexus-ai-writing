import React from 'react';
import { ScenarioId, mockDataStore, setActiveScenarioId, getActiveScenarioData } from '../constants/mockData';
import { Brain, GitBranch, Sparkles, FileText } from 'lucide-react';

interface SidebarProps {
  onScenarioChange: (scenarioId: ScenarioId) => void;
}

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'PLANNING':
      return Brain;
    case 'WORKFLOW':
      return GitBranch;
    case 'GENERAL':
      return Sparkles;
    default:
      return FileText;
  }
};

export const Sidebar: React.FC<SidebarProps> = ({ onScenarioChange }) => {
  const allScenarios = Object.values(mockDataStore);
  const favoriteTasks = allScenarios.filter((s) => s.isFavorite);
  const recentTasks = allScenarios.slice(0, 4); // 最近4个任务

  const handleTaskClick = (scenarioId: ScenarioId) => {
    setActiveScenarioId(scenarioId);
    onScenarioChange(scenarioId);
  };

  const renderTaskItem = (scenario: typeof allScenarios[0]) => {
    const IconComponent = getCategoryIcon(scenario.category);
    const isActive = getActiveScenarioData()?.id === scenario.id;

    return (
      <div
        key={scenario.id}
        onClick={() => handleTaskClick(scenario.id)}
        className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
          isActive
            ? 'bg-blue-50 border border-blue-200'
            : 'hover:bg-gray-50'
        }`}
      >
        <div className={`p-2 rounded ${
          scenario.category === 'PLANNING' ? 'bg-purple-100 text-purple-600' :
          scenario.category === 'WORKFLOW' ? 'bg-blue-100 text-blue-600' :
          'bg-yellow-100 text-yellow-600'
        }`}>
          <IconComponent className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-800 truncate">
            {scenario.name}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-64 h-full bg-gray-50 border-r border-gray-200 flex flex-col">
      {/* 任务列表 */}
      <div className="flex-1 overflow-y-auto">
        {/* 收藏任务 */}
        <div className="p-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">收藏任务</h3>
          <div className="space-y-1">
            {favoriteTasks.length > 0 ? (
              favoriteTasks.map(renderTaskItem)
            ) : (
              <div className="text-xs text-gray-400 py-2">暂无收藏任务</div>
            )}
          </div>
        </div>

        {/* 最近任务 */}
        <div className="p-4 border-t border-gray-200">
          <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">最近任务</h3>
          <div className="space-y-1">
            {recentTasks.map(renderTaskItem)}
          </div>
        </div>
      </div>

      {/* 底部帮助和用户信息 */}
      <div className="border-t border-gray-200 p-4 space-y-3">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-gray-600 hover:text-gray-800 cursor-pointer">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>扩展入口</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-600 hover:text-gray-800 cursor-pointer">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>帮助手册</span>
          </div>
        </div>

        {/* 用户信息 */}
        <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
            R
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-800">Rowan DI</div>
            <div className="text-xs text-gray-500">管理员 - AI产品组/应用开发平台PM</div>
          </div>
        </div>
      </div>
    </div>
  );
};
