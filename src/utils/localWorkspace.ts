import type { LocalWorkspaceFileSummary, LocalWorkspaceSelection } from '../types/localWorkspace';

const MAX_TRACKED_FILES = 24;
const MAX_PREVIEW_LENGTH = 480;
const TEXT_FILE_EXTENSIONS = new Set([
  'md',
  'txt',
  'json',
  'csv',
  'ts',
  'tsx',
  'js',
  'jsx',
  'py',
  'java',
  'yml',
  'yaml',
  'html',
  'css',
  'scss',
  'less',
  'sql',
  'xml',
  'log',
]);

function getRelativePath(file: File) {
  return (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;
}

function getExtension(filename: string) {
  const segments = filename.split('.');
  return segments.length > 1 ? segments.pop()?.toLowerCase() || '' : '';
}

function normalizePreviewText(content: string) {
  return content.replace(/\s+/g, ' ').trim().slice(0, MAX_PREVIEW_LENGTH);
}

async function buildFileSummary(file: File): Promise<LocalWorkspaceFileSummary> {
  const relativePath = getRelativePath(file);
  const extension = getExtension(file.name);
  let contentPreview: string | undefined;

  if (TEXT_FILE_EXTENSIONS.has(extension)) {
    try {
      const content = await file.text();
      const normalized = normalizePreviewText(content);
      if (normalized) {
        contentPreview = normalized;
      }
    } catch (error) {
      console.error('读取本地工作空间文件失败:', error);
    }
  }

  return {
    name: file.name,
    relativePath,
    extension,
    size: file.size,
    contentPreview,
  };
}

export async function createLocalWorkspaceSelectionFromFiles(
  inputFiles: FileList | File[]
): Promise<LocalWorkspaceSelection | null> {
  const files = Array.from(inputFiles || []);
  if (files.length === 0) {
    return null;
  }

  const sortedFiles = [...files].sort((left, right) =>
    getRelativePath(left).localeCompare(getRelativePath(right), 'zh-CN')
  );
  const firstRelativePath = getRelativePath(sortedFiles[0]);
  const folderName = firstRelativePath.split('/')[0] || '本地工作空间';
  const trackedFiles = sortedFiles.slice(0, MAX_TRACKED_FILES);
  const fileSummaries = await Promise.all(trackedFiles.map((file) => buildFileSummary(file)));

  return {
    folderName,
    fileCount: sortedFiles.length,
    files: fileSummaries,
    selectedAt: Date.now(),
  };
}

export function isValidLocalWorkspaceSelection(
  value: unknown
): value is LocalWorkspaceSelection {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as LocalWorkspaceSelection;
  return (
    typeof candidate.folderName === 'string' &&
    typeof candidate.fileCount === 'number' &&
    typeof candidate.selectedAt === 'number' &&
    Array.isArray(candidate.files)
  );
}
