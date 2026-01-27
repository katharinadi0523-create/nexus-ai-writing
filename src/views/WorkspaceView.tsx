import React, { useState, useEffect, useCallback } from 'react';
import { Mode, WritingState, isValidTransition } from '../types/writing';
import { getActiveScenarioData, ScenarioId, setActiveScenarioId } from '../constants/mockData';
import { Editor } from '../components/Editor';
import { CopilotSidebar } from '../components/CopilotSidebar';
import { ArrowLeft, Clock, Save, Download, Edit2 } from 'lucide-react';

interface WorkspaceViewProps {
  initialInput: string;
  initialMode: Mode;
  initialScenarioId?: ScenarioId;
  onBack?: () => void;
  onSidebarToggle?: () => void;
  isSidebarCollapsed?: boolean;
}

export const WorkspaceView: React.FC<WorkspaceViewProps> = ({
  initialInput,
  initialMode,
  initialScenarioId,
  onBack,
  onSidebarToggle,
  isSidebarCollapsed = false,
}) => {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [writingState, setWritingState] = useState<WritingState>(WritingState.THINKING);
  const [input, setInput] = useState<string>(initialInput);
  const [agentId, setAgentId] = useState<string | undefined>();
  const [memoryConfig, setMemoryConfig] = useState<Record<string, any>>({});
  const [paramsConfig, setParamsConfig] = useState<Record<string, any>>({});
  const [outline, setOutline] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [documentName, setDocumentName] = useState<string>('新文档_1');
  const [isEditingName, setIsEditingName] = useState<boolean>(false);

  const scenarioData = getActiveScenarioData();

  // 初始化时设置场景ID
  useEffect(() => {
    if (initialScenarioId) {
      setActiveScenarioId(initialScenarioId);
    }
  }, [initialScenarioId]);

  // 发送消息后，收起侧边栏
  useEffect(() => {
    if ((writingState === WritingState.THINKING || writingState === WritingState.OUTLINE_CONFIRM || writingState === WritingState.GENERATING) && onSidebarToggle && !isSidebarCollapsed) {
      onSidebarToggle();
    }
  }, [writingState, onSidebarToggle, isSidebarCollapsed]);

  // 从内容中提取第一个一级标题
  const extractFirstH1Title = (text: string): string | null => {
    const h1Match = text.match(/^#\s+(.+)$/m);
    if (h1Match) {
      return h1Match[1].trim();
    }
    return null;
  };

  // 流式生成内容
  useEffect(() => {
    if (isGenerating && scenarioData) {
      const fullText = scenarioData.generalData.fullText;
      let currentIndex = 0;
      let titleExtracted = false;
      
      const interval = setInterval(() => {
        if (currentIndex < fullText.length) {
          const newContent = fullText.substring(0, currentIndex + 10);
          setContent(newContent);
          
          // 提取第一个一级标题并更新文档标题
          if (!titleExtracted) {
            const extractedTitle = extractFirstH1Title(newContent);
            if (extractedTitle) {
              setDocumentName(extractedTitle);
              titleExtracted = true;
            }
          }
          
          currentIndex += 10;
        } else {
          clearInterval(interval);
          setWritingState(WritingState.FINISHED);
          setIsGenerating(false);
          
          // 确保最终也提取标题（防止流式生成时未捕获到）
          const finalTitle = extractFirstH1Title(fullText);
          if (finalTitle && !titleExtracted) {
            setDocumentName(finalTitle);
          }
          
          // 流式生成完成后，设置最终内容
          setContent(fullText);
        }
      }, 50);

      return () => clearInterval(interval);
    }
  }, [isGenerating, scenarioData]);

  // 初始化：从 THINKING 状态开始（仅在首次加载且有输入时）
  const [hasInitialized, setHasInitialized] = useState<boolean>(false);
  
  useEffect(() => {
    // 只在有初始输入且还未初始化时执行
    if (initialInput && !hasInitialized && writingState === WritingState.THINKING) {
      setHasInitialized(true);
      
      if (mode === Mode.GENERAL) {
        // 模拟思考过程，然后进入大纲确认
        setTimeout(() => {
          if (scenarioData) {
            setOutline(scenarioData.generalData.outline);
          }
          setWritingState(WritingState.OUTLINE_CONFIRM);
        }, 1500);
      } else {
        // 智能体模式
        if (scenarioData) {
          setAgentId(scenarioData.agentConfig.id);
        }
        setWritingState(WritingState.INPUT);
      }
    }
  }, [initialInput, hasInitialized, mode, scenarioData, writingState]);

  // 检测输入中的 @ 字符，切换到智能体模式
  useEffect(() => {
    if (input.includes('@') && mode === Mode.GENERAL) {
      setMode(Mode.AGENT);
      setWritingState(WritingState.INPUT);
      if (scenarioData) {
        setAgentId(scenarioData.agentConfig.id);
      }
    }
  }, [input, mode, scenarioData]);

  // 当切换到智能体模式时，自动设置智能体 ID
  useEffect(() => {
    if (mode === Mode.AGENT && !agentId && scenarioData) {
      setAgentId(scenarioData.agentConfig.id);
    }
  }, [mode, agentId, scenarioData]);

  // 处理发送查询
  const handleSendQuery = useCallback(() => {
    if (!input.trim()) return;

    if (mode === Mode.GENERAL) {
      // 通用模式：INPUT -> THINKING
      setWritingState(WritingState.THINKING);
      
      // 模拟思考过程，然后进入大纲确认
      setTimeout(() => {
        if (scenarioData) {
          setOutline(scenarioData.generalData.outline);
        }
        setWritingState(WritingState.OUTLINE_CONFIRM);
      }, 1500);
    }
  }, [input, mode, scenarioData]);

  // 处理大纲确认
  const handleOutlineConfirm = useCallback(() => {
    if (isValidTransition(mode, writingState, WritingState.GENERATING)) {
      setWritingState(WritingState.GENERATING);
      setIsGenerating(true);
      setContent(''); // 重置内容
      
      // 如果场景数据中有fullText，提前提取标题
      if (scenarioData?.generalData.fullText) {
        const extractedTitle = extractFirstH1Title(scenarioData.generalData.fullText);
        if (extractedTitle) {
          setDocumentName(extractedTitle);
        }
      }
    }
  }, [mode, writingState, scenarioData]);

  // 处理模式切换
  const handleModeToggle = useCallback((newMode: Mode) => {
    setMode(newMode);
    setWritingState(WritingState.INPUT);
    if (newMode === Mode.AGENT && scenarioData) {
      setAgentId(scenarioData.agentConfig.id);
    } else {
      setAgentId(undefined);
      setMemoryConfig({});
      setParamsConfig({});
    }
  }, [scenarioData]);

  // 处理记忆配置更新
  const handleMemoryConfigChange = useCallback((config: Record<string, any>) => {
    setMemoryConfig(config);
  }, []);

  // 处理参数配置更新
  const handleParamsConfigChange = useCallback((config: Record<string, any>) => {
    setParamsConfig(config);
  }, []);

  // 处理开始生成（智能体模式）
  const handleStartGenerate = useCallback(() => {
    setWritingState(WritingState.GENERATING);
    setIsGenerating(true);
    setContent(''); // 重置内容
    
    // 如果场景数据中有fullText，提前提取标题
    if (scenarioData?.generalData.fullText) {
      const extractedTitle = extractFirstH1Title(scenarioData.generalData.fullText);
      if (extractedTitle) {
        setDocumentName(extractedTitle);
      }
    }
  }, [scenarioData]);

  const handleSave = () => {
    console.log('保存文档:', { documentName, content });
    // TODO: 实现保存逻辑
  };

  const handleDownload = () => {
    console.log('导出文档:', { documentName, content });
    // TODO: 实现导出逻辑
  };

  const handleHistory = () => {
    console.log('查看历史编辑记录');
    // TODO: 实现历史记录逻辑
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="h-14 bg-white border-b border-gray-200 flex items-center px-4">
        {/* 返回按钮 */}
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-100 rounded transition-colors mr-4"
          title="返回首页"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>

        {/* 智能体名称 */}
        <div className="flex-1">
          <select className="text-sm font-medium text-gray-700 bg-transparent border-none focus:outline-none cursor-pointer">
            <option>{scenarioData?.agentConfig?.name || '通用写作智能体'}</option>
          </select>
        </div>
      </div>

      {/* 主内容区域 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧：编辑器（约2/3宽度） */}
        <div className="flex-[2] relative flex flex-col">
          {/* 编辑器Header */}
          <div className="h-12 bg-white border-b border-gray-200 flex items-center px-4 gap-4">
            {/* 文档命名 */}
            <div className="flex items-center gap-2 min-w-0" style={{ flex: '1 1 0%', maxWidth: 'none' }}>
              {isEditingName ? (
                <input
                  type="text"
                  value={documentName}
                  onChange={(e) => setDocumentName(e.target.value)}
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
                  <span className="text-sm font-medium text-gray-700" style={{ whiteSpace: 'nowrap', overflow: 'visible' }}>{documentName}</span>
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

            {/* 右侧按钮组 */}
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

          {/* 编辑器内容 */}
          <div className="flex-1 overflow-hidden">
            <Editor
              content={content}
              writingState={writingState}
              onContentChange={(newContent) => {
                setContent(newContent);
              }}
            />
          </div>
        </div>

        {/* 右侧：Copilot 侧边栏（约1/3宽度） */}
        <div className="flex-1 border-l border-gray-200">
          <CopilotSidebar
            mode={mode}
            writingState={writingState}
            input={input}
            outline={outline}
            memoryConfig={memoryConfig}
            paramsConfig={paramsConfig}
            onInputChange={setInput}
            onSend={handleSendQuery}
            onModeToggle={handleModeToggle}
            onOutlineConfirm={handleOutlineConfirm}
            onMemoryConfigChange={handleMemoryConfigChange}
            onParamsConfigChange={handleParamsConfigChange}
            onStartGenerate={handleStartGenerate}
          />
        </div>
      </div>
    </div>
  );
};
