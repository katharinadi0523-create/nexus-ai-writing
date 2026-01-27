import React from 'react';
import { X } from 'lucide-react';
import { knowledgeBaseData, KnowledgeBase } from '../constants/mockData';

interface KnowledgeBaseListProps {
  selectedIds: string[];
  onRemove: (id: string) => void;
  onClose: () => void;
}

export const KnowledgeBaseList: React.FC<KnowledgeBaseListProps> = ({
  selectedIds,
  onRemove,
  onClose,
}) => {
  // 从所有知识库中查找已选择的知识库
  const allKnowledgeBases = [
    ...knowledgeBaseData.appDevelopment,
    ...knowledgeBaseData.dataGovernance,
  ];

  const selectedKnowledgeBases = allKnowledgeBases.filter((kb) =>
    selectedIds.includes(kb.id)
  );

  return (
    <div className="absolute top-full left-0 mt-2 w-[400px] bg-white border border-gray-200 rounded-lg shadow-xl z-50 max-h-[400px] overflow-y-auto">
      <div className="p-3 border-b border-gray-200 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">
          已选择知识库 ({selectedIds.length})
        </span>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>
      <div className="p-2">
        {selectedKnowledgeBases.length === 0 ? (
          <div className="text-sm text-gray-400 text-center py-4">
            暂未选择知识库
          </div>
        ) : (
          <div className="space-y-2">
            {selectedKnowledgeBases.map((kb) => (
              <div
                key={kb.id}
                className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded transition-colors"
              >
                <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center flex-shrink-0">
                  <div className="w-5 h-5 bg-blue-500 rounded flex items-center justify-center">
                    <span className="text-white text-xs">📄</span>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-800 truncate">
                    {kb.name}
                  </div>
                </div>
                <button
                  onClick={() => onRemove(kb.id)}
                  className="p-1 hover:bg-gray-200 rounded transition-colors"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
