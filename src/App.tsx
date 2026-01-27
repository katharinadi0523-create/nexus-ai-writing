import { useState } from 'react';
import { Mode } from './types/writing';
import { ScenarioId, setActiveScenarioId } from './constants/mockData';
import { HomeView } from './views/HomeView';
import { WorkspaceView } from './views/WorkspaceView';
import { Sidebar } from './components/Sidebar';
import './index.css';

type ViewType = 'home' | 'workspace';

function App() {
  const [currentView, setCurrentView] = useState<ViewType>('home');
  const [workspaceInput, setWorkspaceInput] = useState<string>('');
  const [workspaceMode, setWorkspaceMode] = useState<Mode>(Mode.GENERAL);
  const [selectedScenarioId, setSelectedScenarioId] = useState<ScenarioId | null>(null);

  const handleStartWriting = (input: string, mode: Mode, scenarioId?: ScenarioId) => {
    setWorkspaceInput(input);
    setWorkspaceMode(mode);
    if (scenarioId) {
      setActiveScenarioId(scenarioId);
      setSelectedScenarioId(scenarioId);
    }
    setCurrentView('workspace');
  };

  const handleBackToHome = () => {
    setCurrentView('home');
    setWorkspaceInput('');
  };

  const handleScenarioChange = (scenarioId: ScenarioId) => {
    setActiveScenarioId(scenarioId);
    setSelectedScenarioId(scenarioId);
    // 如果当前在 workspace，可以切换到对应的场景
    if (currentView === 'workspace') {
      // 可以在这里实现场景切换逻辑
    }
  };

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);

  return (
    <div className="h-screen flex">
      {/* 侧边栏 - 在 HOME 和 WORKSPACE 都显示，WORKSPACE 时可以收起 */}
      {(!isSidebarCollapsed || currentView === 'home') && (
        <Sidebar onScenarioChange={handleScenarioChange} />
      )}

      {/* 主内容区域 */}
      <div className="flex-1 flex flex-col">
        {currentView === 'home' && (
          <HomeView
            onStartWriting={handleStartWriting}
            selectedScenarioId={selectedScenarioId || undefined}
            onScenarioSelect={setSelectedScenarioId}
          />
        )}
        {currentView === 'workspace' && (
          <WorkspaceView
            initialInput={workspaceInput}
            initialMode={workspaceMode}
            initialScenarioId={selectedScenarioId || undefined}
            onBack={handleBackToHome}
            onSidebarToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            isSidebarCollapsed={isSidebarCollapsed}
          />
        )}
      </div>
    </div>
  );
}

export default App;
