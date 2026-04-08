import React, { useEffect, useState } from 'react';
import { Check, Sparkles, Star, X } from 'lucide-react';
import {
  afCuratedTemplateGroups,
  getWritingTemplateById,
  organizationTemplates,
  WritingTemplate,
  WritingTemplateTabId,
} from '../constants/writingTemplates';

interface WritingTemplateModalProps {
  isOpen: boolean;
  initialSelectedTemplateId?: string | null;
  initialFavoriteTemplateIds?: string[];
  onClose: () => void;
  onConfirm: (payload: {
    selectedTemplateId: string | null;
    favoriteTemplateIds: string[];
  }) => void;
}

const templateTabs: Array<{ id: WritingTemplateTabId; label: string; hint: string }> = [
  {
    id: 'af-curated',
    label: 'AF平台精选',
    hint: '平台预置的高频格式模板',
  },
  {
    id: 'organization',
    label: '组织模板',
    hint: '团队沉淀的内部模板',
  },
  {
    id: 'favorite',
    label: '收藏',
    hint: '你标记过的模板',
  },
];

function TemplateCard({
  template,
  isSelected,
  isFavorite,
  onSelect,
  onFavoriteToggle,
}: {
  template: WritingTemplate;
  isSelected: boolean;
  isFavorite: boolean;
  onSelect: (templateId: string) => void;
  onFavoriteToggle: (templateId: string) => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(template.id)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect(template.id);
        }
      }}
      className={`group flex h-full flex-col rounded-2xl border p-4 text-left transition-all ${
        isSelected
          ? 'border-blue-500 bg-blue-50 shadow-[0_16px_36px_-30px_rgba(37,99,235,0.85)]'
          : 'border-slate-200 bg-white hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_18px_34px_-28px_rgba(15,23,42,0.45)]'
      }`}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-500">
            {template.categoryLabel || '模板'}
          </span>
          {template.accentLabel ? (
            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700">
              {template.accentLabel}
            </span>
          ) : null}
        </div>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onFavoriteToggle(template.id);
          }}
          className={`rounded-full border p-1.5 transition-colors ${
            isFavorite
              ? 'border-amber-200 bg-amber-50 text-amber-500 hover:bg-amber-100'
              : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300 hover:text-slate-600'
          }`}
          title={isFavorite ? '取消收藏' : '加入收藏'}
        >
          <Star className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
        </button>
      </div>
      <div className="mb-2 text-base font-semibold text-slate-800">{template.name}</div>
      <p className="flex-1 text-sm leading-6 text-slate-500">{template.description}</p>
      <div className="mt-4 flex items-center justify-between">
        <span className="text-xs text-slate-400">
          {template.source === 'af-curated' ? 'AF 平台模板' : '组织内部模板'}
        </span>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
            isSelected ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-500'
          }`}
        >
          {isSelected ? <Check className="h-3.5 w-3.5" /> : null}
          {isSelected ? '已选中' : '点击选择'}
        </span>
      </div>
    </div>
  );
}

export const WritingTemplateModal: React.FC<WritingTemplateModalProps> = ({
  isOpen,
  initialSelectedTemplateId = null,
  initialFavoriteTemplateIds = [],
  onClose,
  onConfirm,
}) => {
  const [activeTab, setActiveTab] = useState<WritingTemplateTabId>('af-curated');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(initialSelectedTemplateId);
  const [favoriteTemplateIds, setFavoriteTemplateIds] = useState<string[]>(initialFavoriteTemplateIds);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setSelectedTemplateId(initialSelectedTemplateId);
    setFavoriteTemplateIds(initialFavoriteTemplateIds);

    if (initialSelectedTemplateId && initialFavoriteTemplateIds.includes(initialSelectedTemplateId)) {
      setActiveTab('favorite');
      return;
    }

    const selectedTemplate = getWritingTemplateById(initialSelectedTemplateId);
    if (selectedTemplate?.source === 'organization') {
      setActiveTab('organization');
      return;
    }

    setActiveTab('af-curated');
  }, [initialFavoriteTemplateIds, initialSelectedTemplateId, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const favoriteTemplates = favoriteTemplateIds
    .map((templateId) => getWritingTemplateById(templateId))
    .filter((template): template is WritingTemplate => Boolean(template));

  if (!isOpen) {
    return null;
  }

  const selectedTemplate = getWritingTemplateById(selectedTemplateId);

  const toggleFavoriteTemplate = (templateId: string) => {
    setFavoriteTemplateIds((prev) =>
      prev.includes(templateId)
        ? prev.filter((item) => item !== templateId)
        : [...prev, templateId]
    );
  };

  const renderTemplateGrid = (templates: WritingTemplate[]) => {
    if (templates.length === 0) {
      return (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-10 text-center">
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm">
            <Star className="h-5 w-5" />
          </div>
          <div className="text-sm font-medium text-slate-600">收藏夹还是空的</div>
          <div className="mt-1 text-sm text-slate-400">
            在模板卡片右上角点星标，就可以把常用格式放到这里。
          </div>
        </div>
      );
    }

    return (
      <div className="grid gap-4 md:grid-cols-2">
        {templates.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            isSelected={selectedTemplateId === template.id}
            isFavorite={favoriteTemplateIds.includes(template.id)}
            onSelect={setSelectedTemplateId}
            onFavoriteToggle={toggleFavoriteTemplate}
          />
        ))}
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 px-6 py-8"
      onClick={onClose}
    >
      <div
        className="flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-[28px] border border-white/70 bg-white shadow-[0_32px_80px_-42px_rgba(15,23,42,0.7)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-slate-200 bg-[linear-gradient(135deg,rgba(248,250,252,0.98),rgba(255,251,235,0.88))] px-6 py-5">
          <div className="flex items-start justify-between gap-6">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/75 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.24em] text-slate-400">
                <Sparkles className="h-3.5 w-3.5" />
                写作模板
              </div>
              <h2 className="text-2xl font-semibold text-slate-800">选择本次写作的格式模板</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                模板主要用于约束文章结构、格式口径和常见段落组织方式，便于后续进入迭代版能力时统一输出风格。
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-slate-200 bg-white p-2 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            {templateTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'border-blue-500 bg-blue-500 text-white shadow-[0_12px_30px_-24px_rgba(37,99,235,0.9)]'
                    : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
            <div className="text-sm text-slate-400">
              {templateTabs.find((tab) => tab.id === activeTab)?.hint}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-slate-50/60 px-6 py-6">
          <div className="mb-6 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">当前选择</div>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <div className="text-sm font-semibold text-slate-700">
                {selectedTemplate ? selectedTemplate.name : '未选择模板'}
              </div>
              <div className="text-sm text-slate-400">
                {selectedTemplate
                  ? selectedTemplate.description
                  : '保持为空时，会继续沿用当前版本的默认写作方式。'}
              </div>
            </div>
          </div>

          {activeTab === 'af-curated' ? (
            <div className="space-y-5">
              {afCuratedTemplateGroups.map((group) => (
                <section
                  key={group.id}
                  className="rounded-[24px] border border-slate-200 bg-white px-5 py-5 shadow-sm"
                >
                  <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <div className="text-xs font-medium uppercase tracking-[0.24em] text-slate-400">
                        AF 平台精选
                      </div>
                      <h3 className="mt-2 text-xl font-semibold text-slate-800">{group.label}</h3>
                      <p className="mt-1 text-sm text-slate-500">{group.description}</p>
                    </div>
                    <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
                      {group.templates.length} 套模板
                    </div>
                  </div>
                  {renderTemplateGrid(group.templates)}
                </section>
              ))}
            </div>
          ) : null}

          {activeTab === 'organization' ? (
            <section className="rounded-[24px] border border-slate-200 bg-white px-5 py-5 shadow-sm">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <div className="text-xs font-medium uppercase tracking-[0.24em] text-slate-400">
                    组织模板
                  </div>
                  <h3 className="mt-2 text-xl font-semibold text-slate-800">团队沉淀的内部模板</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    这里先 mock 了一组组织常用模板，后续可以接真实模板中心与权限体系。
                  </p>
                </div>
                <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
                  {organizationTemplates.length} 套模板
                </div>
              </div>
              {renderTemplateGrid(organizationTemplates)}
            </section>
          ) : null}

          {activeTab === 'favorite' ? (
            <section className="rounded-[24px] border border-slate-200 bg-white px-5 py-5 shadow-sm">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <div className="text-xs font-medium uppercase tracking-[0.24em] text-slate-400">
                    收藏
                  </div>
                  <h3 className="mt-2 text-xl font-semibold text-slate-800">你的常用模板</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    把高频模板收藏起来，后续在迭代版本里可以更快复用固定格式。
                  </p>
                </div>
                <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
                  {favoriteTemplates.length} 套模板
                </div>
              </div>
              {renderTemplateGrid(favoriteTemplates)}
            </section>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-6 py-4">
          <button
            type="button"
            onClick={() => setSelectedTemplateId(null)}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-700"
          >
            不使用模板
          </button>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-700"
            >
              取消
            </button>
            <button
              type="button"
              onClick={() =>
                onConfirm({
                  selectedTemplateId,
                  favoriteTemplateIds,
                })
              }
              className="rounded-full bg-slate-900 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800"
            >
              确认模板
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
