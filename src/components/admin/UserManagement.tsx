"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Users, Plus, Search, Pencil, UserX, UserCheck, X, Loader2, Shield, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface Dept { id: string; name: string; code: string; }
interface UserRow {
  id: string;
  fullName: string;
  email: string;
  staffId: string;
  role: string;
  mobile: string | null;
  isActive: boolean;
  createdAt: string;
  department: Dept;
}

interface Props {
  initialUsers: UserRow[];
  departments: Dept[];
}

const roleColors: Record<string, string> = {
  admin: "bg-red-100 text-red-700",
  head: "bg-blue-100 text-blue-700",
  governor: "bg-purple-100 text-purple-700",
  staff: "bg-gray-100 text-gray-600",
};

export function UserManagement({ initialUsers, departments }: Props) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    fullName: "", email: "", staffId: "", password: "",
    departmentId: "", role: "staff", mobile: "",
  });

  const filtered = users.filter(
    (u) =>
      u.fullName.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.staffId.toLowerCase().includes(search.toLowerCase()) ||
      u.department.name.toLowerCase().includes(search.toLowerCase())
  );

  function openCreate() {
    setEditing(null);
    setForm({ fullName: "", email: "", staffId: "", password: "", departmentId: departments[0]?.id || "", role: "staff", mobile: "" });
    setShowModal(true);
  }

  function openEdit(user: UserRow) {
    setEditing(user);
    setForm({ fullName: user.fullName, email: user.email, staffId: user.staffId, password: "", departmentId: user.department.id, role: user.role, mobile: user.mobile || "" });
    setShowModal(true);
  }

  async function handleSave() {
    setLoading(true);
    const url = editing ? `/api/users/${editing.id}` : "/api/users";
    const method = editing ? "PATCH" : "POST";
    const body = { ...form };
    if (editing && !form.password) delete (body as { password?: string }).password;

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setLoading(false);
    if (res.ok) {
      setShowModal(false);
      router.refresh();
    }
  }

  async function toggleActive(user: UserRow) {
    await fetch(`/api/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !user.isActive }),
    });
    setUsers(users.map((u) => u.id === user.id ? { ...u, isActive: !u.isActive } : u));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-[#003087]" />
          <h2 className="text-lg font-bold text-gray-900">User Management</h2>
          <span className="rounded-full bg-[#003087] px-2 py-0.5 text-xs font-bold text-white">{users.length}</span>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 rounded-lg bg-[#003087] px-4 py-2 text-sm font-semibold text-white hover:bg-[#002070]">
          <Plus className="h-4 w-4" /> Add User
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users…" className="w-full max-w-sm rounded-lg border border-gray-200 bg-white pl-9 pr-4 py-2 text-sm outline-none focus:border-[#003087]" />
      </div>

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Name</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Staff ID</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Department</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Role</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map((user) => (
              <tr key={user.id} className={cn("hover:bg-gray-50", !user.isActive && "opacity-50")}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#003087]/10 text-[#003087] text-xs font-bold shrink-0">
                      {user.fullName.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{user.fullName}</p>
                      <p className="text-xs text-gray-400">{user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-gray-600">{user.staffId}</td>
                <td className="px-4 py-3 text-gray-700">{user.department.name}</td>
                <td className="px-4 py-3">
                  <span className={cn("rounded px-2 py-0.5 text-xs font-semibold capitalize", roleColors[user.role])}>
                    {user.role}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={cn("rounded px-2 py-0.5 text-xs font-semibold", user.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500")}>
                    {user.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => openEdit(user)} className="p-1 text-gray-400 hover:text-[#003087]">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => toggleActive(user)} className="p-1 text-gray-400 hover:text-red-500">
                      {user.isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h3 className="font-semibold text-gray-900">{editing ? "Edit User" : "Add New User"}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              {[
                { label: "Full Name", key: "fullName", type: "text", placeholder: "John Doe" },
                { label: "BSL Email", key: "email", type: "email", placeholder: "j.doe@bsl.gov.sl" },
                { label: "Staff ID", key: "staffId", type: "text", placeholder: "BSL001234" },
                { label: "Mobile", key: "mobile", type: "tel", placeholder: "+232 76 000000" },
                { label: editing ? "New Password (leave blank to keep)" : "Password", key: "password", type: "password", placeholder: "••••••••" },
              ].map((field) => (
                <div key={field.key}>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">{field.label}</label>
                  <input
                    type={field.type}
                    value={(form as Record<string, string>)[field.key]}
                    onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                    placeholder={field.placeholder}
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-[#003087]"
                  />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Department</label>
                  <select value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })} className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none">
                    {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Role</label>
                  <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none">
                    {["staff", "head", "admin", "governor"].map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
              <button onClick={() => setShowModal(false)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={handleSave} disabled={loading} className="flex items-center gap-2 rounded-lg bg-[#003087] px-4 py-2 text-sm font-semibold text-white hover:bg-[#002070] disabled:opacity-60">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {editing ? "Save Changes" : "Create User"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
