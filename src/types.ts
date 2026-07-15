/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'ADMIN' | 'ANALYST' | 'VIEWER';
export type SentimentType = 'POS' | 'NEU' | 'NEG';
export type FeedbackStatus = 'NEW' | 'REVIEWED' | 'ACTIONED';

export interface Workspace {
  id: string;
  name: string;
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  workspaceId: string;
}

export interface Feedback {
  id: string;
  content: string;
  channel: string;
  sourceRef: string;
  customerLabel: string;
  sentiment: SentimentType;
  sentimentScore: number; // -1 to 1
  status: FeedbackStatus;
  createdAt: string;
  workspaceId: string;
  themes: string[]; // Store theme names/ids
  embedding?: number[]; // Vector embeddings for Ask LOOP Q&A
  featureArea: string;
  rationale: string;
}

export interface Theme {
  id: string;
  name: string;
  description: string;
  color: string;
  workspaceId: string;
}

export interface Report {
  id: string;
  title: string;
  periodStart: string;
  periodEnd: string;
  contentJson: string; // JSON string of the report sections (themes, quotes, narrative, actions)
  createdAt: string;
  workspaceId: string;
  generatedBy: string; // User ID
  generatorName: string; // User name
}

export interface Session {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    workspaceId: string;
    workspaceName: string;
  };
  expiresAt: string;
}
