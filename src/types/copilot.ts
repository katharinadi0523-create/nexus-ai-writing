export type CopilotIntent =
  | 'edit'
  | 'qa'
  | 'chat'
  | 'restart'
  | 'agent_write_related'
  | 'agent_write_unrelated';

export type CopilotProgressIntent = CopilotIntent | 'unknown';
export type CopilotProgressStage =
  | 'routing'
  | 'locating'
  | 'rewriting'
  | 'retrieving'
  | 'answering'
  | 'planning'
  | 'chatting'
  | 'drafting';

export interface CopilotProgressState {
  intent: CopilotProgressIntent;
  stage: CopilotProgressStage;
}

export type CopilotEditStatus = 'ready' | 'needs_clarification';

export interface CopilotEditPayload {
  status: CopilotEditStatus;
  sectionTitle?: string;
  targetText?: string;
  replacementText?: string;
}

export interface CopilotResponse {
  intent: CopilotIntent;
  reply: string;
  edit?: CopilotEditPayload;
  topic?: string;
}

export interface PendingCopilotEdit {
  instruction: string;
  sectionTitle?: string;
  targetText: string;
  replacementText: string;
}
