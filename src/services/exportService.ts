import { marked } from 'marked';

export type ExportFormat = 'word' | 'pdf';

interface ExportDocumentOptions {
  title: string;
  markdown: string;
}

const A4_WIDTH_PX = 794;
const WORD_MIME_TYPE =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

const sanitizeFileName = (name: string): string => {
  const normalized = name.trim().replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, ' ');
  return normalized.slice(0, 80) || '文档';
};

const escapeHtml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const createStyleSheet = (): string => `
  <style>
    .export-article {
      width: 100%;
      box-sizing: border-box;
      padding: 56px;
      background: #ffffff;
      color: #111827;
      line-height: 1.8;
      font-size: 14px;
      font-family: "PingFang SC", "Microsoft YaHei", "Noto Sans SC", Arial, sans-serif;
    }
    .export-article h1,
    .export-article h2,
    .export-article h3,
    .export-article h4,
    .export-article h5,
    .export-article h6 {
      color: #111111;
      font-weight: 700;
      margin: 1.2em 0 0.65em;
      line-height: 1.4;
    }
    .export-article h1 {
      font-size: 30px;
      margin-top: 0;
    }
    .export-article h2 {
      font-size: 24px;
    }
    .export-article h3 {
      font-size: 19px;
    }
    .export-article p {
      margin: 0.55em 0;
      word-break: break-word;
    }
    .export-article ul,
    .export-article ol {
      margin: 0.7em 0;
      padding-left: 1.6em;
    }
    .export-article li {
      margin: 0.25em 0;
    }
    .export-article blockquote {
      margin: 0.85em 0;
      padding: 0.6em 0.9em;
      border-left: 4px solid #cbd5e1;
      background: #f8fafc;
      color: #334155;
    }
    .export-article pre {
      margin: 0.8em 0;
      padding: 0.8em;
      border-radius: 6px;
      overflow-x: auto;
      background: #f3f4f6;
      line-height: 1.6;
      font-size: 13px;
      font-family: "SFMono-Regular", Menlo, Monaco, Consolas, "Liberation Mono", monospace;
    }
    .export-article code {
      font-family: "SFMono-Regular", Menlo, Monaco, Consolas, "Liberation Mono", monospace;
    }
    .export-article table {
      width: 100%;
      border-collapse: collapse;
      margin: 0.9em 0;
      font-size: 13px;
    }
    .export-article th,
    .export-article td {
      border: 1px solid #d1d5db;
      padding: 0.5em 0.6em;
      text-align: left;
      vertical-align: top;
    }
    .export-article th {
      background: #f3f4f6;
      font-weight: 600;
    }
    .export-article hr {
      border: 0;
      border-top: 1px solid #e5e7eb;
      margin: 1.2em 0;
    }
    .export-article img {
      max-width: 100%;
      height: auto;
    }
  </style>
`;

const renderMarkdownArticle = (markdown: string): string => {
  const parsedHtml = marked.parse(markdown, {
    gfm: true,
    breaks: true,
  }) as string;

  return `<article class="export-article">${parsedHtml}</article>`;
};

const buildWordHtmlDocument = (title: string, markdown: string): string =>
  `<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <title>${escapeHtml(title)}</title>
    ${createStyleSheet()}
  </head>
  <body>
    ${renderMarkdownArticle(markdown)}
  </body>
</html>`;

const ensureBlob = (source: Blob | unknown, mimeType: string): Blob => {
  if (source instanceof Blob) {
    return source;
  }

  return new Blob([source as BlobPart], { type: mimeType });
};

const downloadBlob = (blob: Blob, fileName: string): void => {
  const blobUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = blobUrl;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(blobUrl);
};

const waitForImagesLoaded = async (container: HTMLElement): Promise<void> => {
  const images = Array.from(container.querySelectorAll('img'));
  if (images.length === 0) {
    return;
  }

  await Promise.all(
    images.map(
      (image) =>
        new Promise<void>((resolve) => {
          if (image.complete) {
            resolve();
            return;
          }
          image.onload = () => resolve();
          image.onerror = () => resolve();
        })
    )
  );
};

export async function exportToWordDocument({
  title,
  markdown,
}: ExportDocumentOptions): Promise<void> {
  const { asBlob } = await import('html-docx-js-typescript');
  const htmlDocument = buildWordHtmlDocument(title, markdown);
  const blobSource = await asBlob(htmlDocument, {
    orientation: 'portrait',
    margins: {
      top: 720,
      right: 720,
      bottom: 720,
      left: 720,
    },
  });

  const wordBlob = ensureBlob(blobSource, WORD_MIME_TYPE);
  downloadBlob(wordBlob, `${sanitizeFileName(title)}.docx`);
}

export async function exportToPdfDocument({
  title,
  markdown,
}: ExportDocumentOptions): Promise<void> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ]);

  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-10000px';
  container.style.top = '0';
  container.style.width = `${A4_WIDTH_PX}px`;
  container.style.background = '#ffffff';
  container.style.zIndex = '-1';
  container.style.pointerEvents = 'none';
  container.innerHTML = `${createStyleSheet()}${renderMarkdownArticle(markdown)}`;
  document.body.appendChild(container);

  try {
    if (document.fonts?.ready) {
      await document.fonts.ready;
    }
    await waitForImagesLoaded(container);

    const canvas = await html2canvas(container, {
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true,
      allowTaint: true,
      logging: false,
      windowWidth: container.scrollWidth,
      windowHeight: container.scrollHeight,
    });

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4',
      compress: true,
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imageData = canvas.toDataURL('image/png');
    const imageWidth = pageWidth;
    const imageHeight = (canvas.height * imageWidth) / canvas.width;

    let remainingHeight = imageHeight;
    let offsetY = 0;

    pdf.addImage(imageData, 'PNG', 0, offsetY, imageWidth, imageHeight, undefined, 'FAST');
    remainingHeight -= pageHeight;

    while (remainingHeight > 0) {
      offsetY = remainingHeight - imageHeight;
      pdf.addPage();
      pdf.addImage(imageData, 'PNG', 0, offsetY, imageWidth, imageHeight, undefined, 'FAST');
      remainingHeight -= pageHeight;
    }

    pdf.save(`${sanitizeFileName(title)}.pdf`);
  } finally {
    document.body.removeChild(container);
  }
}

export async function exportDocument(
  options: ExportDocumentOptions,
  format: ExportFormat
): Promise<void> {
  if (!options.markdown.trim()) {
    throw new Error('当前文档为空，暂不可导出。');
  }

  if (format === 'word') {
    await exportToWordDocument(options);
    return;
  }

  await exportToPdfDocument(options);
}
