"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, Sparkles, X } from "lucide-react";

interface DemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultInterest?: string;
}

export function DemoModal({ isOpen, onClose, defaultInterest = "Fertility / IVF" }: DemoModalProps) {
  const [name, setName] = useState("");
  const [organization, setOrganization] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [interest, setInterest] = useState(defaultInterest);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    // Simulate brief request
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
    }, 600);
  };

  const handleReset = () => {
    setName("");
    setOrganization("");
    setEmail("");
    setPhone("");
    setSubmitted(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
        onClick={handleReset}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-100 bg-white p-6 sm:p-8 shadow-2xl transition-all">
        <button
          type="button"
          onClick={handleReset}
          className="absolute right-5 top-5 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
          aria-label="Close dialog"
        >
          <X className="h-5 w-5" />
        </button>

        {submitted ? (
          <div className="py-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900">Demo Request Received</h3>
            <p className="mt-2 text-sm text-slate-600">
              Thank you, <span className="font-semibold text-slate-900">{name || "Doctor"}</span>! Our clinical
              technology team will reach out at <span className="font-semibold text-slate-900">{email}</span> within 24 hours to schedule your personalized live platform demonstration.
            </p>
            <div className="mt-6 rounded-xl bg-purple-50/60 p-4 text-xs text-purple-900 text-left border border-purple-100">
              <p className="font-semibold flex items-center gap-1.5 text-purple-800 mb-1">
                <Sparkles className="h-3.5 w-3.5" /> What we will cover:
              </p>
              <ul className="list-disc pl-4 space-y-1 text-purple-700">
                <li>End-to-end 15-stage IVF & fertility protocol tracking</li>
                <li>Care Loop automated patient WhatsApp workflows & Voice escalation</li>
                <li>Role-based workspaces for Doctors, Coordinators, Lab & Billing</li>
              </ul>
            </div>
            <button
              type="button"
              onClick={handleReset}
              className="mt-6 w-full rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white hover:bg-slate-800 transition"
            >
              Done
            </button>
          </div>
        ) : (
          <div>
            <div className="mb-6">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-700 border border-purple-100">
                <Sparkles className="h-3 w-3" /> Live Platform Walkthrough
              </div>
              <h3 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
                Experience SmrkoMed
              </h3>
              <p className="mt-1 text-sm text-slate-600">
                See how SmrkoMed coordinates every stage of patient care, communication, and clinic operations.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Full Name <span className="text-purple-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Dr. Priya Rao"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-600/10 transition"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                    Clinic / Organisation <span className="text-purple-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    placeholder="Bloom Fertility"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-600/10 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                    Phone Number <span className="text-purple-600">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-600/10 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Work Email <span className="text-purple-600">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="priya@bloomfertility.in"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-600/10 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Area of Primary Interest
                </label>
                <select
                  value={interest}
                  onChange={(e) => setInterest(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:border-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-600/10 transition"
                >
                  <option value="Fertility / IVF">Fertility / IVF (Core Focus)</option>
                  <option value="Clinic Management">Clinic Management & Multi-Branch</option>
                  <option value="Healthcare Operations">Clinical Operations & Care Loop</option>
                  <option value="AI / Automation">Smrko AI, Care Connect & Care Voice</option>
                  <option value="Enterprise">Hospital / Enterprise Solutions</option>
                  <option value="Other">Other Healthcare Specialty</option>
                </select>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-600/20 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-offset-2 transition disabled:opacity-70"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Scheduling Demo...
                    </>
                  ) : (
                    "Request a Demo"
                  )}
                </button>
              </div>

              <p className="text-center text-[11px] text-slate-500">
                Zero spam. Strict data privacy. Built for healthcare organisations across India.
              </p>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
