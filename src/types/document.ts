export type WritingDocumentStatus = 'generating' | 'finished' | 'error';

export interface WritingDocument {
  id: string;
  title: string;
  content: string;
  prompt: string;
  createdAt: number;
  status: WritingDocumentStatus;
  scenarioId?: string;
  errorMessage?: string;
}
