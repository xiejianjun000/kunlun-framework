/**
 * ☯️ TriTai 三才 - 类型定义
 */

export type DetectionType =
  | 'fake_standard_number'
  | 'overly_precise_number'
  | 'time_travel'
  | 'self_contradiction'
  | 'anonymous_authority'
  | 'percentage_sum_exceeded'
  | 'outlier_number'
  | 'suspicious_currency'
  | 'citation_pattern'
  | 'unknown';

export type SeverityLevel = 'low' | 'medium' | 'high' | 'critical';

export interface DetectionRule {
  id: string;
  name: string;
  type: DetectionType;
  baseConfidence: number;
  detect: (text: string) => DetectionResult | null;
}

export interface DetectionResult {
  type: DetectionType;
  confidence: number;
  severity: SeverityLevel;
  match?: string;
  matches?: string[];
  position?: { start: number; end: number };
  description: string;
}

export interface WfgyResult {
  detected: boolean;
  overallConfidence: number;
  severity: SeverityLevel;
  shouldIntercept: boolean;
  detections: DetectionResult[];
  detectedAt: number;
  tokenCount: number;
  evidenceChain: string[];
}

export interface MemoryNode {
  id: string;
  content: string;
  type: 'fact' | 'entity' | 'event' | 'insight';
  embedding?: number[];
  importance: number;
  confidence: number;
  createdAt: number;
  updatedAt: number;
  accessCount: number;
  lastAccessedAt: number;
  tags: string[];
  metadata: Record<string, any>;
}

export interface MemoryEdge {
  id: string;
  source: string;
  target: string;
  type: 'related' | 'causes' | 'implies' | 'contradicts';
  weight: number;
  createdAt: number;
}

export interface TriTaiConfig {
  wfgy: {
    enabled: boolean;
    interceptThreshold: number;
    warningThreshold: number;
    autoInterrupt: boolean;
    showEvidence: boolean;
  };
  memory: {
    enabled: boolean;
    maxNodes: number;
    autoPersist: boolean;
  };
  learning: {
    enabled: boolean;
    autoLearn: boolean;
  };
}
