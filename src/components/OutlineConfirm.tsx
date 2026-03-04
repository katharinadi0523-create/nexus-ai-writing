import React, { useState, useEffect } from 'react';
import { parseOutline, OutlineNode } from '../utils/outlineParser';

interface OutlineConfirmProps {
  outline: string;
  fallbackTitle?: string;
  onConfirm: (outline: string) => void;
  onCancel: () => void;
  readOnly?: boolean;
}

const extractTitleFromOutline = (outline: string): string => {
  const h1Match = outline.match(/^#\s+(.+)$/m);
  if (h1Match) {
    return h1Match[1].trim();
  }
  return '';
};

function splitOutline(markdown: string) {
  const parsed = parseOutline(markdown);
  const firstNode = parsed[0];

  if (firstNode?.level === 1) {
    return {
      title: firstNode.title,
      nodes: firstNode.children,
    };
  }

  return {
    title: '',
    nodes: parsed,
  };
}

function serializeOutline(title: string, nodes: OutlineNode[]): string {
  const safeTitle = title.trim() || '未命名文档';
  const lines = [`# ${safeTitle}`];

  const appendNodes = (items: OutlineNode[], level: number) => {
    items.forEach((item) => {
      lines.push(`${'#'.repeat(level)} ${item.title.trim()}`);
      if (item.children.length > 0) {
        appendNodes(item.children, Math.min(level + 1, 3));
      }
    });
  };

  appendNodes(nodes, 2);
  return lines.join('\n');
}

interface EditableOutlineNodeProps {
  node: OutlineNode;
  depth: number;
  index: number;
  onEdit?: (node: OutlineNode, newTitle: string) => void;
  onDelete?: (node: OutlineNode) => void;
  readOnly?: boolean;
}

const EditableOutlineNode: React.FC<EditableOutlineNodeProps> = ({
  node,
  depth,
  index,
  onEdit,
  onDelete,
  readOnly = false,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(node.title);

  useEffect(() => {
    setEditValue(node.title);
  }, [node.title]);

  const handleSave = () => {
    if (onEdit) {
      onEdit(node, editValue.trim() || node.title);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(node.title);
    setIsEditing(false);
  };

  const getNumberPrefix = (currentDepth: number, currentIndex: number): string => {
    if (currentDepth === 0) {
      return `${currentIndex + 1}. `;
    }
    if (currentDepth === 1) {
      return `${String.fromCharCode(97 + currentIndex)}. `;
    }
    return `${currentIndex + 1}) `;
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
              onBlur={readOnly ? undefined : handleSave}
              onKeyDown={(e) => {
                if (!readOnly && e.key === 'Enter') handleSave();
                if (!readOnly && e.key === 'Escape') handleCancel();
              }}
              className="flex-1 px-2 py-1 border border-blue-500 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              autoFocus
              disabled={readOnly}
            />
          </div>
        ) : (
          <>
            <div
              className={`flex-1 text-gray-800 cursor-text ${
                depth === 0 ? 'text-base font-semibold' : depth === 1 ? 'text-sm font-medium' : 'text-sm'
              }`}
              onClick={() => {
                if (!readOnly) {
                  setIsEditing(true);
                }
              }}
            >
              {node.title}
            </div>
            {!readOnly && (
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
            )}
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
              readOnly={readOnly}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const OutlineConfirm: React.FC<OutlineConfirmProps> = ({
  outline,
  fallbackTitle,
  onConfirm,
  onCancel,
  readOnly = false,
}) => {
  const [outlineNodes, setOutlineNodes] = useState<OutlineNode[]>([]);
  const [title, setTitle] = useState<string>('');

  useEffect(() => {
    const next = splitOutline(outline);
    setOutlineNodes(next.nodes);
    setTitle(next.title || fallbackTitle || extractTitleFromOutline(outline) || '');
  }, [outline, fallbackTitle]);

  const handleEdit = (targetNode: OutlineNode, newTitle: string) => {
    const updateNode = (nodes: OutlineNode[]): OutlineNode[] =>
      nodes.map((node) => {
        if (node === targetNode) {
          return { ...node, title: newTitle };
        }
        if (node.children.length > 0) {
          return { ...node, children: updateNode(node.children) };
        }
        return node;
      });

    setOutlineNodes((prev) => updateNode(prev));
  };

  const handleDelete = (targetNode: OutlineNode) => {
    const removeNode = (nodes: OutlineNode[]): OutlineNode[] =>
      nodes
        .filter((node) => node !== targetNode)
        .map((node) => ({
          ...node,
          children: node.children.length > 0 ? removeNode(node.children) : [],
        }));

    setOutlineNodes((prev) => removeNode(prev));
  };

  const handleConfirm = () => {
    onConfirm(serializeOutline(title, outlineNodes));
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">标题</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="请输入标题"
          disabled={readOnly}
        />
      </div>

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
                readOnly={readOnly}
              />
            ))
          )}
        </div>
      </div>

      {!readOnly && (
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            className="px-6 py-2 text-sm text-white bg-blue-500 rounded-md hover:bg-blue-600 transition-colors"
          >
            基于大纲生成文档
          </button>
        </div>
      )}
    </div>
  );
};
