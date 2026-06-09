"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Save,
  Send,
  X,
  Search,
  User,
  Building2,
  Eye,
  Loader2,
  AlertCircle,
  Radio,
  Lock,
} from "lucide-react";
import { cn, getPriorityColor } from "@/lib/utils";

interface Dept { id: string; name: string; code: string; }
interface StaffUser { id: string; fullName: string; email: string; staffId: string; department: { name: string }; }
interface RoutingUser { id: string; fullName: string; department: { name: string }; role: string; type?: string; }

interface Props {
  userId: string;
  userRole: string;
  departmentId: string;
  departmentCode: string;
  draftId?: string;
}

const AUDIENCE_OPTIONS = [
  { value: "individual", label: "Individual", icon: User, desc: "Send to a specific person" },
  { value: "confidential", label: "Confidential", icon: Lock, desc: "Encrypted — restricted to 4 parties only" },
  { value: "broadcast", label: "Broadcast", icon: Radio, desc: "Send to all staff in selected department(s)" },
];

export function ComposeForm({ userId, userRole, departmentId, departmentCode, draftId }: Props) {
  const router = useRouter();

  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [audienceType, setAudienceType] = useState<"individual" | "confidential" | "broadcast">("individual");
  const [priority, setPriority] = useState<"normal" | "high" | "urgent">("normal");
  const [referenceNote, setReferenceNote] = useState("");
  const [selectedRecipients, setSelectedRecipients] = useState<StaffUser[]>([]);
  const [selectedDepts, setSelectedDepts] = useState<Dept[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [userResults, setUserResults] = useState<StaffUser[]>([]);
  const [allDepts, setAllDepts] = useState<Dept[]>([]);
  const [routingPreview, setRoutingPreview] = useState<{ toUsers: RoutingUser[]; ccUsers: RoutingUser[] } | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadingDraft, setLoadingDraft] = useState(!!draftId);
  const [error, setError] = useState("");

  // Load departments
  useEffect(() => {
    fetch("/api/departments")
      .then((r) => r.json())
      .then((d) => setAllDepts(d.departments || []));
  }, []);

  // Load existing draft if draftId provided
  useEffect(() => {
    if (!draftId) return;
    setLoadingDraft(true);
    fetch(`/api/memos/${draftId}`)
      .then((r) => r.json())
      .then((data) => {
        const memo = data;
        if (memo && memo.status === "draft") {
          setSubject(memo.subject || "");
          setBody(memo.body || "");
          setAudienceType(memo.audienceType || "individual");
          setPriority(memo.priority || "normal");
          setReferenceNote(memo.referenceNote || "");
        }
      })
      .catch(() => {})
      .finally(() => setLoadingDraft(false));
  }, [draftId]);

  // Search users
  useEffect(() => {
    if (userSearch.length < 2) { setUserResults([]); return; }
    const t = setTimeout(() => {
      fetch(`/api/users?search=${encodeURIComponent(userSearch)}&excludeSelf=true`)
        .then((r) => r.json())
        .then((d) => setUserResults(d.users || []));
    }, 300);
    return () => clearTimeout(t);
  }, [userSearch]);

  const loadRoutingPreview = useCallback(async () => {
    const res = await fetch("/api/routing-preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        audienceType,
        recipientIds: selectedRecipients.map((r) => r.id),
        departmentIds: selectedDepts.map((d) => d.id),
      }),
    });
    const data = await res.json();
    setRoutingPreview(data);
    setShowPreview(true);
  }, [audienceType, selectedRecipients, selectedDepts]);

  async function handleSubmit(isDraft: boolean) {
    if (!isDraft && !subject.trim()) { setError("Subject is required."); return; }
    if (!isDraft && !body.trim()) { setError("Body is required."); return; }
    if (!isDraft && audienceType !== "broadcast" && selectedRecipients.length === 0) {
      setError("Please select at least one recipient."); return;
    }

    setError("");
    setSubmitting(true);

    let res: Response;

    if (draftId) {
      if (isDraft) {
        // Update existing draft
        res = await fetch(`/api/memos/${draftId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subject, body, audienceType, priority, referenceNote }),
        });
      } else {
        // Send existing draft (with latest content + recipients)
        res = await fetch(`/api/memos/${draftId}/send`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subject,
            body,
            audienceType,
            priority,
            referenceNote,
            recipientIds: selectedRecipients.map((r) => r.id),
            departmentIds: selectedDepts.map((d) => d.id),
          }),
        });
      }
    } else {
      // New memo
      res = await fetch("/api/memos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          body,
          audienceType,
          priority,
          referenceNote,
          recipientIds: selectedRecipients.map((r) => r.id),
          departmentIds: selectedDepts.map((d) => d.id),
          isDraft,
        }),
      });
    }

    setSubmitting(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error?.message || data.error || "Operation failed.");
      return;
    }

    const data = await res.json();
    if (isDraft) {
      router.push("/drafts");
    } else {
      router.push(`/memos/${data.memo.id}`);
    }
  }

  const addRecipient = (user: StaffUser) => {
    if (!selectedRecipients.find((r) => r.id === user.id)) {
      setSelectedRecipients([...selectedRecipients, user]);
    }
    setUserSearch("");
    setUserResults([]);
  };

  const removeRecipient = (id: string) =>
    setSelectedRecipients(selectedRecipients.filter((r) => r.id !== id));

  const toggleDept = (dept: Dept) => {
    if (selectedDepts.find((d) => d.id === dept.id)) {
      setSelectedDepts(selectedDepts.filter((d) => d.id !== dept.id));
    } else {
      setSelectedDepts([...selectedDepts, dept]);
    }
  };

  if (loadingDraft) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        Loading draft…
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">
          {draftId ? "Edit Draft" : "Compose Memo"}
        </h2>
        <div className="text-xs text-gray-400">
          {draftId ? "Editing saved draft" : `Ref will be auto-generated: BSL/${departmentCode}/${new Date().getFullYear()}/XXXX`}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Audience Type */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <label className="mb-3 block text-sm font-semibold text-gray-900">Memo Type</label>
        <div className="grid grid-cols-3 gap-3">
          {AUDIENCE_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setAudienceType(opt.value as never)}
                className={cn(
                  "flex flex-col items-start gap-1.5 rounded-lg border-2 p-3 text-left transition-colors",
                  audienceType === opt.value
                    ? "border-[#003087] bg-[#003087]/5"
                    : "border-gray-200 hover:border-gray-300"
                )}
              >
                <Icon className={cn("h-4 w-4", audienceType === opt.value ? "text-[#003087]" : "text-gray-400")} />
                <span className="text-xs font-semibold text-gray-900">{opt.label}</span>
                <span className="text-[10px] text-gray-500">{opt.desc}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Recipients */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <label className="mb-3 block text-sm font-semibold text-gray-900">
          {audienceType === "broadcast" ? "Target Departments" : "Recipient"}
        </label>

        {audienceType === "broadcast" ? (
          <div className="grid grid-cols-2 gap-2">
            {allDepts.map((dept) => (
              <label key={dept.id} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!selectedDepts.find((d) => d.id === dept.id)}
                  onChange={() => toggleDept(dept)}
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">{dept.name}</span>
                <span className="text-xs text-gray-400">({dept.code})</span>
              </label>
            ))}
            {selectedDepts.length === 0 && (
              <p className="col-span-2 text-xs text-amber-600 mt-1">
                Note: if no departments selected, memo will broadcast to ALL staff.
              </p>
            )}
          </div>
        ) : (
          <>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search staff by name, email, or staff ID…"
                className="w-full rounded-lg border border-gray-200 bg-gray-50 pl-9 pr-4 py-2.5 text-sm outline-none focus:border-[#003087]"
              />
            </div>

            {userResults.length > 0 && (
              <div className="mt-1 rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden z-10">
                {userResults.slice(0, 8).map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => addRecipient(user)}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 text-left"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#003087]/10 text-[#003087] text-xs font-bold shrink-0">
                      {user.fullName.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{user.fullName}</p>
                      <p className="text-xs text-gray-500">{user.department.name} · {user.staffId}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {selectedRecipients.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedRecipients.map((r) => (
                  <span key={r.id} className="inline-flex items-center gap-1.5 rounded-full bg-[#003087]/10 px-3 py-1 text-sm text-[#003087]">
                    <User className="h-3 w-3" />
                    {r.fullName}
                    <button type="button" title="Remove recipient" onClick={() => removeRecipient(r.id)} className="hover:text-red-600">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Subject & Body */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-gray-900">Subject</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Enter memo subject…"
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:border-[#003087]"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-gray-900">Body</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Compose your memo content here…"
            rows={10}
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-[#003087] resize-y"
          />
        </div>
      </div>

      {/* Priority & Reference */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <label className="mb-3 block text-sm font-semibold text-gray-900">Priority</label>
          <div className="flex gap-2">
            {(["normal", "high", "urgent"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPriority(p)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition-colors",
                  priority === p
                    ? p === "urgent" ? "bg-red-100 text-red-700 ring-2 ring-red-300"
                      : p === "high" ? "bg-orange-100 text-orange-700 ring-2 ring-orange-300"
                      : "bg-gray-200 text-gray-700 ring-2 ring-gray-400"
                    : getPriorityColor(p)
                )}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <label className="mb-1.5 block text-sm font-semibold text-gray-900">Reference Note (optional)</label>
          <input
            type="text"
            value={referenceNote}
            onChange={(e) => setReferenceNote(e.target.value)}
            placeholder="e.g. BSL/FIN/2025/0012 or external ref"
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:border-[#003087]"
          />
        </div>
      </div>

      {/* Routing Preview */}
      {showPreview && routingPreview && (
        <div className="rounded-xl border border-[#003087]/20 bg-[#003087]/5 p-5">
          <h3 className="text-sm font-semibold text-[#003087] mb-3 flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Routing Preview
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-2">To ({routingPreview.toUsers.length})</p>
              <div className="space-y-1">
                {routingPreview.toUsers.slice(0, 5).map((u) => (
                  <div key={u.id} className="text-xs text-gray-700 flex gap-1">
                    <User className="h-3 w-3 mt-0.5 shrink-0 text-gray-400" />
                    {u.fullName} — {u.department.name}
                  </div>
                ))}
                {routingPreview.toUsers.length > 5 && (
                  <p className="text-xs text-gray-400">+ {routingPreview.toUsers.length - 5} more</p>
                )}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-2">CC ({routingPreview.ccUsers.length})</p>
              <div className="space-y-1">
                {routingPreview.ccUsers.map((u) => (
                  <div key={u.id} className="text-xs text-gray-700 flex gap-1">
                    <Building2 className="h-3 w-3 mt-0.5 shrink-0 text-gray-400" />
                    {u.fullName}
                    {u.type === "bcc_head" && " (silent)"}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={loadRoutingPreview}
          className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          <Eye className="h-4 w-4" />
          Preview Routing
        </button>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => handleSubmit(true)}
            disabled={submitting}
            className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            Save Draft
          </button>
          <button
            type="button"
            onClick={() => handleSubmit(false)}
            disabled={submitting}
            className="flex items-center gap-2 rounded-lg bg-[#003087] px-5 py-2 text-sm font-semibold text-white hover:bg-[#002070] disabled:opacity-60"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send Memo
          </button>
        </div>
      </div>
    </div>
  );
}
