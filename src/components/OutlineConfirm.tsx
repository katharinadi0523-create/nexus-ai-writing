import React, { useState, useEffect } from 'react';
import { parseOutline, OutlineNode } from '../utils/outlineParser';
import { getActiveScenarioData } from '../constants/mockData';

interface OutlineConfirmProps {
  outline: string;
  onConfirm: () => void;
  onCancel: () => void;
}

// 从大纲中提取第一个一级标题
const extractTitleFromOutline = (outline: string): string => {
  const h1Match = outline.match(/^#\s+(.+)$/m);
  if (h1Match) {
    return h1Match[1].trim();
  }
  return '';
};

interface EditableOutlineNodeProps {
  node: OutlineNode;
  depth: number;
  index: number;
  onEdit?: (node: OutlineNode, newTitle: string) => void;
  onDelete?: (node: OutlineNode) => void;
}

const EditableOutlineNode: React.FC<EditableOutlineNodeProps> = ({
  node,
  depth,
  index,
  onEdit,
  onDelete,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(node.title);

  const handleSave = () => {
    if (onEdit) {
      onEdit(node, editValue);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(node.title);
    setIsEditing(false);
  };

  const getNumberPrefix = (depth: number, index: number): string => {
    if (depth === 0) {
      return `${index + 1}. `;
    } else if (depth === 1) {
      return `${String.fromCharCode(97 + index)}. `; // a, b, c...
    } else {
      return `${index + 1}) `;
    }
  };

  return (
    <div className="mb-3">
      <div className="flex items-center gap-2 group">
        <span className="text-gray-500 text-sm min-w-[2rem]">
          {getNumberPrefix(depth, index)}
        </span>
        {isEditing ? (
          <div className="flex-1 flex items-center gap-2">
            <input
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleSave}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave();
                if (e.key === 'Escape') handleCancel();
              }}
              className="flex-1 px-2 py-1 border border-blue-500 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              autoFocus
            />
          </div>
        ) : (
          <>
            <div
              className={`flex-1 text-gray-800 cursor-text ${
                depth === 0 ? 'text-base font-semibold' : depth === 1 ? 'text-sm font-medium' : 'text-sm'
              }`}
              onClick={() => setIsEditing(true)}
            >
              {node.title}
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => setIsEditing(true)}
                className="p-1 hover:bg-gray-100 rounded"
                title="编辑"
              >
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              {onDelete && (
                <button
                  onClick={() => onDelete(node)}
                  className="p-1 hover:bg-gray-100 rounded"
                  title="删除"
                >
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>
          </>
        )}
      </div>
      {node.children.length > 0 && (
        <div className="ml-8 mt-2">
          {node.children.map((child, childIndex) => (
            <EditableOutlineNode
              key={childIndex}
              node={child}
              depth={depth + 1}
              index={childIndex}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const OutlineConfirm: React.FC<OutlineConfirmProps> = ({ outline, onConfirm, onCancel }) => {
  const [outlineNodes, setOutlineNodes] = useState<OutlineNode[]>(() => parseOutline(outline));
  const [title, setTitle] = useState<string>('');

  // 从大纲或场景数据中提取标题
  useEffect(() => {
    // 优先从大纲中提取标题
    const extractedTitle = extractTitleFromOutline(outline);
    if (extractedTitle) {
      setTitle(extractedTitle);
    } else {
      // 如果大纲中没有标题，尝试从场景数据中获取
      const scenarioData = getActiveScenarioData();
      if (scenarioData) {
        // 尝试从 fullText 中提取标题
        const fullTextTitle = extractTitleFromOutline(scenarioData.generalData.fullText);
        if (fullTextTitle) {
          setTitle(fullTextTitle);
        } else {
          // 最后使用场景名称
          setTitle(scenarioData.name);
        }
      }
    }
  }, [outline]);

  // 当 outline 变化时更新节点
  React.useEffect(() => {
    setOutlineNodes(parseOutline(outline));
  }, [outline]);

  const handleEdit = (targetNode: OutlineNode, newTitle: string) => {
    const updateNode = (nodes: OutlineNode[]): OutlineNode[] => {
      return nodes.map((node) => {
        if (node === targetNode) {
          return { ...node, title: newTitle };
        }
        if (node.children.length > 0) {
          return { ...node, children: updateNode(node.children) };
        }
        return node;
      });
    };
    setOutlineNodes(updateNode(outlineNodes));
  };

  const handleDelete = (targetNode: OutlineNode) => {
    const removeNode = (nodes: OutlineNode[]): OutlineNode[] => {
      return nodes
        .filter((node) => node !== targetNode)
        .map((node) => ({
          ...node,
          children: node.children.length > 0 ? removeNode(node.children) : [],
        }));
    };
    setOutlineNodes(removeNode(outlineNodes));
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      {/* 标题字段 */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">标题</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="请输入标题"
        />
      </div>

      {/* 内容区域（大纲） */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">内容</label>
        <div className="bg-gray-50 rounded-md p-4 max-h-96 overflow-y-auto border border-gray-200">
          {outlineNodes.length === 0 ? (
            <div className="text-gray-400 text-sm">无法解析大纲内容</div>
          ) : (
            outlineNodes.map((node, index) => (
              <EditableOutlineNode
                key={index}
                node={node}
                depth={0}
                index={index}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))
          )}
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex items-center justify-end">
        <button
          onClick={onConfirm}
          className="px-6 py-2 text-sm text-white bg-blue-500 rounded-md hover:bg-blue-600 transition-colors"
        >
          基于大纲生成文档
        </button>
      </div>
    </div>
  );
};
