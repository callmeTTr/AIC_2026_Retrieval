export type SubmissionTaskType =
  | "KIS"
  | "QA"
  | "TRAKE";

export interface FrameLocator {
  videoId: string;
  frameIndex: number;

  fps?: number | null;
  timestampSeconds?: number | null;
}

export interface KisSubmissionCandidate {
  taskType: "KIS";

  queryId?: string;

  frame: FrameLocator;
}

export interface QaSubmissionCandidate {
  taskType: "QA";

  queryId?: string;

  answer: string;

  /**
   * Optional retrieval evidence.
   *
   * Some competition formats may require a frame,
   * while DRES textual QA only submits the answer text.
   */
  evidenceFrame?: FrameLocator;
}

export interface TrakeSubmissionCandidate {
  taskType: "TRAKE";

  queryId?: string;

  events: FrameLocator[];
}

export type CanonicalSubmissionCandidate =
  | KisSubmissionCandidate
  | QaSubmissionCandidate
  | TrakeSubmissionCandidate;