import {
  useMemo,
  useState,
} from "react";

import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleHelp,
  Clock3,
  FileText,
  LoaderCircle,
  Mic2,
  ShieldX,
  X,
} from "lucide-react";

import type {
  VerificationQueueItem,
} from "./useVerificationQueue";

import "./VerificationQueuePanel.css";

interface VerificationQueuePanelProps {
  items: VerificationQueueItem[];
  onLoadExplanation: (
    localId: string,
  ) => Promise<void>;
  onReview: (
    item: VerificationQueueItem,
  ) => void;
  onRemove: (
    localId: string,
  ) => void;
  onClearFinished: () => void;
}

function stageLabel(
  item: VerificationQueueItem,
): string {
  if (
    item.status === "submitting"
  ) {
    return "Submitting";
  }

  switch (item.stage) {
    case "queued":
      return "Pending";
    case "localizing":
      return "Localizing temporal evidence";
    case "collecting_metadata":
      return "Collecting OCR / ASR";
    case "queued_for_vlm":
      return "Waiting for VLM";
    case "verifying":
      return "VLM verifying";
    case "completed":
      return "Completed";
    case "failed":
      return "Failed";
    default:
      return item.status;
  }
}

function decisionIcon(
  item: VerificationQueueItem,
) {
  const status =
    item.job?.verification?.status;

  if (status === "SUPPORTED") {
    return (
      <CheckCircle2 size={16} />
    );
  }

  if (status === "CONFLICT") {
    return (
      <ShieldX size={16} />
    );
  }

  if (status === "UNKNOWN") {
    return (
      <CircleHelp size={16} />
    );
  }

  if (
    item.status === "pending" ||
    item.status === "running" ||
    item.status === "submitting"
  ) {
    return (
      <LoaderCircle
        size={16}
        className="verification-queue__spin"
      />
    );
  }

  return <Clock3 size={16} />;
}

function formatConfidence(
  value:
    | number
    | undefined,
): string {
  if (
    value === undefined ||
    !Number.isFinite(value)
  ) {
    return "";
  }

  return `${Math.round(
    value * 100,
  )}%`;
}

