export type ChatMessageVariant =
  | 'workflow-message'
  | 'agent-config'
  | 'agent-write-confirmation'
  | 'document-card';

export interface AgentConfigSnapshotItem {
  key: string;
  label: string;
  value: string;
  type?: string;
}

export interface AgentConfigSnapshot {
  agentName: string;
  agentDescription: string;
  memoryItems: AgentConfigSnapshotItem[];
  paramItems: AgentConfigSnapshotItem[];
}

export type AgentWriteConfirmationStatus = 'pending' | 'confirmed' | 'cancelled';

export interface AgentWriteConfirmation {
  topic: string;
  agentName: string;
  status: AgentWriteConfirmationStatus;
}
