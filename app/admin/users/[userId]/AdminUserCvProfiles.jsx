"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { requestJson } from "@/lib/job-tracker/client/api.js";

const MIN_REASON_LENGTH = 10;
const MAX_REASON_LENGTH = 500;
const MIN_SCORE = 0;
const MAX_SCORE = 100;

function formatDate(value) {
  if (!value) return "Not available";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function gradeBadge(gradingMode) {
  if (gradingMode === "admin-override") {
    return {
      label: "Admin override",
      className:
        "border-forge-orange bg-orange-soft text-forge-orange",
    };
  }
  return {
    label: "AI generated",
    className:
      "border-success-green bg-cyan-soft text-success-green",
  };
}

function parseScore(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export default function AdminUserCvProfiles({
  profiles = [],
  targetUserId = "",
  currentAdminId = "",
}) {
  const router = useRouter();
  const [overrideTarget, setOverrideTarget] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");

  const closeModal = () => {
    setOverrideTarget(null);
  };

  const handleSuccess = (profileTitle) => {
    closeModal();
    setSuccessMessage(`Override applied to "${profileTitle}".`);
    router.refresh();
    if (typeof window !== "undefined") {
      window.setTimeout(() => setSuccessMessage(""), 3500);
    }
  };

  return (
    <>
      {successMessage ? (
        <div
          role="status"
          className="rounded-2xl border border-success-green bg-cyan-soft px-4 py-3 text-sm font-semibold text-success-green"
        >
          {successMessage}
        </div>
      ) : null}

      <section className="rounded-[2rem] border border-border bg-surface p-8 shadow-sm">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-blue">
            Professional Profiles
          </p>
          <h2 className="text-2xl font-bold text-navy">
            CV workspaces connected to this user
          </h2>
        </div>

        {profiles.length === 0 ? (
          <div className="mt-6 rounded-3xl border border-dashed border-border bg-background p-8 text-center text-sm text-text-muted">
            This account does not have any CV profiles yet.
          </div>
        ) : (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {profiles.map((profile) => {
              const latest = profile.latestAnalysis;
              const badge = latest ? gradeBadge(latest.gradingMode) : null;
              return (
                <article
                  key={profile._id}
                  className="rounded-3xl border border-border bg-background p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-bold text-navy">{profile.title}</h3>
                      <p className="mt-1 text-sm text-text-muted">
                        {profile.targetRole ||
                          profile.professionalNiche ||
                          "No target role set yet"}
                      </p>
                    </div>
                    {profile.isDefault ? (
                      <span className="rounded-full bg-cyan-soft px-3 py-1 text-xs font-semibold text-success-green">
                        Default
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-5 flex items-center gap-3">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-border">
                      <div
                        className="h-full rounded-full bg-success-green"
                        style={{
                          width: `${Math.min(100, profile.completionScore)}%`,
                        }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-navy">
                      {profile.completionScore}%
                    </span>
                  </div>

                  <div className="mt-5 rounded-2xl border border-border bg-surface p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                        Latest CV review
                      </p>
                      {badge ? (
                        <span
                          className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${badge.className}`}
                        >
                          {badge.label}
                        </span>
                      ) : null}
                    </div>

                    {latest ? (
                      <div className="mt-3 space-y-1 text-sm">
                        <p className="text-text-main">
                          Overall:{" "}
                          <span className="font-semibold text-navy">
                            {latest.overallScore ?? "—"}
                          </span>{" "}
                          / {MAX_SCORE}
                          {latest.atsScore != null ? (
                            <>
                              {" "}
                              · ATS:{" "}
                              <span className="font-semibold text-navy">
                                {latest.atsScore}
                              </span>{" "}
                              / {MAX_SCORE}
                            </>
                          ) : null}
                        </p>
                        {latest.lastEditedReason ? (
                          <p className="text-xs text-text-muted">
                            Reason: {latest.lastEditedReason}
                          </p>
                        ) : null}
                        <p className="text-xs text-text-muted">
                          Created {formatDate(latest.createdAt)}
                          {latest.lastEditedAt
                            ? ` · Edited ${formatDate(latest.lastEditedAt)}`
                            : ""}
                        </p>
                      </div>
                    ) : (
                      <p className="mt-3 text-sm text-text-muted">
                        No analysis yet for this profile.
                      </p>
                    )}
                  </div>

                  <div className="mt-4 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setOverrideTarget(profile)}
                      className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-text-muted transition hover:bg-cyan-soft hover:text-brand-blue"
                    >
                      {latest && latest.gradingMode === "admin-override"
                        ? "Override again"
                        : "Override grade"}
                    </button>
                  </div>

                  <p className="mt-4 text-sm text-text-muted">
                    Updated {formatDate(profile.updatedAt)}
                  </p>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {overrideTarget ? (
        <OverrideModal
          profile={overrideTarget}
          targetUserId={targetUserId}
          currentAdminId={currentAdminId}
          onClose={closeModal}
          onSuccess={handleSuccess}
        />
      ) : null}
    </>
  );
}

function OverrideModal({ profile, targetUserId, currentAdminId, onClose, onSuccess }) {
  const initialOverall =
    profile.latestAnalysis?.overallScore != null
      ? String(profile.latestAnalysis.overallScore)
      : "";
  const initialAts =
    profile.latestAnalysis?.atsScore != null
      ? String(profile.latestAnalysis.atsScore)
      : "";

  const [overallScore, setOverallScore] = useState(initialOverall);
  const [atsScore, setAtsScore] = useState(initialAts);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reasonLength = reason.trim().length;
  const reasonValid = reasonLength >= MIN_REASON_LENGTH && reasonLength <= MAX_REASON_LENGTH;
  const reasonTooShort = reason.length > 0 && !reasonValid;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const parsedOverall = parseScore(overallScore);
    if (parsedOverall === null || parsedOverall < MIN_SCORE || parsedOverall > MAX_SCORE) {
      setError(`Overall score must be a number between ${MIN_SCORE} and ${MAX_SCORE}.`);
      return;
    }

    let parsedAts = null;
    if (atsScore !== "" && atsScore !== null) {
      parsedAts = parseScore(atsScore);
      if (parsedAts === null || parsedAts < MIN_SCORE || parsedAts > MAX_SCORE) {
        setError(`ATS score must be a number between ${MIN_SCORE} and ${MAX_SCORE}.`);
        return;
      }
    }

    if (!reasonValid) {
      setError(`Reason must be between ${MIN_REASON_LENGTH} and ${MAX_REASON_LENGTH} characters.`);
      return;
    }

    setSubmitting(true);
    try {
      await requestJson(
        `/api/admin/users/${encodeURIComponent(targetUserId)}/cv-profiles/${encodeURIComponent(profile._id)}/analysis-override`,
        {
          method: "PATCH",
          body: JSON.stringify({
            overallScore: parsedOverall,
            atsScore: parsedAts,
            reason: reason.trim(),
          }),
        },
      );
      onSuccess(profile.title);
    } catch (err) {
      const message =
        err?.body?.error?.message ?? err?.message ?? "Failed to apply override";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy/45 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="override-dialog-title"
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg rounded-3xl border border-border bg-surface p-6 shadow-xl"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-blue">
          Override CV grade
        </p>
        <h2
          id="override-dialog-title"
          className="mt-2 text-2xl font-bold text-navy"
        >
          {profile.title}
        </h2>
        <p className="mt-2 text-sm text-text-muted">
          This creates a new review entry tagged &quot;admin override&quot; and notifies
          the user. The previous review is preserved.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-semibold text-navy">
              Overall score ({MIN_SCORE}–{MAX_SCORE})
            </span>
            <input
              type="number"
              inputMode="numeric"
              min={MIN_SCORE}
              max={MAX_SCORE}
              value={overallScore}
              onChange={(event) => setOverallScore(event.target.value)}
              className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-text-main outline-none transition focus:border-brand-blue"
              required
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-navy">
              ATS score ({MIN_SCORE}–{MAX_SCORE})
            </span>
            <input
              type="number"
              inputMode="numeric"
              min={MIN_SCORE}
              max={MAX_SCORE}
              value={atsScore}
              onChange={(event) => setAtsScore(event.target.value)}
              placeholder="Optional"
              className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-text-main outline-none transition focus:border-brand-blue"
            />
          </label>
        </div>

        <label className="mt-4 block">
          <span className="text-sm font-semibold text-navy">
            Reason ({MIN_REASON_LENGTH}–{MAX_REASON_LENGTH} characters)
          </span>
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            minLength={MIN_REASON_LENGTH}
            maxLength={MAX_REASON_LENGTH}
            rows={4}
            placeholder="Explain why this grade is being adjusted."
            className="mt-2 min-h-28 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-text-main outline-none transition focus:border-brand-blue"
            required
          />
          <span
            className={`mt-1 block text-xs ${
              reasonTooShort
                ? "text-forge-orange"
                : "text-text-muted"
            }`}
          >
            {reasonLength}/{MAX_REASON_LENGTH}
          </span>
        </label>

        {error ? (
          <p
            role="alert"
            className="mt-4 rounded-2xl border border-forge-orange/30 bg-orange-soft px-4 py-3 text-sm text-forge-orange"
          >
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-text-muted transition hover:bg-background disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || !reasonValid}
            className="rounded-xl bg-brand-blue px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-blue-hover disabled:opacity-60"
          >
            {submitting ? "Applying..." : "Apply override"}
          </button>
        </div>
      </form>
    </div>
  );
}