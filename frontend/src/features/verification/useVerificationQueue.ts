import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type {
  SearchResult,
} from "../search/search.types";

import {
  getVerificationJob,
  getVerificationJobs,
  submitVerification,
} from "./verification.api";

import type {
  VerificationJobResponse,
  VerificationSummary,
} from "./verification.types";

export interface VerificationQueueItem {
  localId: string;
  key: string;
  searchId: string;
  result: SearchResult;
  originalQuery: string;

  jobId?: string;
  status:
    | "submitting"
    | "pending"
    | "running"
    | "completed"
    | "failed";

  stage?: string | null;
  error?: string | null;
  job?: VerificationJobResponse;
}

const POLL_INTERVAL_MS = 1000;

function createLocalId(): string {
  if (
    typeof globalThis.crypto !== "undefined" &&
    typeof globalThis.crypto.randomUUID === "function"
  ) {
    return globalThis.crypto.randomUUID();
  }

  return `verify-${Date.now()}-${Math.random()
    .toString(16)
    .slice(2)}`;
}

export function verificationCandidateKey(
  searchId: string,
  result: SearchResult,
): string {
  return [
    searchId,
    result.video_id,
    result.frame_index,
    result.matched_scene,
  ].join(":");
}

export function verificationIntentKey(
  searchId: string,
  result: SearchResult,
  originalQuery: string,
): string {
  const normalizedIntent =
    originalQuery
      .trim()
      .replace(/\s+/g, " ")
      .toLocaleLowerCase();

  return [
    verificationCandidateKey(
      searchId,
      result,
    ),
    normalizedIntent,
  ].join("|");
}

interface QueueCandidateInput {
  searchId: string;
  result: SearchResult;
  originalQuery: string;
}

export function useVerificationQueue() {
  const [items, setItems] =
    useState<VerificationQueueItem[]>([]);

  const pollingRef = useRef(false);

  const queueCandidate = useCallback(
    async ({
      searchId,
      result,
      originalQuery,
    }: QueueCandidateInput) => {
      const frameRef =
        result.frame_ref?.trim() ?? "";

      const normalizedOriginal =
        originalQuery.trim();

      if (!frameRef) {
        return;
      }

      if (!normalizedOriginal) {
        return;
      }

      const key =
        verificationIntentKey(
          searchId,
          result,
          normalizedOriginal,
        );

      const existing = items.find(
        (item) =>
          item.key === key &&
          item.status !== "failed",
      );

      if (existing) {
        return;
      }

      const localId =
        createLocalId();

      setItems((current) => [
        {
          localId,
          key,
          searchId,
          result,
          originalQuery:
            normalizedOriginal,
          status: "submitting",
          stage: "submitting",
        },
        ...current,
      ]);

      try {
        const submitted =
          await submitVerification({
            search_id: searchId,
            frame_ref: frameRef,
            original_query:
              normalizedOriginal,
            max_frames: 3,
            include_ocr: true,
            include_asr: true,
          });

        setItems((current) =>
          current.map((item) =>
            item.localId === localId
              ? {
                  ...item,
                  jobId:
                    submitted.job_id,
                  status:
                    submitted.status,
                  stage:
                    submitted.stage,
                  error: null,
                }
              : item,
          ),
        );
      } catch (error) {
        setItems((current) =>
          current.map((item) =>
            item.localId === localId
              ? {
                  ...item,
                  status: "failed",
                  stage: "failed",
                  error:
                    error instanceof Error
                      ? error.message
                      : "Could not queue verification.",
                }
              : item,
          ),
        );
      }
    },
    [items],
  );

  useEffect(() => {
    const activeItems =
      items.filter(
        (item) =>
          Boolean(item.jobId) &&
          (
            item.status === "pending" ||
            item.status === "running"
          ),
      );

    if (
      activeItems.length === 0 ||
      pollingRef.current
    ) {
      return;
    }

    let cancelled = false;
    let timerId:
      | number
      | undefined;

    async function poll() {
      if (cancelled) {
        return;
      }

      pollingRef.current = true;

      try {
        const activeSnapshot =
          activeItems.filter(
            (item) =>
              Boolean(item.jobId),
          );

        const jobs =
          await getVerificationJobs(
            activeSnapshot.map(
              (item) =>
                item.jobId!,
            ),
          );

        if (cancelled) {
          return;
        }

        const jobsById =
          new Map(
            jobs.map((job) => [
              job.job_id,
              job,
            ]),
          );

        setItems((current) =>
          current.map((item) => {
            if (!item.jobId) {
              return item;
            }

            const job =
              jobsById.get(
                item.jobId,
              );

            if (!job) {
              return item;
            }

            return {
              ...item,
              status:
                job.status,
              stage:
                job.stage,
              error:
                job.error,
              job,
            };
          }),
        );
      } finally {
        pollingRef.current = false;

        if (!cancelled) {
          timerId =
            window.setTimeout(
              () => {
                void poll();
              },
              POLL_INTERVAL_MS,
            );
        }
      }
    }

    timerId =
      window.setTimeout(
        () => {
          void poll();
        },
        250,
      );

    return () => {
      cancelled = true;
      pollingRef.current = false;

      if (
        timerId !== undefined
      ) {
        window.clearTimeout(
          timerId,
        );
      }
    };
  }, [items]);

  const loadExplanation =
    useCallback(
      async (
        localId: string,
      ) => {
        const item =
          items.find(
            (candidate) =>
              candidate.localId ===
              localId,
          );

        if (!item?.jobId) {
          return;
        }

        const job =
          await getVerificationJob(
            item.jobId,
            true,
          );

        setItems((current) =>
          current.map((candidate) =>
            candidate.localId ===
            localId
              ? {
                  ...candidate,
                  status:
                    job.status,
                  stage:
                    job.stage,
                  error:
                    job.error,
                  job,
                }
              : candidate,
          ),
        );
      },
      [items],
    );

  const removeItem =
    useCallback(
      (localId: string) => {
        setItems((current) =>
          current.filter(
            (item) =>
              item.localId !==
              localId,
          ),
        );
      },
      [],
    );

  const clearFinished =
    useCallback(() => {
      setItems((current) =>
        current.filter(
          (item) =>
            item.status ===
              "pending" ||
            item.status ===
              "running" ||
            item.status ===
              "submitting",
        ),
      );
    }, []);

  const summaryByKey =
    useMemo(() => {
      const output:
        Record<
          string,
          VerificationSummary
        > = {};

      for (const item of items) {
        const verification =
          item.job?.verification;

        if (
          item.status !==
            "completed" ||
          !item.jobId ||
          !verification
        ) {
          continue;
        }

        output[item.key] = {
          status:
            verification.status,
          confidence:
            verification.confidence,
          jobId:
            item.jobId,
          numFramesSent:
            verification.num_frames_sent,
          latencyMs:
            verification.latency_ms,
        };
      }

      return output;
    }, [items]);

  const stateByKey =
    useMemo(() => {
      const output:
        Record<
          string,
          VerificationQueueItem
        > = {};

      for (const item of items) {
        if (
          !output[item.key] ||
          output[item.key]
            .status === "failed"
        ) {
          output[item.key] =
            item;
        }
      }

      return output;
    }, [items]);

  return {
    items,
    queueCandidate,
    loadExplanation,
    removeItem,
    clearFinished,
    summaryByKey,
    stateByKey,
  };
}
