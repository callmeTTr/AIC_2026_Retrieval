import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
} from "react";

import {
  AlertTriangle,
  CheckCircle2,
  CircleHelp,
  Clock3,
  Eye,
  Gauge,
  LoaderCircle,
  Play,
  ScanSearch,
  ShieldCheck,
  ShieldX,
  TimerReset,
  X,
} from "lucide-react";

import type {
  SearchResult,
} from "../search/search.types";

import {
  getVerificationJob,
  localizeTemporalEvidence,
  submitVerification,
} from "./verification.api";

import type {
  TemporalLocalizeResponse,
  VerificationJobResponse,
  VerificationSummary,
} from "./verification.types";

import "./VerificationModal.css";

interface VerificationModalProps {
  searchId: string;
  result: SearchResult;
  originalQuery?: string;
  initialVerification?: VerificationSummary;
  onClose: () => void;
  onVerificationComplete?: (
    summary: VerificationSummary,
  ) => void;
}

const POLL_INTERVAL_MS = 1200;

function formatTime(
  seconds: number | null | undefined,
): string {
  if (
    seconds === null ||
    seconds === undefined ||
    !Number.isFinite(seconds)
  ) {
    return "—";
  }

  const safeSeconds = Math.max(
    0,
    seconds,
  );
  const minutes = Math.floor(
    safeSeconds / 60,
  );
  const remaining =
    safeSeconds - minutes * 60;

  return `${minutes
    .toString()
    .padStart(2, "0")}:${remaining
    .toFixed(1)
    .padStart(4, "0")}`;
}

function formatLatency(
  latencyMs: number | null | undefined,
): string {
  if (
    latencyMs === null ||
    latencyMs === undefined ||
    !Number.isFinite(latencyMs)
  ) {
    return "—";
  }

  if (latencyMs < 1000) {
    return `${Math.round(latencyMs)} ms`;
  }

  return `${(
    latencyMs / 1000
  ).toFixed(2)} s`;
}

function sourceLabel(source: "visual" | "ocr" | "asr"): string {
  if (source === "visual") return "Visual";
  if (source === "ocr") return "OCR";
  return "ASR";
}

function statusClass(status: string): string {
  return status.toLowerCase();
}

