import "server-only";

// Shapes we read from Parallel's Task API (docs.parallel.ai task-api, plan P-7).
// `title` on a citation is not in the documented schema but appears in real output: optional.

export interface Citation {
  url: string;
  excerpts: string[] | null;
  title?: string | null;
}

export interface BasisEntry {
  field: string;
  citations: Citation[];
  reasoning?: string | null;
  confidence?: string | null;
}

export type TaskRunStatus =
  | "queued"
  | "action_required"
  | "running"
  | "completed"
  | "failed"
  | "cancelling"
  | "cancelled";

export interface TaskRun {
  run_id: string;
  status: TaskRunStatus;
  is_active: boolean;
  processor?: string;
  created_at?: string | null;
  modified_at?: string | null;
  error?: { message?: string } | null;
  metadata?: Record<string, unknown> | null;
}

export interface TaskRunResult {
  run: TaskRun;
  output: {
    type?: string;
    content: Record<string, unknown>;
    basis: BasisEntry[];
  };
}

export interface TaskGroupStatus {
  taskgroup_id: string;
  status: {
    is_active: boolean;
    task_run_status_counts?: Partial<Record<TaskRunStatus, number>> | null;
    num_task_runs?: number | null;
  };
}

export type Processor = "ultra" | "core";

export interface TaskSpec {
  input_schema?: { type: "json"; json_schema: Record<string, unknown> };
  output_schema: { type: "json"; json_schema: Record<string, unknown> };
}

export interface RunInput {
  input: Record<string, unknown>;
  processor: Processor;
  metadata?: Record<string, string>;
}
