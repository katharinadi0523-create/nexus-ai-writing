import React from 'react';
import { CheckCircle2, Download, FileText, Sparkles } from 'lucide-react';
import {
  QUARTERLY_REPORT_DEMO_TITLE,
  QUARTERLY_REPORT_FINAL_DOCX_PUBLIC_PATH,
  QUARTERLY_REPORT_FINAL_EDITOR_DOCUMENT_TITLE,
  QUARTERLY_REPORT_FINAL_DOCX_PREVIEW_IMAGE_PATH,
} from '../constants/quarterly-report-flow-data';

interface QuarterlyReportPreviewPanelProps {
  currentStep: number;
  previewContent: string;
}

export const QuarterlyReportPreviewPanel: React.FC<QuarterlyReportPreviewPanelProps> = ({
  currentStep,
  previewContent,
}) => {
  const panelTitle =
    currentStep >= 9
      ? QUARTERLY_REPORT_FINAL_EDITOR_DOCUMENT_TITLE
      : QUARTERLY_REPORT_DEMO_TITLE;

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)]">
      <div className="border-b border-slate-200 bg-white/85 px-6 py-4 backdrop-blur-sm">
        <div className="text-xl font-semibold text-slate-900">{panelTitle}</div>
        <div className="mt-1 text-sm text-slate-500">
          {currentStep >= 9 ? '已生成 Word 文档预览，可直接导出或下载文件。' : '当前内容将随写作进度逐步生成并更新。'}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {currentStep < 5 ? (
          <div className="mx-auto max-w-3xl rounded-[28px] border border-slate-200 bg-white p-8 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.35)]">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <div className="text-lg font-semibold text-slate-900">等待生成</div>
                <div className="text-sm text-slate-500">模板已经锁定，正在确认汇报周期与数据纳入范围。</div>
              </div>
            </div>
            <div className="mt-6 grid gap-3 md:grid-cols-3">
              {['模板结构已确认', '等待澄清写作参数', '正式文稿暂未展开'].map((item) => (
                <div key={item} className="rounded-2xl bg-slate-50 px-4 py-4 text-sm font-medium text-slate-600">
                  {item}
                </div>
              ))}
            </div>
          </div>
        ) : currentStep < 9 ? (
          <div className="mx-auto max-w-4xl space-y-5">
            <div className="rounded-[28px] border border-slate-200 bg-white p-8 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.35)]">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
                  <Sparkles className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-lg font-semibold text-slate-900">正在组织文稿结构</div>
                  <div className="text-sm text-slate-500">经营分析结果、知识依据与本地工作空间材料正在合并进模板结构中。</div>
                </div>
              </div>
              <div className="mt-6 grid gap-3 md:grid-cols-2">
                {[
                  '管理汇报摘要区',
                  '经营数据分析章节',
                  '本地材料融合区',
                  '重点工作与亮点',
                  '问题与风险章节',
                ].map((item) => (
                  <div key={item} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-600">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-4xl space-y-5">
            <div className="rounded-[28px] border border-emerald-200 bg-white p-8 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.35)]">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-slate-900">Word 文档已生成</div>
                    <div className="text-sm text-slate-500">已生成《{QUARTERLY_REPORT_FINAL_EDITOR_DOCUMENT_TITLE}》并可直接导出。</div>
                  </div>
                </div>
                <a
                  href={QUARTERLY_REPORT_FINAL_DOCX_PUBLIC_PATH}
                  download={QUARTERLY_REPORT_FINAL_EDITOR_DOCUMENT_TITLE}
                  className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-100"
                >
                  <Download className="h-4 w-4" />
                  下载 Word
                </a>
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.35)]">
              <div className="flex items-center gap-3 rounded-[24px] border border-slate-200 bg-slate-50 px-5 py-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
                  <FileText className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-base font-semibold text-slate-900">
                    {QUARTERLY_REPORT_FINAL_EDITOR_DOCUMENT_TITLE}.docx
                  </div>
                  <div className="mt-1 text-sm text-slate-500">Word 文档，已写入最终 mock 内容</div>
                </div>
                <div className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-500">
                  DOCX
                </div>
              </div>

              <div className="mt-6 flex justify-center">
                <div className="w-full max-w-[840px] rounded-[28px] bg-[#dbe7f7] p-6 shadow-inner">
                  <div className="overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-[0_24px_60px_-36px_rgba(15,23,42,0.42)]">
                    <img
                      src={QUARTERLY_REPORT_FINAL_DOCX_PREVIEW_IMAGE_PATH}
                      alt={QUARTERLY_REPORT_FINAL_EDITOR_DOCUMENT_TITLE}
                      className="block h-auto w-full"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
