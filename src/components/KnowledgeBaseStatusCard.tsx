import React from 'react';
import { Database, Plus } from 'lucide-react';
import { getKnowledgeBasesByKeys } from '../constants/knowledgeBases';

interface KnowledgeBaseStatusCardProps {
  selectedIds: string[];
  onManage?: () => void;
  emptyText?: string;
  title?: string;
  className?: string;
  compact?: boolean;
}

export const KnowledgeBaseStatusCard: React.FC<KnowledgeBaseStatusCardProps> = ({
  selectedIds,
  onManage,
  emptyText = '当前通用写作智能体未挂载外挂知识库。',
  title = '当前外挂知识来源',
  className = '',
  compact = false,
}) => {
  const selectedKnowledgeBases = getKnowledgeBasesByKeys(selectedIds);

  if (compact) {
    return (
      <div className={`rounded-2xl border border-gray-200 bg-white p-4 ${className}`}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <Database className="h-4 w-4 flex-shrink-0 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">{title}</span>
          </div>
          {onManage ? (
            <button
              onClick={onManage}
              className="inline-flex flex-shrink-0 items-center gap-1 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              <Plus className="h-3.5 w-3.5" />
              管理
            </button>
          ) : null}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {selectedKnowledgeBases.length > 0 ? (
            selectedKnowledgeBases.map((knowledgeBase) => (
              <span
                key={knowledgeBase.key}
                className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-700"
              >
                {knowledgeBase.name}
              </span>
            ))
          ) : (
            <span className="text-xs text-gray-400">{emptyText}</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border border-blue-100 bg-blue-50/70 p-4 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-medium text-blue-900">
            <Database className="h-4 w-4" />
            <span>{title}</span>
          </div>
          <div className="mt-1 text-xs leading-5 text-blue-700">
            {selectedKnowledgeBases.length > 0
              ? `已挂载 ${selectedKnowledgeBases.length} 个知识库，通用智能体后续请求会优先参考这些外挂知识片段。`
              : emptyText}
          </div>
        </div>
        {onManage ? (
          <button
            onClick={onManage}
            className="inline-flex flex-shrink-0 items-center gap-1 rounded-full border border-blue-200 bg-white px-3 py-1 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100"
          >
            <Plus className="h-3.5 w-3.5" />
            管理
          </button>
        ) : null}
      </div>

      {selectedKnowledgeBases.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {selectedKnowledgeBases.map((knowledgeBase) => (
            <span
              key={knowledgeBase.key}
              className="rounded-full bg-white px-3 py-1 text-xs font-medium text-blue-900 ring-1 ring-inset ring-blue-200"
            >
              {knowledgeBase.name}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
};
