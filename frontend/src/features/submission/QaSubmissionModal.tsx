import { useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Send,
  X,
} from "lucide-react";

import {
  submitQaToDres,
} from "../dres/dres.api";

import {
  getDresBridgeToken,
  getDresRunId,
} from "../dres/dres.session";

import "./ManualKisSubmissionModal.css";

interface QaSubmissionModalProps {
  onClose: () => void;
}

export function QaSubmissionModal({
  onClose,
}: QaSubmissionModalProps) {
  const [answer, setAnswer] =
    useState("");

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  const [result, setResult] =
    useState<{
      submission: string;
      description: string;
      answer: string;
      awaitingVerdict: boolean;
    } | null>(null);

  async function handleSubmit() {
    const normalizedAnswer =
      answer.trim();

    if (!normalizedAnswer) {
      setErrorMessage(
        "Answer is required.",
      );
      return;
    }

    const evaluationId =
      getDresRunId().trim();

    const bridgeToken =
      getDresBridgeToken().trim();

    if (!evaluationId) {
      setErrorMessage(
        "DRES Run ID is missing.",
      );
      return;
    }

    if (!bridgeToken) {
      setErrorMessage(
        "DRES is not connected.",
      );
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setResult(null);

    try {
      const response =
        await submitQaToDres(
          evaluationId,
          bridgeToken,
          {
            answer: normalizedAnswer,
          },
        );

      if (response.status !== "ok") {
        throw new Error(
          response.dres_response.description ??
            "DRES rejected the QA submission.",
        );
      }

      const submission =
        response.dres_response.submission ??
        (
          response.dres_http_status === 202
            ? "INDETERMINATE"
            : "ACCEPTED"
        );

      setResult({
        submission,

        description:
          response.dres_response.description ??
          "QA submission sent to DRES.",

        answer: normalizedAnswer,

        awaitingVerdict:
          response.dres_http_status === 202 ||
          submission === "INDETERMINATE",
      });
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to submit QA answer to DRES.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="manual-kis__overlay"
      role="presentation"
    >
      <section
        className="manual-kis"
        role="dialog"
        aria-modal="true"
        aria-labelledby="qa-submission-title"
      >
        <header className="manual-kis__header">
          <div>
            <span className="manual-kis__eyebrow">
              DRES textual submission
            </span>

            <h2 id="qa-submission-title">
              QA submission
            </h2>
          </div>

          <button
            type="button"
            className="manual-kis__close"
            disabled={isSubmitting}
            onClick={onClose}
            aria-label="Close QA submission"
          >
            <X size={20} />
          </button>
        </header>

        <div className="manual-kis__body">
          {result ? (
            <div className="manual-kis__result">
              <CheckCircle2
                size={44}
                className="manual-kis__success-icon"
              />

              <h3>
                {result.awaitingVerdict
                  ? "Submission received"
                  : "Submission completed"}
              </h3>

              <p>
                {result.description}
              </p>

              <dl className="manual-kis__details">
                <div>
                  <dt>DRES result</dt>
                  <dd>
                    {result.submission}
                  </dd>
                </div>

                <div>
                  <dt>Answer</dt>
                  <dd>
                    {result.answer}
                  </dd>
                </div>
              </dl>
            </div>
          ) : (
            <>
              <label className="manual-kis__field">
                <span>Answer</span>

                <input
                  value={answer}
                  onChange={(event) =>
                    setAnswer(
                      event.target.value,
                    )
                  }
                  placeholder="Type your QA answer..."
                  disabled={isSubmitting}
                  autoFocus
                />
              </label>

              <div className="manual-kis__preview">
                DRES textual QA submits the
                answer text only.
              </div>

              {errorMessage && (
                <div
                  className="manual-kis__error"
                  role="alert"
                >
                  <AlertCircle size={18} />
                  <span>
                    {errorMessage}
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        <footer className="manual-kis__footer">
          {result ? (
            <button
              type="button"
              className="manual-kis__primary"
              onClick={onClose}
            >
              Close
            </button>
          ) : (
            <>
              <button
                type="button"
                className="manual-kis__secondary"
                disabled={isSubmitting}
                onClick={onClose}
              >
                Cancel
              </button>

              <button
                type="button"
                className="manual-kis__primary"
                disabled={isSubmitting}
                onClick={handleSubmit}
              >
                <Send size={18} />

                {isSubmitting
                  ? "Submitting..."
                  : "Submit QA to DRES"}
              </button>
            </>
          )}
        </footer>
      </section>
    </div>
  );
}