export function VerificationModal({
  searchId,
  result,
  originalQuery = "",
  initialVerification,
  onClose,
  onVerificationComplete,
}: VerificationModalProps) {
  const [localization, setLocalization] =
    useState<TemporalLocalizeResponse | null>(
      null,
    );
  const [localizationError, setLocalizationError] =
    useState<string | null>(null);
  const [isLocalizing, setIsLocalizing] =
    useState(true);

  const [verificationJob, setVerificationJob] =
    useState<VerificationJobResponse | null>(
      null,
    );
  const [verificationError, setVerificationError] =
    useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] =
    useState(false);
  const [isLoadingExplanation, setIsLoadingExplanation] =
    useState(false);

  const closedRef = useRef(false);
  const completedJobRef = useRef<string | null>(
    null,
  );

  const frameRef = result.frame_ref?.trim() ?? "";

  const activeSegment =
    verificationJob?.segment ??
    localization?.segment ??
    null;

  const verification =
    verificationJob?.verification ?? null;

  const displayedOriginalIntent =
    verification?.original_query?.trim() ||
    verificationJob?.original_query?.trim() ||
    originalQuery.trim();

  const displayedSearchQuery =
    verification?.search_query?.trim() ||
    verificationJob?.search_query?.trim() ||
    localization?.query?.trim() ||
    "—";

  const isVerificationActive =
    verificationJob?.status === "pending" ||
    verificationJob?.status === "running" ||
    isSubmitting;

  const evidenceFrameRefs = useMemo(
    () =>
      new Set(
        verification?.evidence
          .map((item) => item.frame_ref)
          .filter(
            (
              value,
            ): value is string =>
              Boolean(value),
          ) ?? [],
      ),
    [verification],
  );

  const loadLocalization = useCallback(
    async () => {
      if (!frameRef) {
        setLocalizationError(
          "This result does not contain a live frame reference.",
        );
        setIsLocalizing(false);
        return;
      }

      setLocalizationError(null);
      setIsLocalizing(true);

      try {
        const response =
          await localizeTemporalEvidence({
            search_id: searchId,
            frame_ref: frameRef,
          });

        if (!closedRef.current) {
          setLocalization(response);
        }
      } catch (error) {
        if (!closedRef.current) {
          setLocalizationError(
            error instanceof Error
              ? error.message
              : "Temporal localization failed.",
          );
        }
      } finally {
        if (!closedRef.current) {
          setIsLocalizing(false);
        }
      }
    }, [frameRef, searchId],
  );

  useEffect(() => {
    closedRef.current = false;
    void loadLocalization();

    return () => {
      closedRef.current = true;
    };
  }, [loadLocalization]);

  useEffect(() => {
    if (!initialVerification?.jobId) {
      return;
    }

    let cancelled = false;

    async function restoreVerification() {
      try {
        const job = await getVerificationJob(
          initialVerification!.jobId,
          false,
        );

        if (!cancelled) {
          setVerificationJob(job);
        }
      } catch {
        // Verification jobs are in-memory backend state. If the backend
        // restarted, keep the card summary but allow a fresh verification.
      }
    }

    void restoreVerification();

    return () => {
      cancelled = true;
    };
  }, [initialVerification?.jobId]);

  useEffect(() => {
    const jobId = verificationJob?.job_id;
    const jobStatus = verificationJob?.status;

    if (
      !jobId ||
      (jobStatus !== "pending" &&
        jobStatus !== "running")
    ) {
      return;
    }

    let cancelled = false;
    let timerId: number | undefined;

    async function poll() {
      try {
        const nextJob =
          await getVerificationJob(
            jobId!,
            false,
          );

        if (cancelled) {
          return;
        }

        setVerificationJob(nextJob);

        if (nextJob.status === "failed") {
          setVerificationError(
            nextJob.error ||
              "Verification failed.",
          );
          return;
        }

        if (
          nextJob.status === "pending" ||
          nextJob.status === "running"
        ) {
          timerId = window.setTimeout(
            () => void poll(),
            POLL_INTERVAL_MS,
          );
        }
      } catch (error) {
        if (!cancelled) {
          setVerificationError(
            error instanceof Error
              ? error.message
              : "Unable to poll verification status.",
          );
        }
      }
    }

    timerId = window.setTimeout(
      () => void poll(),
      POLL_INTERVAL_MS,
    );

    return () => {
      cancelled = true;
      if (timerId !== undefined) {
        window.clearTimeout(timerId);
      }
    };
  }, [verificationJob?.job_id]);

  useEffect(() => {
    const jobId =
      verificationJob?.job_id;
    const currentVerification =
      verificationJob?.verification;

    if (
      verificationJob?.status !==
        "completed" ||
      !jobId ||
      !currentVerification ||
      completedJobRef.current === jobId
    ) {
      return;
    }

    completedJobRef.current = jobId;

    onVerificationComplete?.({
      status: currentVerification.status,
      confidence:
        currentVerification.confidence,
      jobId,
      numFramesSent:
        currentVerification.num_frames_sent,
      latencyMs:
        currentVerification.latency_ms,
    });
  }, [
    onVerificationComplete,
    verificationJob,
  ]);

  useEffect(() => {
    function handleKeyDown(
      event: KeyboardEvent,
    ) {
      if (
        event.key === "Escape" &&
        !isVerificationActive
      ) {
        onClose();
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [isVerificationActive, onClose]);

  async function handleVerify() {
    if (!frameRef || isVerificationActive) {
      return;
    }

    const verificationIntent =
      originalQuery.trim();

    if (!verificationIntent) {
      setVerificationError(
        "Enter the Original verification intent before verifying.",
      );
      return;
    }

    setVerificationError(null);
    setIsSubmitting(true);
    completedJobRef.current = null;

    try {
      const submitted =
        await submitVerification({
          search_id: searchId,
          frame_ref: frameRef,
          original_query:
            verificationIntent,
          max_frames: 3,
          include_ocr: true,
          include_asr: true,
        });

      setVerificationJob({
        job_id: submitted.job_id,
        status: "pending",
        stage: "queued",
        search_id: submitted.search_id,
        frame_ref: submitted.frame_ref,
        original_query:
          submitted.original_query,
        search_query:
          submitted.search_query,
        max_frames: 3,
        temporal_cache_hit: null,
        error: null,
      });
    } catch (error) {
      setVerificationError(
        error instanceof Error
          ? error.message
          : "Could not submit verification.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleShowExplanation() {
    const jobId = verificationJob?.job_id;

    if (!jobId || isLoadingExplanation) {
      return;
    }

    setIsLoadingExplanation(true);
    setVerificationError(null);

    try {
      const explainedJob =
        await getVerificationJob(
          jobId,
          true,
        );

      setVerificationJob(explainedJob);
    } catch (error) {
      setVerificationError(
        error instanceof Error
          ? error.message
          : "Could not load the cached explanation.",
      );
    } finally {
      setIsLoadingExplanation(false);
    }
  }

  function handleOverlayClick(
    event: MouseEvent<HTMLDivElement>,
  ) {
    if (
      event.target === event.currentTarget &&
      !isVerificationActive
    ) {
      onClose();
    }
  }

  const decisionIcon =
    verification?.status === "SUPPORTED" ? (
      <CheckCircle2 size={20} />
    ) : verification?.status === "CONFLICT" ? (
      <ShieldX size={20} />
    ) : (
      <CircleHelp size={20} />
    );

  const playbackUrl =
    activeSegment?.video_url &&
    activeSegment.start_time !== undefined
      ? `${activeSegment.video_url}#t=${Math.max(
          0,
          activeSegment.start_time,
        ).toFixed(2)}`
      : null;

  return (
    <div
      className="verification-modal__overlay"
      role="presentation"
      onMouseDown={handleOverlayClick}
    >
      <section
        className="verification-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="verification-modal-title"
      >
        <header className="verification-modal__header">
          <div>
            <span className="verification-modal__eyebrow">
              Post-retrieval evidence
            </span>
            <h2 id="verification-modal-title">
              Temporal evidence & verification
            </h2>
            <p>
              {result.video_id} · frame {result.frame_index} · rank #{result.rank}
            </p>
          </div>

          <button
            type="button"
            className="verification-modal__close"
            aria-label="Close verification dialog"
            disabled={isVerificationActive}
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </header>

        <div className="verification-modal__body">
          <section className="verification-modal__context-grid">
            <article className="verification-modal__anchor">
              <div className="verification-modal__anchor-image">
                <img
                  src={result.thumbnail_url}
                  alt={`Retrieved anchor from ${result.video_id}`}
                />
                <span className="verification-modal__anchor-badge">
                  Anchor cᵢ
                </span>
              </div>
              <div className="verification-modal__anchor-copy">
                <span>Selected anchor frame</span>
                <strong>
                  {result.video_id} · {formatTime(
                    result.frame_timestamp_seconds ??
                      result.timestamp_seconds,
                  )}
                </strong>
                <small>
                  Rank #{result.rank} · frame {result.frame_index}. The green outline marks the retrieved frame used to initialize temporal evidence localization.
                </small>
              </div>
            </article>

            <div className="verification-modal__query-context">
              <article className="verification-modal__query-card verification-modal__query-card--original">
                <span>Original verification intent qₒ</span>
                <p>{displayedOriginalIntent || "No original intent provided."}</p>
              </article>
              <article className="verification-modal__query-card verification-modal__query-card--search">
                <span>Search query qₛ</span>
                <p>{displayedSearchQuery}</p>
              </article>
            </div>
          </section>

          <section className="verification-modal__section">
            <header className="verification-modal__section-header">
              <div>
                <span>Stage 1 · Anchor-conditioned localization</span>
                <h3>Localized temporal evidence around cᵢ</h3>
              </div>

              {localization?.cache_hit && (
                <span className="verification-modal__cache-badge">
                  cached
                </span>
              )}
            </header>

            {isLocalizing && (
              <div className="verification-modal__loading-row">
                <LoaderCircle
                  className="verification-modal__spinner"
                  size={20}
                />
                Localizing evidence around the anchor...
              </div>
            )}

            {localizationError && (
              <div className="verification-modal__error" role="alert">
                <AlertTriangle size={18} />
                <div>
                  <strong>Localization failed</strong>
                  <span>{localizationError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => void loadLocalization()}
                >
                  Retry
                </button>
              </div>
            )}

            {activeSegment && (
              <>
                <div className="verification-modal__segment-stats">
                  <div>
                    <Clock3 size={17} />
                    <span>Window</span>
                    <strong>
                      {formatTime(activeSegment.start_time)} → {formatTime(activeSegment.end_time)}
                    </strong>
                  </div>
                  <div>
                    <TimerReset size={17} />
                    <span>Duration</span>
                    <strong>
                      {activeSegment.duration.toFixed(1)} s
                    </strong>
                  </div>
                  <div>
                    <ScanSearch size={17} />
                    <span>Frames</span>
                    <strong>
                      {activeSegment.frame_count}
                    </strong>
                  </div>
                  <div>
                    <Gauge size={17} />
                    <span>Shots</span>
                    <strong>
                      {activeSegment.left_shot ?? "?"} → {activeSegment.right_shot ?? "?"}
                    </strong>
                  </div>
                </div>

                <div className="verification-modal__timeline-heading">
                  <div>
                    <strong>Localized segment Sᵢ</strong>
                    <span>
                      {formatTime(activeSegment.start_time)} → {formatTime(activeSegment.end_time)}
                    </span>
                  </div>
                  <div className="verification-modal__timeline-legend">
                    <span className="verification-modal__legend verification-modal__legend--anchor">Anchor</span>
                    <span className="verification-modal__legend verification-modal__legend--evidence">VLM evidence</span>
                  </div>
                </div>

                <div className="verification-modal__timeline">
                  {activeSegment.frames.map((frame) => {
                    const isEvidence =
                      evidenceFrameRefs.has(
                        frame.frame_ref,
                      );

                    return (
                      <article
                        key={frame.frame_ref}
                        className={[
                          "verification-modal__timeline-frame",
                          frame.is_anchor
                            ? "verification-modal__timeline-frame--anchor"
                            : "",
                          isEvidence
                            ? "verification-modal__timeline-frame--evidence"
                            : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        <img
                          src={
                            frame.thumbnail_url ??
                            frame.image_url
                          }
                          alt={`Evidence frame at ${frame.timestamp_seconds.toFixed(1)} seconds`}
                          loading="lazy"
                        />
                        <div>
                          <strong>
                            {formatTime(frame.timestamp_seconds)}
                          </strong>
                          <span>
                            Shot {frame.shot_id ?? "—"}
                          </span>
                        </div>
                        {frame.is_anchor && (
                          <em className="verification-modal__frame-badge verification-modal__frame-badge--anchor">
                            Anchor
                          </em>
                        )}
                        {isEvidence && (
                          <em className="verification-modal__frame-badge verification-modal__frame-badge--evidence">
                            VLM evidence
                          </em>
                        )}
                      </article>
                    );
                  })}
                </div>

                {playbackUrl && (
                  <a
                    className="verification-modal__play-link"
                    href={playbackUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Play size={17} />
                    Open localized segment
                  </a>
                )}
              </>
            )}
          </section>

          <section className="verification-modal__section verification-modal__section--verification">
            <header className="verification-modal__section-header">
              <div>
                <span>Stage 2 · Original-intent verification</span>
                <h3>Claim-level verification result</h3>
              </div>

              {verificationJob?.status && (
                <span
                  className={`verification-modal__job-badge verification-modal__job-badge--${verificationJob.status}`}
                >
                  {verificationJob.status}
                </span>
              )}
            </header>

            {!verificationJob && (
              <p className="verification-modal__verification-note">
                Verification is selective. Qwen receives only 3 compact evidence frames after you request it.
              </p>
            )}

            {isVerificationActive && (
              <div className="verification-modal__loading-row">
                <LoaderCircle
                  className="verification-modal__spinner"
                  size={20}
                />
                {verificationJob?.stage === "verifying"
                  ? "Qwen is checking compact temporal evidence on GPU 1..."
                  : "Verification is queued..."}
              </div>
            )}

            {verificationError && (
              <div className="verification-modal__error" role="alert">
                <AlertTriangle size={18} />
                <div>
                  <strong>Verification error</strong>
                  <span>{verificationError}</span>
                </div>
              </div>
            )}

            {verification && (
              <div
                className={`verification-modal__decision verification-modal__decision--${verification.status.toLowerCase()}`}
              >
                <div className="verification-modal__decision-icon">
                  {decisionIcon}
                </div>
                <div>
                  <span>Decision</span>
                  <strong>{verification.status}</strong>
                </div>
                <div>
                  <span>Confidence</span>
                  <strong>
                    {Math.round(
                      verification.confidence * 100,
                    )}%
                  </strong>
                </div>
                <div>
                  <span>Evidence</span>
                  <strong>
                    {verification.num_frames_sent} frames
                  </strong>
                </div>
                <div>
                  <span>Latency</span>
                  <strong>
                    {formatLatency(
                      verification.latency_ms,
                    )}
                  </strong>
                </div>
              </div>
            )}

            {verification?.claims &&
              verification.claims.length > 0 && (
                <div className="verification-modal__claims">
                  <div className="verification-modal__claims-header">
                    <div>
                      <span>Atomic requirements from qₒ</span>
                      <strong>Claim-by-claim evidence grounding</strong>
                    </div>
                    <small>
                      {verification.claims.length} claim{verification.claims.length === 1 ? "" : "s"}
                    </small>
                  </div>

                  <div className="verification-modal__claims-list">
                    {verification.claims.map((claim, index) => (
                      <article
                        key={`${claim.claim}-${index}`}
                        className={`verification-modal__claim verification-modal__claim--${statusClass(claim.status)}`}
                      >
                        <div className="verification-modal__claim-index">
                          C{index + 1}
                        </div>
                        <div className="verification-modal__claim-main">
                          <strong>{claim.claim}</strong>
                          <p>{claim.reason}</p>
                          {(claim.evidence_text?.length ?? 0) > 0 && (
                            <div className="verification-modal__claim-evidence-text">
                              {claim.evidence_text.slice(0, 2).map((text, evidenceIndex) => (
                                <span key={`${text}-${evidenceIndex}`}>“{text}”</span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="verification-modal__claim-meta">
                          <span
                            className={`verification-modal__claim-status verification-modal__claim-status--${statusClass(claim.status)}`}
                          >
                            {claim.status}
                          </span>
                          <div className="verification-modal__source-chips">
                            {claim.sources.map((source) => (
                              <span key={source}>{sourceLabel(source)}</span>
                            ))}
                          </div>
                          {claim.evidence_frames.length > 0 && (
                            <small>
                              Frames {claim.evidence_frames.map((frameId) => `F${frameId}`).join(", ")}
                            </small>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              )}

            {(verification?.ocr_evidence?.length ?? 0) > 0 ||
            (verification?.asr_evidence?.length ?? 0) > 0 ? (
              <div className="verification-modal__text-evidence">
                <div className="verification-modal__text-evidence-column">
                  <span>OCR evidence</span>
                  {(verification?.ocr_evidence ?? []).slice(0, 3).map((item, index) => (
                    <article key={`ocr-${item.timestamp}-${index}`}>
                      <strong>{formatTime(item.timestamp)}</strong>
                      <p>{item.text}</p>
                    </article>
                  ))}
                  {(verification?.ocr_evidence?.length ?? 0) === 0 && <small>No OCR evidence used.</small>}
                </div>
                <div className="verification-modal__text-evidence-column">
                  <span>ASR evidence</span>
                  {(verification?.asr_evidence ?? []).slice(0, 3).map((item, index) => (
                    <article key={`asr-${item.start_time}-${index}`}>
                      <strong>
                        {formatTime(item.start_time)}–{formatTime(item.end_time)}
                      </strong>
                      <p>{item.text}</p>
                    </article>
                  ))}
                  {(verification?.asr_evidence?.length ?? 0) === 0 && <small>No ASR evidence used.</small>}
                </div>
              </div>
            ) : null}

            {verification?.evidence &&
              verification.evidence.length > 0 && (
                <div className="verification-modal__vlm-evidence">
                  {verification.evidence.map((item) => (
                    <article key={`${item.frame_id}-${item.timestamp}`}>
                      {(item.thumbnail_url || item.image_url) && (
                        <img
                          src={item.thumbnail_url ?? item.image_url}
                          alt={`VLM evidence ${item.frame_id}`}
                        />
                      )}
                      <div>
                        <strong>Frame F{item.frame_id}</strong>
                        <span>
                          {formatTime(item.timestamp)} · shot {item.shot_id ?? "—"}
                        </span>
                      </div>
                    </article>
                  ))}
                </div>
              )}

            {verification?.explanation && (
              <div className="verification-modal__explanation">
                <span>Why?</span>
                <p>{verification.explanation}</p>
              </div>
            )}
          </section>
        </div>

        <footer className="verification-modal__footer">
          <div>
            {verification?.has_explanation &&
              !verification.explanation && (
                <button
                  type="button"
                  className="verification-modal__button verification-modal__button--secondary"
                  disabled={isLoadingExplanation}
                  onClick={() => void handleShowExplanation()}
                >
                  {isLoadingExplanation ? (
                    <LoaderCircle
                      className="verification-modal__spinner"
                      size={17}
                    />
                  ) : (
                    <Eye size={17} />
                  )}
                  Why?
                </button>
              )}
          </div>

          <div className="verification-modal__footer-actions">
            <button
              type="button"
              className="verification-modal__button verification-modal__button--secondary"
              disabled={isVerificationActive}
              onClick={onClose}
            >
              Close
            </button>

            {!verification && (
              <button
                type="button"
                className="verification-modal__button verification-modal__button--primary"
                disabled={
                  !activeSegment ||
                  !frameRef ||
                  isVerificationActive
                }
                onClick={() => void handleVerify()}
              >
                {isVerificationActive ? (
                  <LoaderCircle
                    className="verification-modal__spinner"
                    size={18}
                  />
                ) : (
                  <ShieldCheck size={18} />
                )}
                {isVerificationActive
                  ? "Verifying..."
                  : "Verify with 3 frames"}
              </button>
            )}
          </div>
        </footer>
      </section>
    </div>
  );
}
