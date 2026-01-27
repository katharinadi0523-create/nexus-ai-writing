import React, { useState, useEffect } from 'react';
import { X, Search, RefreshCw, Plus, Eye, PlusCircle } from 'lucide-react';
import { knowledgeBaseData } from '../constants/mockData';

interface KnowledgeBaseSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: (selectedIds: string[]) => void;
  initialSelectedIds?: string[];
}

type TabType = 'app-dev' | 'data-governance';

export const KnowledgeBaseSelector: React.FC<KnowledgeBaseSelectorProps> = ({
  isOpen,
  onClose,
  onConfirm,
  initialSelectedIds = [],
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('app-dev');
  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelectedIds);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // 当弹窗打开时，同步初始选择
  useEffect(() => {
    if (isOpen) {
      setSelectedIds(initialSelectedIds);
    }
  }, [isOpen, initialSelectedIds]);

  if (!isOpen) return null;

  const currentData = activeTab === 'app-dev' 
    ? knowledgeBaseData.appDevelopment 
    : knowledgeBaseData.dataGovernance;

  const filteredData = currentData.filter((kb) =>
    kb.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm(selectedIds);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-[800px] max-h-[80vh] flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">选择知识库</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Tab 切换 */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => {
              setActiveTab('app-dev');
              setSearchQuery('');
            }}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'app-dev'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            应用开发—知识库
          </button>
          <button
            onClick={() => {
              setActiveTab('data-governance');
              setSearchQuery('');
            }}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'data-governance'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            多模态数据治理-数据集
          </button>
        </div>

        {/* 搜索和操作栏 */}
        <div className="p-4 border-b border-gray-200 flex items-center gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索知识库名称"
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button className="p-2 hover:bg-gray-100 rounded transition-colors">
            <RefreshCw className="w-4 h-4 text-gray-600" />
          </button>
          <button className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors flex items-center gap-2">
            <Plus className="w-4 h-4" />
            创建知识库
          </button>
        </div>

        {/* 已选择提示 */}
        <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
          <span className="text-sm text-gray-600">已选择({selectedIds.length})</span>
        </div>

        {/* 知识库列表 */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-3">
            {filteredData.map((kb) => {
              const isSelected = selectedIds.includes(kb.id);
              return (
                <div
                  key={kb.id}
                  className={`border rounded-lg p-4 transition-all ${
                    isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded flex items-center justify-center flex-shrink-0">
                      <div className="w-6 h-6 bg-blue-500 rounded flex items-center justify-center">
                        <span className="text-white text-xs">📄</span>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-gray-800 truncate">{kb.name}</h3>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500 mb-2">
                        <span>{kb.itemCount}个</span>
                        <span>{kb.size}</span>
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-2 mb-2">{kb.description}</p>
                      <div className="text-xs text-gray-400">
                        创建时间: {kb.createdAt}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                      >
                        查看
                      </button>
                      <button
                        onClick={() => handleToggleSelect(kb.id)}
                        className={`px-3 py-1.5 text-sm rounded transition-colors ${
                          isSelected
                            ? 'bg-blue-500 text-white hover:bg-blue-600'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {isSelected ? '已添加' : '添加'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 分页和确认按钮 */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm text-gray-600">共{filteredData.length}条</div>
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleConfirm}
                className="px-4 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >
                确定
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50">
                &lt;
              </button>
              <button className="px-3 py-1 bg-blue-500 text-white rounded">1</button>
              <button className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50">2</button>
              <button className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50">3</button>
              <button className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50">4</button>
              <button className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50">5</button>
              <span className="px-2">...</span>
              <button className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50">20</button>
              <button className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50">
                &gt;
              </button>
              <select className="px-2 py-1 border border-gray-300 rounded text-sm">
                <option>10条/页</option>
              </select>
              <span className="text-sm text-gray-600">前往</span>
              <input
                type="text"
                className="w-12 px-2 py-1 border border-gray-300 rounded text-sm"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
