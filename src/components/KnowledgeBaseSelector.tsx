import React, { useEffect, useState } from 'react';
import { X, Search, RefreshCw, Plus } from 'lucide-react';
import { groupKnowledgeBasesBySource } from '../constants/knowledgeBases';

interface KnowledgeBaseSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: (selectedIds: string[]) => void;
  initialSelectedIds?: string[];
}

export const KnowledgeBaseSelector: React.FC<KnowledgeBaseSelectorProps> = ({
  isOpen,
  onClose,
  onConfirm,
  initialSelectedIds = [],
}) => {
  const knowledgeBaseGroups = groupKnowledgeBasesBySource();
  const [activeTab, setActiveTab] = useState<string>(
    knowledgeBaseGroups[0]?.sourceLabel || ''
  );
  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelectedIds);
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setSelectedIds(initialSelectedIds);
    }
  }, [isOpen, initialSelectedIds]);

  useEffect(() => {
    if (!knowledgeBaseGroups.some((group) => group.sourceLabel === activeTab)) {
      setActiveTab(knowledgeBaseGroups[0]?.sourceLabel || '');
    }
  }, [activeTab, knowledgeBaseGroups]);

  if (!isOpen) {
    return null;
  }

  const currentData =
    knowledgeBaseGroups.find((group) => group.sourceLabel === activeTab)?.items || [];

  const filteredData = currentData.filter((knowledgeBase) =>
    knowledgeBase.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleToggleSelect = (key: string) => {
    setSelectedIds((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]
    );
  };

  const handleConfirm = () => {
    onConfirm?.(selectedIds);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="flex max-h-[80vh] w-[800px] flex-col rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 p-4">
          <h2 className="text-lg font-semibold text-gray-800">选择知识库</h2>
          <button
            onClick={onClose}
            className="rounded p-1 transition-colors hover:bg-gray-100"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {knowledgeBaseGroups.length > 1 ? (
          <div className="flex border-b border-gray-200">
            {knowledgeBaseGroups.map((group) => (
              <button
                key={group.sourceLabel}
                onClick={() => {
                  setActiveTab(group.sourceLabel);
                  setSearchQuery('');
                }}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === group.sourceLabel
                    ? 'border-b-2 border-blue-600 bg-blue-50 text-blue-600'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                {group.sourceLabel}
              </button>
            ))}
          </div>
        ) : (
          <div className="border-b border-gray-200 px-4 py-3 text-sm font-medium text-gray-700">
            {knowledgeBaseGroups[0]?.sourceLabel || '知识库'}
          </div>
        )}

        <div className="flex items-center gap-2 border-b border-gray-200 p-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="搜索知识库名称"
              className="w-full rounded-md border border-gray-300 py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button className="rounded p-2 transition-colors hover:bg-gray-100">
            <RefreshCw className="h-4 w-4 text-gray-600" />
          </button>
          <button className="flex items-center gap-2 rounded-md bg-blue-500 px-4 py-2 text-white transition-colors hover:bg-blue-600">
            <Plus className="h-4 w-4" />
            创建知识库
          </button>
        </div>

        <div className="border-b border-gray-200 bg-gray-50 px-4 py-2">
          <span className="text-sm text-gray-600">已选择({selectedIds.length})</span>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-3">
            {filteredData.map((knowledgeBase) => {
              const isSelected = selectedIds.includes(knowledgeBase.key);
              const itemCountText =
                typeof knowledgeBase.itemCount === 'number'
                  ? `${knowledgeBase.itemCount}个`
                  : '真实知识库';
              const sizeText = knowledgeBase.size || knowledgeBase.sourceLabel;

              return (
                <div
                  key={knowledgeBase.key}
                  className={`rounded-lg border p-4 transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded bg-blue-100">
                      <div className="flex h-6 w-6 items-center justify-center rounded bg-blue-500">
                        <span className="text-xs text-white">📄</span>
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center justify-between">
                        <h3 className="truncate font-semibold text-gray-800">
                          {knowledgeBase.name}
                        </h3>
                      </div>
                      <div className="mb-2 flex items-center gap-4 text-sm text-gray-500">
                        <span>{itemCountText}</span>
                        <span>{sizeText}</span>
                      </div>
                      <p className="mb-2 line-clamp-2 text-sm text-gray-600">
                        {knowledgeBase.description}
                      </p>
                      {knowledgeBase.createdAt ? (
                        <div className="text-xs text-gray-400">
                          创建时间: {knowledgeBase.createdAt}
                        </div>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="rounded border border-gray-300 px-3 py-1.5 text-sm transition-colors hover:bg-gray-50">
                        查看
                      </button>
                      <button
                        onClick={() => handleToggleSelect(knowledgeBase.key)}
                        className={`rounded px-3 py-1.5 text-sm transition-colors ${
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

            {filteredData.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-200 py-10 text-center text-sm text-gray-400">
                未找到匹配的知识库
              </div>
            ) : null}
          </div>
        </div>

        <div className="border-t border-gray-200 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm text-gray-600">共{filteredData.length}条</div>
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="rounded border border-gray-300 px-4 py-2 text-sm transition-colors hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleConfirm}
                className="rounded bg-blue-500 px-4 py-2 text-sm text-white transition-colors hover:bg-blue-600"
              >
                确定
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button className="rounded border border-gray-300 px-3 py-1 hover:bg-gray-50">
                &lt;
              </button>
              <button className="rounded bg-blue-500 px-3 py-1 text-white">1</button>
              <button className="rounded border border-gray-300 px-3 py-1 hover:bg-gray-50">
                &gt;
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
