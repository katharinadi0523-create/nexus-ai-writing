import React from 'react';
import { X } from 'lucide-react';
import { getKnowledgeBasesByKeys } from '../constants/knowledgeBases';

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
  const selectedKnowledgeBases = getKnowledgeBasesByKeys(selectedIds);

  return (
    <div className="absolute left-0 top-full z-50 mt-2 max-h-[400px] w-[400px] overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-xl">
      <div className="flex items-center justify-between border-b border-gray-200 p-3">
        <span className="text-sm font-medium text-gray-700">
          已选择知识库 ({selectedKnowledgeBases.length})
        </span>
        <button
          onClick={onClose}
          className="rounded p-1 transition-colors hover:bg-gray-100"
        >
          <X className="h-4 w-4 text-gray-500" />
        </button>
      </div>
      <div className="p-2">
        {selectedKnowledgeBases.length === 0 ? (
          <div className="py-4 text-center text-sm text-gray-400">暂未选择知识库</div>
        ) : (
          <div className="space-y-2">
            {selectedKnowledgeBases.map((knowledgeBase) => (
              <div
                key={knowledgeBase.key}
                className="flex items-center gap-3 rounded p-2 transition-colors hover:bg-gray-50"
              >
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded bg-blue-100">
                  <div className="flex h-5 w-5 items-center justify-center rounded bg-blue-500">
                    <span className="text-xs text-white">📄</span>
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-gray-800">
                    {knowledgeBase.name}
                  </div>
                </div>
                <button
                  onClick={() => onRemove(knowledgeBase.key)}
                  className="rounded p-1 transition-colors hover:bg-gray-200"
                >
                  <X className="h-4 w-4 text-gray-500" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
