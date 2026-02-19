import React, { useState } from 'react';
import { ScenarioId, mockDataStore, setActiveScenarioId, getActiveScenarioData } from '../constants/mockData';
import { Brain, GitBranch, Sparkles, FileText, Pencil, Trash2 } from 'lucide-react';
import { getAllTasks, Task, deleteTask, updateTask } from '../utils/taskStore';

interface SidebarProps {
  onScenarioChange: (scenarioId: ScenarioId) => void;
  onTaskRestore: (task: Task) => void;
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

export const Sidebar: React.FC<SidebarProps> = ({ onScenarioChange, onTaskRestore }) => {
  const allScenarios = Object.values(mockDataStore);
  const favoriteTasks = allScenarios.filter((s) => s.isFavorite);
  // 获取最近任务（从任务存储中获取）
  const [recentTasks, setRecentTasks] = useState<Task[]>(getAllTasks().slice(0, 10));
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>('');

  const refreshTasks = () => {
    setRecentTasks(getAllTasks().slice(0, 10));
  };

  const handleTaskClick = (scenarioId: ScenarioId) => {
    setActiveScenarioId(scenarioId);
    onScenarioChange(scenarioId);
  };

  const handleRecentTaskClick = (task: Task, e?: React.MouseEvent) => {
    // 如果点击的是操作按钮，不触发任务恢复
    if (e && (e.target as HTMLElement).closest('.task-actions')) {
      return;
    }
    onTaskRestore(task);
  };

  const handleDeleteTask = (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('确定要删除这个任务吗？')) {
      deleteTask(taskId);
      refreshTasks();
      // 如果正在编辑这个任务，取消编辑状态
      if (editingTaskId === taskId) {
        setEditingTaskId(null);
      }
    }
  };

  const handleStartRename = (task: Task, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTaskId(task.id);
    setEditingName(task.name);
  };

  const handleCancelRename = () => {
    setEditingTaskId(null);
    setEditingName('');
  };

  const handleConfirmRename = (taskId: string) => {
    if (editingName.trim()) {
      updateTask(taskId, { name: editingName.trim() });
      refreshTasks();
    }
    setEditingTaskId(null);
    setEditingName('');
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent, taskId: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      handleConfirmRename(taskId);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      handleCancelRename();
    }
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
            {recentTasks.length > 0 ? (
              recentTasks.map((task) => (
                <div
                  key={task.id}
                  onClick={(e) => handleRecentTaskClick(task, e)}
                  className="group flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors hover:bg-gray-50 relative"
                >
                  <div className="p-2 rounded bg-gray-100 text-gray-600 flex-shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    {editingTaskId === task.id ? (
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => handleRenameKeyDown(e, task.id)}
                        onClick={(e) => e.stopPropagation()}
                        onBlur={() => {
                          // 失焦时自动确认（如果内容有变化）
                          if (editingName.trim() && editingName.trim() !== task.name) {
                            handleConfirmRename(task.id);
                          } else {
                            handleCancelRename();
                          }
                        }}
                        className="w-full text-sm font-medium text-gray-800 bg-white border border-blue-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        autoFocus
                      />
                    ) : (
                      <>
                        <div className="text-sm font-medium text-gray-800 truncate">
                          {task.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(task.updatedAt).toLocaleString('zh-CN', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </>
                    )}
                  </div>
                  {editingTaskId !== task.id && (
                    <div className="task-actions absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto">
                      <button
                        onClick={(e) => handleStartRename(task, e)}
                        className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors bg-white shadow-sm"
                        title="重命名"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => handleDeleteTask(task.id, e)}
                        className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors bg-white shadow-sm"
                        title="删除"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-xs text-gray-400 py-2">暂无最近任务</div>
            )}
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
