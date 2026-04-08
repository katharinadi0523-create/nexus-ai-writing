export interface LocalWorkspaceFileSummary {
  name: string;
  relativePath: string;
  extension: string;
  size: number;
  contentPreview?: string;
}

export interface LocalWorkspaceSelection {
  folderName: string;
  fileCount: number;
  files: LocalWorkspaceFileSummary[];
  selectedAt: number;
}
