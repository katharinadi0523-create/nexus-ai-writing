import React, { useRef, useEffect, useState, useCallback } from 'react';
import { WritingState } from '../types/writing';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { Markdown } from 'tiptap-markdown';

interface EditorProps {
  content: string;
  writingState: WritingState;
  onContentChange?: (content: string) => void;
}

export const Editor: React.FC<EditorProps> = ({ content, writingState, onContentChange }) => {
  const [selectedHeading, setSelectedHeading] = useState<string>('H1');
  const [selectedFontSize, setSelectedFontSize] = useState<string>('16');
  const lastSyncedContentRef = useRef<string>(content);
  const debounceTimerRef = useRef<number | null>(null);
  const isGeneratingRef = useRef<boolean>(false);
  
  const isGenerating = writingState === WritingState.GENERATING;
  isGeneratingRef.current = isGenerating;

  // 初始化 TipTap 编辑器
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // 禁用一些不需要的功能
        codeBlock: false,
        blockquote: false,
      }),
      Underline,
      Markdown.configure({
        // Markdown 配置
        html: true,
        transformPastedText: true,
        transformCopiedText: true,
      }),
    ],
    content: content || '',
    editorProps: {
      attributes: {
        class: 'prose prose-lg max-w-none min-h-full outline-none p-6 text-base leading-relaxed text-gray-900 font-sans focus:outline-none',
      },
    },
    onUpdate: ({ editor }) => {
      if (!isGeneratingRef.current && onContentChange) {
        // 获取 Markdown 内容
        const markdown = (editor.storage as any).markdown?.getMarkdown() || '';
        
        // 防抖同步
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
        
        debounceTimerRef.current = window.setTimeout(() => {
          if (markdown !== lastSyncedContentRef.current) {
            lastSyncedContentRef.current = markdown;
            onContentChange(markdown);
          }
        }, 500);
      }
    },
  });

  // 同步外部 content 到编辑器（仅在非用户编辑时）
  useEffect(() => {
    if (!editor) return;

    // 如果内容没有变化，不更新
    if (content === lastSyncedContentRef.current) {
      return;
    }

    // 获取当前编辑器的 Markdown 内容
    const currentMarkdown = (editor.storage as any).markdown?.getMarkdown() || '';
    
    // 如果内容相同，不更新
    if (content === currentMarkdown) {
      lastSyncedContentRef.current = content;
      return;
    }

    if (isGenerating) {
      // 流式输出模式：如果新内容更长，说明有新增内容
      if (content.length > currentMarkdown.length && content.startsWith(currentMarkdown)) {
        // 追加新内容部分
        const newContent = content.slice(currentMarkdown.length);
        if (newContent.trim()) {
          // 将光标移到末尾，然后插入内容
          const endPos = editor.state.doc.content.size;
          editor.commands.setTextSelection(endPos);
          // TipTap 的 Markdown 扩展会自动处理 Markdown 格式
          editor.commands.insertContent(newContent);
          lastSyncedContentRef.current = content;
        }
      } else {
        // 如果内容结构发生变化，重新设置完整内容
        editor.commands.setContent(content);
        lastSyncedContentRef.current = content;
      }
    } else {
      // 非流式输出模式：设置完整内容
      // TipTap 的 setContent 可以接受 Markdown 字符串（通过 Markdown 扩展）
      editor.commands.setContent(content);
      lastSyncedContentRef.current = content;
    }
  }, [content, isGenerating, editor]);

  // 获取状态栏文本
  const getStatusText = () => {
    switch (writingState) {
      case WritingState.THINKING:
        return '✨ 思考中...';
      case WritingState.OUTLINE_CONFIRM:
        return '📍 大纲确认中...';
      case WritingState.GENERATING:
        return '✍️ 内容生成中...';
      default:
        return null;
    }
  };

  const statusText = getStatusText();

  // 工具栏功能实现 - 使用 TipTap API
  const handleFormat = useCallback((format: 'bold' | 'italic' | 'underline' | 'strike') => {
    if (!editor) return;

    editor.chain().focus();
    
    switch (format) {
      case 'bold':
        editor.chain().focus().toggleBold().run();
        break;
      case 'italic':
        editor.chain().focus().toggleItalic().run();
        break;
      case 'underline':
        editor.chain().focus().toggleUnderline().run();
        break;
      case 'strike':
        editor.chain().focus().toggleStrike().run();
        break;
    }
  }, [editor]);

  const handleHeadingChange = useCallback((heading: string) => {
    if (!editor) return;

    setSelectedHeading(heading);
    const level = parseInt(heading.replace('H', ''));
    
    editor.chain().focus().toggleHeading({ level: level as 1 | 2 | 3 | 4 | 5 | 6 }).run();
  }, [editor]);

  const handleAlignment = useCallback((_align: 'left' | 'center' | 'right') => {
    if (!editor) return;
    // TipTap StarterKit 不包含 text-align 扩展，暂时移除对齐功能
    // 如果需要对齐功能，需要安装 @tiptap/extension-text-align
  }, [editor]);

  const handleList = useCallback((ordered: boolean) => {
    if (!editor) return;

    if (ordered) {
      editor.chain().focus().toggleOrderedList().run();
    } else {
      editor.chain().focus().toggleBulletList().run();
    }
  }, [editor]);

  const handleUndo = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().undo().run();
  }, [editor]);

  const handleRedo = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().redo().run();
  }, [editor]);

  const handleHighlight = useCallback(() => {
    if (!editor) return;
    // TipTap StarterKit 不包含 highlight 扩展
    // 如果需要高亮功能，需要安装 @tiptap/extension-highlight
    // 暂时使用背景色模拟
    document.execCommand('backColor', false, '#fef08a');
  }, [editor]);

  // 清理防抖定时器
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  if (!editor) {
    return null;
  }

  return (
    <div className="h-full flex flex-col bg-white relative overflow-hidden">
      {/* 工具栏 */}
      <div className="border-b border-gray-200 px-4 py-2 flex items-center gap-2 flex-wrap overflow-x-auto">
        {/* 撤销/重做 */}
        <button 
          onClick={handleUndo}
          className="p-2 hover:bg-gray-100 rounded" 
          title="撤销"
          disabled={!editor.can().undo()}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
          </svg>
        </button>
        <button 
          onClick={handleRedo}
          className="p-2 hover:bg-gray-100 rounded" 
          title="重做"
          disabled={!editor.can().redo()}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
          </svg>
        </button>

        <div className="w-px h-6 bg-gray-300 mx-1"></div>

        {/* 标题级别 */}
        <select 
          value={selectedHeading}
          onChange={(e) => handleHeadingChange(e.target.value)}
          className="px-2 py-1 border border-gray-300 rounded text-sm"
        >
          <option>H1</option>
          <option>H2</option>
          <option>H3</option>
          <option>H4</option>
          <option>H5</option>
        </select>

        {/* 字体 */}
        <select className="px-2 py-1 border border-gray-300 rounded text-sm">
          <option>默认字体</option>
        </select>

        {/* 字号 */}
        <select 
          value={selectedFontSize}
          onChange={(e) => setSelectedFontSize(e.target.value)}
          className="px-2 py-1 border border-gray-300 rounded text-sm"
        >
          <option>14</option>
          <option>16</option>
          <option>18</option>
          <option>20</option>
          <option>24</option>
        </select>

        <div className="w-px h-6 bg-gray-300 mx-1"></div>

        {/* 格式化按钮 */}
        <button 
          onClick={() => handleFormat('bold')}
          className={`p-2 hover:bg-gray-100 rounded font-bold ${editor.isActive('bold') ? 'bg-gray-200' : ''}`}
          title="粗体"
        >
          B
        </button>
        <button 
          onClick={() => handleFormat('strike')}
          className={`p-2 hover:bg-gray-100 rounded line-through ${editor.isActive('strike') ? 'bg-gray-200' : ''}`}
          title="删除线"
        >
          S
        </button>
        <button 
          onClick={() => handleFormat('underline')}
          className={`p-2 hover:bg-gray-100 rounded underline ${editor.isActive('underline') ? 'bg-gray-200' : ''}`}
          title="下划线"
        >
          U
        </button>
        <button 
          onClick={() => handleFormat('italic')}
          className={`p-2 hover:bg-gray-100 rounded italic ${editor.isActive('italic') ? 'bg-gray-200' : ''}`}
          title="斜体"
        >
          I
        </button>

        {/* 高亮 */}
        <button 
          onClick={handleHighlight}
          className="p-2 hover:bg-gray-100 rounded" 
          title="高亮"
        >
          <span className="text-sm font-bold" style={{ backgroundColor: '#fef08a', padding: '2px 4px' }}>A</span>
        </button>

        <div className="w-px h-6 bg-gray-300 mx-1"></div>

        {/* 对齐 */}
        <button 
          onClick={() => handleAlignment('left')}
          className="p-2 hover:bg-gray-100 rounded"
          title="左对齐"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
          </svg>
        </button>
        <button 
          onClick={() => handleAlignment('center')}
          className="p-2 hover:bg-gray-100 rounded"
          title="居中"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <button 
          onClick={() => handleAlignment('right')}
          className="p-2 hover:bg-gray-100 rounded"
          title="右对齐"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
          </svg>
        </button>

        <div className="w-px h-6 bg-gray-300 mx-1"></div>

        {/* 列表 */}
        <button 
          onClick={() => handleList(false)}
          className={`p-2 hover:bg-gray-100 rounded ${editor.isActive('bulletList') ? 'bg-gray-200' : ''}`}
          title="无序列表"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <button 
          onClick={() => handleList(true)}
          className={`p-2 hover:bg-gray-100 rounded ${editor.isActive('orderedList') ? 'bg-gray-200' : ''}`}
          title="有序列表"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
          </svg>
        </button>

        {/* 全屏 */}
        <div className="flex-1"></div>
        <button className="p-2 hover:bg-gray-100 rounded" title="全屏">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
        </button>
      </div>

      {/* 编辑器内容区域 - 使用 TipTap EditorContent */}
      <div className="flex-1 overflow-y-auto">
        <EditorContent editor={editor} />
      </div>

      {/* 底部状态栏 */}
      {statusText && (
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-10">
          <div className="bg-gray-800 text-white px-6 py-2 rounded-full flex items-center gap-2 shadow-lg">
            <span>{statusText}</span>
            <button className="ml-2 hover:bg-gray-700 rounded px-2 py-1 text-sm">
              停止
            </button>
          </div>
        </div>
      )}

      {/* 自定义样式：确保 prose 样式正确应用 */}
      <style>{`
        .ProseMirror {
          outline: none;
          min-height: 100%;
          padding: 1.5rem;
          font-size: 1rem;
          line-height: 1.75;
          color: #111827;
          font-family: inherit;
        }

        .ProseMirror:focus {
          outline: none;
        }

        .ProseMirror p {
          margin-top: 0.75rem;
          margin-bottom: 0.75rem;
        }

        .ProseMirror h1 {
          font-size: 2.25rem;
          font-weight: 700;
          line-height: 1.2;
          margin-top: 2rem;
          margin-bottom: 1rem;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid #e5e7eb;
          color: #111827;
        }

        .ProseMirror h2 {
          font-size: 1.875rem;
          font-weight: 700;
          line-height: 1.3;
          margin-top: 1.5rem;
          margin-bottom: 0.75rem;
          color: #111827;
        }

        .ProseMirror h3 {
          font-size: 1.5rem;
          font-weight: 700;
          line-height: 1.4;
          margin-top: 1rem;
          margin-bottom: 0.5rem;
          color: #111827;
        }

        .ProseMirror h4 {
          font-size: 1.25rem;
          font-weight: 700;
          line-height: 1.5;
          margin-top: 0.75rem;
          margin-bottom: 0.5rem;
          color: #111827;
        }

        .ProseMirror h5 {
          font-size: 1.125rem;
          font-weight: 700;
          line-height: 1.6;
          margin-top: 0.5rem;
          margin-bottom: 0.25rem;
          color: #111827;
        }

        .ProseMirror ul,
        .ProseMirror ol {
          margin-top: 0.75rem;
          margin-bottom: 0.75rem;
          padding-left: 1.5rem;
        }

        .ProseMirror li {
          margin-top: 0.25rem;
          margin-bottom: 0.25rem;
        }

        .ProseMirror strong {
          font-weight: 700;
        }

        .ProseMirror em {
          font-style: italic;
        }

        .ProseMirror u {
          text-decoration: underline;
        }

        .ProseMirror s {
          text-decoration: line-through;
        }
      `}</style>
    </div>
  );
};
