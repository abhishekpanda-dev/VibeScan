export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      findings: {
        Row: {
          category: string;
          created_at: string;
          cvss_score: string | null;
          data_exposed: string | null;
          description: string;
          evidence: Json | null;
          exploitability: string | null;
          fix_markdown: string | null;
          id: string;
          icon: string | null;
          location: string | null;
          owasp: string | null;
          scan_id: string;
          severity: string;
          title: string;
        };
        Insert: {
          category: string;
          created_at?: string;
          cvss_score?: string | null;
          data_exposed?: string | null;
          description: string;
          evidence?: Json | null;
          exploitability?: string | null;
          fix_markdown?: string | null;
          id?: string;
          icon?: string | null;
          location?: string | null;
          owasp?: string | null;
          scan_id: string;
          severity: string;
          title: string;
        };
        Update: {
          category?: string;
          created_at?: string;
          cvss_score?: string | null;
          data_exposed?: string | null;
          description?: string;
          evidence?: Json | null;
          exploitability?: string | null;
          fix_markdown?: string | null;
          id?: string;
          icon?: string | null;
          location?: string | null;
          owasp?: string | null;
          scan_id?: string;
          severity?: string;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "findings_scan_id_fkey";
            columns: ["scan_id"];
            isOneToOne: false;
            referencedRelation: "scans";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          email: string;
          id: string;
          scan_credits: number;
          subscription_status: string;
          subscription_tier: string;
        };
        Insert: {
          created_at?: string;
          email: string;
          id: string;
          scan_credits?: number;
          subscription_status?: string;
          subscription_tier?: string;
        };
        Update: {
          created_at?: string;
          email?: string;
          id?: string;
          scan_credits?: number;
          subscription_status?: string;
          subscription_tier?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey";
            columns: ["id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      scans: {
        Row: {
          critical_count: number;
          completed_at: string | null;
          created_at: string;
          high_count: number;
          id: string;
          low_count: number;
          medium_count: number;
          pass_count: number;
          scan_domain: string | null;
          scan_error: string | null;
          security_score: number;
          security_grade: string | null;
          started_at: string | null;
          status: string;
          total_findings: number;
          url: string;
          user_id: string;
        };
        Insert: {
          critical_count?: number;
          completed_at?: string | null;
          created_at?: string;
          high_count?: number;
          id?: string;
          low_count?: number;
          medium_count?: number;
          pass_count?: number;
          scan_domain?: string | null;
          scan_error?: string | null;
          security_score?: number;
          security_grade?: string | null;
          started_at?: string | null;
          status?: string;
          total_findings?: number;
          url: string;
          user_id: string;
        };
        Update: {
          critical_count?: number;
          completed_at?: string | null;
          created_at?: string;
          high_count?: number;
          id?: string;
          low_count?: number;
          medium_count?: number;
          pass_count?: number;
          scan_domain?: string | null;
          scan_error?: string | null;
          security_score?: number;
          security_grade?: string | null;
          started_at?: string | null;
          status?: string;
          total_findings?: number;
          url?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "scans_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      get_share_report: {
        Args: {
          requested_scan_id: string;
        };
        Returns: Json;
      };
      start_scan: {
        Args: {
          scan_url: string;
        };
        Returns: {
          credits_deducted: boolean;
          remaining_credits: number;
          scan_id: string;
        }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Scan = Database["public"]["Tables"]["scans"]["Row"];
export type Finding = Database["public"]["Tables"]["findings"]["Row"];
export type ScanStatus = "pending" | "running" | "complete" | "failed";
export type SeverityLevel = "critical" | "high" | "medium" | "low" | "info";
export type SeverityCounts = Record<SeverityLevel, number>;
export type FindingConfidenceLevel = "high" | "medium" | "low";
export type FindingValidationState = "confirmed" | "likely" | "review";

export type ScanSummary = {
  createdAt: string;
  criticalFindings: number;
  findingsCount: number;
  highFindings: number;
  id: string;
  mediumFindings: number;
  securityScore: number;
  status: ScanStatus;
  url: string;
};

export type ReportFindingConfidence = {
  label: FindingConfidenceLevel;
  rationale: string;
  score: number;
};

export type ReportFinding = {
  affectedPath: string | null;
  affectedTarget: string;
  category: string;
  checkId: string;
  checkLabel: string;
  confidence: ReportFindingConfidence;
  cwe: string[];
  description: string;
  evidence: string | null;
  fixMarkdown: string | null;
  impact: string;
  id: string;
  location: string | null;
  owasp: string[];
  remediationSteps: string[];
  remediationSummary: string;
  reproductionSteps: string[];
  riskExplanation: string;
  scanId: string;
  severity: SeverityLevel;
  technicalEvidence: string;
  topRiskScore: number;
  title: string;
  validationState: FindingValidationState;
  whyItWasCreated: string;
};

export type ReportDistributionItem = {
  color: string;
  label: string;
  value: number;
};

export type ReportScorePenalty = {
  count: number;
  label: string;
  penaltyPerItem: number;
  severity: Exclude<SeverityLevel, "info">;
  totalPenalty: number;
};

export type ReportScoreBreakdown = {
  baseScore: number;
  finalScore: number;
  penalties: ReportScorePenalty[];
  totalPenalty: number;
};

export type ReportExecutiveSummary = {
  criticalFindings: number;
  highFindings: number;
  lowFindings: number;
  passedChecks: number;
  primaryMessage: string;
  riskLevel: string;
  securityScore: number;
  topCategories: string[];
  totalFindings: number;
  mediumFindings: number;
};

export type PublicShareReport = {
  counts: SeverityCounts;
  findings: ReportFinding[];
  scan: {
    completedAt: string | null;
    createdAt: string;
    id: string;
    passCount: number;
    securityScore: number;
    status: ScanStatus;
    url: string;
  };
};
