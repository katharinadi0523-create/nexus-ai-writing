import { useEffect, useState } from 'react';
import { Mode } from './types/writing';
import { ScenarioId, setActiveScenarioId } from './constants/mockData';
import { HomeView } from './views/HomeView';
import { WorkspaceView } from './views/WorkspaceView';
import { Sidebar } from './components/Sidebar';
import { createTask, Task } from './utils/taskStore';
import {
  getMountedKnowledgeBaseIds,
  saveMountedKnowledgeBaseIds,
} from './utils/mountedKnowledgeBaseStore';
import './index.css';

type ViewType = 'home' | 'workspace';

function App() {
  const [currentView, setCurrentView] = useState<ViewType>('home');
  const [workspaceInput, setWorkspaceInput] = useState<string>('');
  const [workspaceMode, setWorkspaceMode] = useState<Mode>(Mode.GENERAL);
  const [selectedScenarioId, setSelectedScenarioId] = useState<ScenarioId | null>(null);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [mountedKnowledgeBaseIds, setMountedKnowledgeBaseIds] = useState<string[]>(
    () => getMountedKnowledgeBaseIds()
  );

  useEffect(() => {
    saveMountedKnowledgeBaseIds(mountedKnowledgeBaseIds);
  }, [mountedKnowledgeBaseIds]);

  const handleStartWriting = (input: string, mode: Mode, scenarioId?: ScenarioId, taskId?: string) => {
    setWorkspaceInput(input);
    setWorkspaceMode(mode);
    if (scenarioId) {
      setActiveScenarioId(scenarioId);
      setSelectedScenarioId(scenarioId);
    }
    if (taskId) {
      setCurrentTaskId(taskId);
    }
    setCurrentView('workspace');
  };

  const handleBackToHome = () => {
    setCurrentView('home');
    setCurrentTaskId(null);
  };

  // 处理从任务恢复
  const handleTaskRestore = (task: Task) => {
    setWorkspaceInput(task.input);
    setWorkspaceMode(task.mode);
    if (task.scenarioId) {
      setActiveScenarioId(task.scenarioId);
      setSelectedScenarioId(task.scenarioId);
    }
    setCurrentTaskId(task.id);
    setCurrentView('workspace');
  };

  // 处理创建新任务（从首页发送时）
  const handleCreateTask = (input: string, mode: Mode, scenarioId?: ScenarioId) => {
    const task = createTask(input, input, mode, scenarioId);
    handleStartWriting(input, mode, scenarioId, task.id);
  };

  return (
    <div className="h-screen flex">
      {/* 左侧任务栏仅在首页显示；进入具体写作任务后隐藏 */}
      {currentView === 'home' && (
        <Sidebar 
          onTaskRestore={handleTaskRestore}
          currentView={currentView}
        />
      )}

      {/* 主内容区域 */}
      <div className="flex-1 flex flex-col">
        {currentView === 'home' && (
          <HomeView
            onStartWriting={handleCreateTask}
            selectedScenarioId={selectedScenarioId || undefined}
            onScenarioSelect={setSelectedScenarioId}
            mountedKnowledgeBaseIds={mountedKnowledgeBaseIds}
            onMountedKnowledgeBaseChange={setMountedKnowledgeBaseIds}
          />
        )}
        {currentView === 'workspace' && (
          <WorkspaceView
            initialInput={workspaceInput}
            initialMode={workspaceMode}
            initialScenarioId={selectedScenarioId || undefined}
            taskId={currentTaskId}
            onBack={handleBackToHome}
            mountedKnowledgeBaseIds={mountedKnowledgeBaseIds}
            onMountedKnowledgeBaseChange={setMountedKnowledgeBaseIds}
          />
        )}
      </div>
    </div>
  );
}

export default App;