export function VerificationQueuePanel({
  items,
  onLoadExplanation,
  onReview,
  onRemove,
  onClearFinished,
}: VerificationQueuePanelProps) {
  const [collapsed, setCollapsed] =
    useState(false);

  const [
    expandedItemId,
    setExpandedItemId,
  ] = useState<string | null>(
    null,
  );

  const activeCount =
    useMemo(
      () =>
        items.filter(
          (item) =>
            item.status ===
              "pending" ||
            item.status ===
              "running" ||
            item.status ===
              "submitting",
        ).length,
      [items],
    );

  if (items.length === 0) {
    return null;
  }

  return (
    <aside className="verification-queue">
      <header className="verification-queue__header">
        <div>
          <span>
            Independent worker
          </span>
          <strong>
            Verification queue
          </strong>
        </div>

        <div className="verification-queue__header-actions">
          {activeCount > 0 && (
            <span className="verification-queue__active-count">
              {activeCount} active
            </span>
          )}

          <button
            type="button"
            onClick={() =>
              setCollapsed(
                (current) =>
                  !current,
              )
            }
            aria-label={
              collapsed
                ? "Expand verification queue"
                : "Collapse verification queue"
            }
          >
            {collapsed ? (
              <ChevronUp size={17} />
            ) : (
              <ChevronDown size={17} />
            )}
          </button>
        </div>
      </header>

      {!collapsed && (
        <>
          <div className="verification-queue__toolbar">
            <small>
              Search remains usable while GPU 1 verifies queued candidates.
            </small>

            <button
              type="button"
              onClick={
                onClearFinished
              }
            >
              Clear finished
            </button>
          </div>

          <div className="verification-queue__list">
            {items.map(
              (item) => {
                const verification =
                  item.job
                    ?.verification;

                const context =
                  item.job
                    ?.evidence_context;

                const expanded =
                  expandedItemId ===
                  item.localId;

                const canRemove =
                  item.status ===
                    "completed" ||
                  item.status ===
                    "failed";

                return (
                  <article
                    className="verification-queue__item"
                    key={
                      item.localId
                    }
                  >
                    <div className="verification-queue__item-main">
                      <img
                        src={
                          item.result
                            .thumbnail_url
                        }
                        alt=""
                      />

                      <div className="verification-queue__item-copy">
                        <div className="verification-queue__item-title">
                          <strong>
                            {
                              item
                                .result
                                .video_id
                            }
                          </strong>

                          <span>
                            #
                            {
                              item
                                .result
                                .rank
                            }
                          </span>
                        </div>

                        <div
                          className={[
                            "verification-queue__stage",
                            verification
                              ? `verification-queue__stage--${verification.status.toLowerCase()}`
                              : "",
                          ]
                            .filter(
                              Boolean,
                            )
                            .join(" ")}
                        >
                          {decisionIcon(
                            item,
                          )}

                          <span>
                            {verification
                              ? verification.status
                              : stageLabel(
                                  item,
                                )}
                          </span>

                          {verification && (
                            <b>
                              {formatConfidence(
                                verification.confidence,
                              )}
                            </b>
                          )}
                        </div>

                        <p>
                          {
                            item
                              .originalQuery
                          }
                        </p>

                        {(context ||
                          verification) && (
                          <div className="verification-queue__evidence-chips">
                            <span>
                              <FileText
                                size={
                                  12
                                }
                              />
                              OCR{" "}
                              {context
                                ?.ocr
                                ?.length ??
                                verification
                                  ?.ocr_evidence
                                  ?.length ??
                                0}
                            </span>

                            <span>
                              <Mic2
                                size={
                                  12
                                }
                              />
                              ASR{" "}
                              {context
                                ?.asr
                                ?.length ??
                                verification
                                  ?.asr_evidence
                                  ?.length ??
                                0}
                            </span>

                            {verification && (
                              <span>
                                {
                                  verification.num_frames_sent
                                }{" "}
                                frames
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {canRemove && (
                        <button
                          type="button"
                          className="verification-queue__remove"
                          onClick={() =>
                            onRemove(
                              item.localId,
                            )
                          }
                          title="Remove from queue view"
                        >
                          <X
                            size={
                              15
                            }
                          />
                        </button>
                      )}
                    </div>

                    {item.error && (
                      <div className="verification-queue__error">
                        {
                          item.error
                        }
                      </div>
                    )}

                    {verification && (
                      <div className="verification-queue__completed-actions">
                        <button
                          type="button"
                          onClick={() =>
                            onReview(item)
                          }
                        >
                          Open ORIVA detail
                        </button>

                        <button
                          type="button"
                          onClick={async () => {
                            if (
                              !verification.explanation &&
                              item.jobId
                            ) {
                              await onLoadExplanation(
                                item.localId,
                              );
                            }

                            setExpandedItemId(
                              expanded
                                ? null
                                : item.localId,
                            );
                          }}
                        >
                          {expanded
                            ? "Hide quick details"
                            : "Quick details"}
                        </button>

                        <span>
                          {verification.claims.length} claims
                        </span>
                      </div>
                    )}

                    {expanded &&
                      item.job
                        ?.verification && (
                        <div className="verification-queue__details">
                          {item.job
                            .verification
                            .explanation && (
                            <p className="verification-queue__explanation">
                              {
                                item
                                  .job
                                  .verification
                                  .explanation
                              }
                            </p>
                          )}

                          <div className="verification-queue__claims">
                            {item.job.verification.claims.map(
                              (
                                claim,
                                index,
                              ) => (
                                <div
                                  key={`${claim.claim}-${index}`}
                                  className={`verification-queue__claim verification-queue__claim--${claim.status.toLowerCase()}`}
                                >
                                  <strong>
                                    {
                                      claim.status
                                    }
                                  </strong>
                                  <span>
                                    {
                                      claim.claim
                                    }
                                  </span>
                                  {claim.reason && (
                                    <small>
                                      {
                                        claim.reason
                                      }
                                    </small>
                                  )}
                                </div>
                              ),
                            )}
                          </div>

                          {item.job.verification.ocr_evidence.length >
                            0 && (
                            <section className="verification-queue__metadata-block">
                              <strong>
                                OCR evidence
                              </strong>
                              {item.job.verification.ocr_evidence
                                .slice(
                                  0,
                                  4,
                                )
                                .map(
                                  (
                                    evidence,
                                    index,
                                  ) => (
                                    <p
                                      key={`${evidence.timestamp}-${index}`}
                                    >
                                      {evidence.timestamp.toFixed(
                                        1,
                                      )}
                                      s
                                      {evidence.is_anchor
                                        ? " · anchor"
                                        : ""}
                                      {" · "}
                                      {
                                        evidence.text
                                      }
                                    </p>
                                  ),
                                )}
                            </section>
                          )}

                          {item.job.verification.asr_evidence.length >
                            0 && (
                            <section className="verification-queue__metadata-block">
                              <strong>
                                ASR evidence
                              </strong>
                              {item.job.verification.asr_evidence
                                .slice(
                                  0,
                                  4,
                                )
                                .map(
                                  (
                                    evidence,
                                    index,
                                  ) => (
                                    <p
                                      key={`${evidence.start_time}-${index}`}
                                    >
                                      {evidence.start_time.toFixed(
                                        1,
                                      )}
                                      -
                                      {evidence.end_time.toFixed(
                                        1,
                                      )}
                                      s
                                      {" · "}
                                      {
                                        evidence.text
                                      }
                                    </p>
                                  ),
                                )}
                            </section>
                          )}
                        </div>
                      )}
                  </article>
                );
              },
            )}
          </div>
        </>
      )}
    </aside>
  );
}
