"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Plus, Pencil, Trash2, X, Loader2, Users } from "lucide-react";

interface Head { id: string; fullName: string; role: string; }
interface Dept {
  id: string;
  name: string;
  code: string;
  headUserId: string | null;
  parentDeptId: string | null;
  head: Head | null;
  _count: { users: number };
}

interface Props {
  initialDepts: Dept[];
  eligibleHeads: Head[];
}

export function DepartmentManagement({ initialDepts, eligibleHeads }: Props) {
  const router = useRouter();
  const [depts, setDepts] = useState(initialDepts);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Dept | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", code: "", headUserId: "", parentDeptId: "" });

  function openCreate() {
    setEditing(null);
    setForm({ name: "", code: "", headUserId: "", parentDeptId: "" });
    setShowModal(true);
  }

  function openEdit(dept: Dept) {
    setEditing(dept);
    setForm({ name: dept.name, code: dept.code, headUserId: dept.headUserId || "", parentDeptId: dept.parentDeptId || "" });
    setShowModal(true);
  }

  async function handleSave() {
    setLoading(true);
    const url = editing ? `/api/departments/${editing.id}` : "/api/departments";
    const method = editing ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, headUserId: form.headUserId || null, parentDeptId: form.parentDeptId || null }),
    });
    setLoading(false);
    if (res.ok) {
      setShowModal(false);
      router.refresh();
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this department? This cannot be undone.")) return;
    await fetch(`/api/departments/${id}`, { method: "DELETE" });
    setDepts(depts.filter((d) => d.id !== id));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-[#003087]" />
          <h2 className="text-lg font-bold text-gray-900">Departments</h2>
          <span className="rounded-full bg-[#003087] px-2 py-0.5 text-xs font-bold text-white">{depts.length}</span>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 rounded-lg bg-[#003087] px-4 py-2 text-sm font-semibold text-white hover:bg-[#002070]">
          <Plus className="h-4 w-4" /> Add Department
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {depts.map((dept) => (
          <div key={dept.id} className="rounded-xl border border-gray-200 bg-white p-5 hover:shadow-sm transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-[#003087]/10 px-2 py-0.5 text-xs font-bold text-[#003087]">{dept.code}</span>
                  <h3 className="font-semibold text-gray-900 text-sm">{dept.name}</h3>
                </div>
                {dept.head && (
                  <p className="mt-1.5 text-xs text-gray-500">Head: {dept.head.fullName}</p>
                )}
              </div>
              <div className="flex gap-1.5">
                <button onClick={() => openEdit(dept)} className="p-1 text-gray-400 hover:text-[#003087]">
                  <Pencil className="h-4 w-4" />
                </button>
                <button onClick={() => handleDelete(dept.id)} className="p-1 text-gray-400 hover:text-red-500">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1 text-xs text-gray-400">
              <Users className="h-3.5 w-3.5" />
              {dept._count.users} active staff
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h3 className="font-semibold text-gray-900">{editing ? "Edit Department" : "Add Department"}</h3>
              <button onClick={() => setShowModal(false)}><X className="h-5 w-5 text-gray-400" /></button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Department Name</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Finance" className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-[#003087]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Code</label>
                <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="e.g. FIN" className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-[#003087]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Departmental Head</label>
                <select value={form.headUserId} onChange={(e) => setForm({ ...form, headUserId: e.target.value })} className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none">
                  <option value="">— None —</option>
                  {eligibleHeads.map((u) => <option key={u.id} value={u.id}>{u.fullName}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Parent Department (optional)</label>
                <select value={form.parentDeptId} onChange={(e) => setForm({ ...form, parentDeptId: e.target.value })} className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none">
                  <option value="">— None —</option>
                  {depts.filter((d) => d.id !== editing?.id).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
              <button onClick={() => setShowModal(false)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={handleSave} disabled={loading} className="flex items-center gap-2 rounded-lg bg-[#003087] px-4 py-2 text-sm font-semibold text-white hover:bg-[#002070] disabled:opacity-60">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {editing ? "Save" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
