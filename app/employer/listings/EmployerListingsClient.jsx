"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { requestJson, requestJsonWithoutBody } from "@/lib/job-tracker/client/api.js";

const EMPTY_FORM = {
  title: "",
  company: "",
  location: "",
  description: "",
  url: "",
  requiredSkills: "",
  category: "",
  employmentType: "full_time",
  salaryMin: "",
  salaryMax: "",
};

function toNumberOrNull(value) {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toSkillsArray(value) {
  return value
    .split(",")
    .map((skill) => skill.trim())
    .filter(Boolean);
}

export default function EmployerListingsClient({
  currentUser,
  employer,
  initialListings = [],
}) {
  const router = useRouter();
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const isVerified = employer?.status === "verified";
  const isPending = employer?.status === "pending";

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);

    if (!isVerified) {
      setError("Your employer account is not verified yet.");
      return;
    }

    const payload = {
      title: formData.title.trim(),
      company: formData.company.trim() || employer?.name || "",
      location: formData.location.trim(),
      description: formData.description.trim(),
      url: formData.url.trim() || null,
      requiredSkills: toSkillsArray(formData.requiredSkills),
      category: formData.category.trim(),
      employmentType: formData.employmentType,
      salaryMin: toNumberOrNull(formData.salaryMin),
      salaryMax: toNumberOrNull(formData.salaryMax),
    };

    setLoading(true);
    try {
      if (editingId) {
        await requestJson(`/api/employer/listings/${editingId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        await requestJson("/api/employer/listings", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      setFormData(EMPTY_FORM);
      setEditingId(null);
      router.refresh();
    } catch (err) {
      setError(err?.body?.error?.message || err?.message || "Failed to save listing");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (listing) => {
    setEditingId(listing._id);
    setFormData({
      title: listing.title ?? "",
      company: listing.company ?? "",
      location: listing.location ?? "",
      description: listing.description ?? "",
      url: listing.url ?? "",
      requiredSkills: Array.isArray(listing.requiredSkills)
        ? listing.requiredSkills.join(", ")
        : "",
      category: listing.category ?? "",
      employmentType: listing.employmentType ?? "full_time",
      salaryMin: listing.salaryMin ?? "",
      salaryMax: listing.salaryMax ?? "",
    });
  };

  const handleClose = async (listingId) => {
    try {
      await requestJsonWithoutBody(`/api/employer/listings/${listingId}`, {
        method: "DELETE",
      });
      router.refresh();
    } catch (err) {
      setError(err?.body?.error?.message || err?.message || "Failed to close listing");
    }
  };

  return (
    <main className="min-h-screen bg-background text-foreground px-5 py-10">
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold text-navy">My Listings</h1>
          <p className="text-text-muted">
            Manage jobs published by {employer?.name || currentUser?.firstName}.
          </p>
          {isPending ? (
            <p className="rounded-xl bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
              Your employer account is awaiting administrator verification. You can prepare drafts, but publishing will be enabled once verified.
            </p>
          ) : null}
        </header>

        <section className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-navy">
            {editingId ? "Edit Listing" : "Publish a New Listing"}
          </h2>

          <form onSubmit={handleSubmit} className="mt-4 grid gap-4 sm:grid-cols-2">
            <input
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Title"
              className="rounded-xl border border-border p-3 sm:col-span-2"
              required
            />
            <input
              name="company"
              value={formData.company}
              onChange={handleChange}
              placeholder="Company"
              className="rounded-xl border border-border p-3 sm:col-span-2"
              required
            />
            <input
              name="location"
              value={formData.location}
              onChange={handleChange}
              placeholder="Location"
              className="rounded-xl border border-border p-3"
            />
            <input
              name="category"
              value={formData.category}
              onChange={handleChange}
              placeholder="Category"
              className="rounded-xl border border-border p-3"
            />
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Description"
              rows={5}
              className="rounded-xl border border-border p-3 sm:col-span-2"
              required
            />
            <input
              name="url"
              value={formData.url}
              onChange={handleChange}
              placeholder="External URL (optional)"
              className="rounded-xl border border-border p-3 sm:col-span-2"
            />
            <input
              name="requiredSkills"
              value={formData.requiredSkills}
              onChange={handleChange}
              placeholder="Required skills (comma separated)"
              className="rounded-xl border border-border p-3 sm:col-span-2"
            />
            <select
              name="employmentType"
              value={formData.employmentType}
              onChange={handleChange}
              className="rounded-xl border border-border p-3"
            >
              <option value="full_time">Full time</option>
              <option value="part_time">Part time</option>
              <option value="contract">Contract</option>
              <option value="internship">Internship</option>
              <option value="temporary">Temporary</option>
            </select>
            <div className="grid grid-cols-2 gap-4">
              <input
                name="salaryMin"
                value={formData.salaryMin}
                onChange={handleChange}
                placeholder="Salary min"
                className="rounded-xl border border-border p-3"
              />
              <input
                name="salaryMax"
                value={formData.salaryMax}
                onChange={handleChange}
                placeholder="Salary max"
                className="rounded-xl border border-border p-3"
              />
            </div>

            {error ? (
              <p className="sm:col-span-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </p>
            ) : null}

            <div className="sm:col-span-2 flex items-center gap-3">
              <button
                type="submit"
                disabled={loading || !isVerified}
                className="rounded-xl bg-brand-blue px-6 py-3 font-semibold text-white transition hover:bg-brand-blue-hover disabled:opacity-60"
              >
                {loading ? "Saving..." : editingId ? "Save Changes" : "Publish Listing"}
              </button>

              {editingId ? (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    setFormData(EMPTY_FORM);
                  }}
                  className="rounded-xl border border-border px-4 py-3 text-sm font-semibold text-text-muted transition hover:bg-cyan-soft hover:text-brand-blue"
                >
                  Cancel
                </button>
              ) : null}
            </div>
          </form>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-navy">Published Listings</h2>

          {initialListings.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border p-6 text-text-muted">
              You have not published any listings yet.
            </p>
          ) : (
            <ul className="grid gap-4">
              {initialListings.map((listing) => (
                <li
                  key={listing._id}
                  className="rounded-2xl border border-border bg-surface p-5 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-navy">{listing.title}</h3>
                      <p className="text-sm text-text-muted">
                        {listing.company} · {listing.location || "Location not specified"}
                      </p>
                      <p className="mt-2 text-xs uppercase tracking-wide text-text-muted">
                        {listing.isActive ? "Active" : "Closed"}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleEdit(listing)}
                        className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-text-muted transition hover:bg-cyan-soft hover:text-brand-blue"
                      >
                        Edit
                      </button>
                      {listing.isActive ? (
                        <button
                          type="button"
                          onClick={() => handleClose(listing._id)}
                          className="rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-600"
                        >
                          Close
                        </button>
                      ) : null}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}