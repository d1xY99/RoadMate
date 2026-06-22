import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { Badge, type Column, DataTable } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

type AdminUser = {
  id: string;
  full_name: string;
  vehicle_type: string | null;
  is_available: boolean;
  created_at: string;
  roles: string[];
};
type AdminRole = {
  name: string;
  description: string | null;
  permission_count: number;
};
type AdminPermission = { name: string; description: string | null };

type SectionKey = 'users' | 'customers' | 'roles' | 'permissions';

const NAV: { key: SectionKey; label: string; icon: string }[] = [
  { key: 'users', label: 'Korisnici', icon: '👥' },
  { key: 'customers', label: 'Customeri', icon: '🧍' },
  { key: 'roles', label: 'Uloge', icon: '🛡️' },
  { key: 'permissions', label: 'Permisije', icon: '🔑' },
];

const fmtDate = (s: string) => new Date(s).toLocaleDateString('hr-HR');

export function AdminDashboard() {
  const navigate = useNavigate();
  const session = useAuth((s) => s.session);
  const loading = useAuth((s) => s.loading);
  const roles = useAuth((s) => s.roles);
  const signOut = useAuth((s) => s.signOut);
  const isAdmin = roles.includes('admin');
  const [section, setSection] = useState<SectionKey>('users');

  useEffect(() => {
    if (loading) return;
    if (!session) navigate({ to: '/login' });
    else if (!isAdmin) navigate({ to: '/' });
  }, [loading, session, isAdmin, navigate]);

  const usersQ = useQuery({
    queryKey: ['admin', 'users'],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_list_users');
      if (error) throw error;
      return data as AdminUser[];
    },
  });
  const rolesQ = useQuery({
    queryKey: ['admin', 'roles'],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_list_roles');
      if (error) throw error;
      return data as AdminRole[];
    },
  });
  const permsQ = useQuery({
    queryKey: ['admin', 'permissions'],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_list_permissions');
      if (error) throw error;
      return data as AdminPermission[];
    },
  });

  if (loading || !session || !isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-400">
        Ucitavanje...
      </div>
    );
  }

  const userColumns: Column<AdminUser>[] = [
    { key: 'full_name', header: 'Ime', render: (u) => u.full_name || '—' },
    {
      key: 'vehicle_type',
      header: 'Vozilo',
      render: (u) => u.vehicle_type ?? '—',
    },
    {
      key: 'is_available',
      header: 'Dostupan',
      render: (u) =>
        u.is_available ? (
          <Badge color="green">da</Badge>
        ) : (
          <Badge color="slate">ne</Badge>
        ),
    },
    {
      key: 'roles',
      header: 'Uloge',
      render: (u) => (
        <div className="flex flex-wrap gap-1">
          {u.roles.length ? (
            u.roles.map((r) => (
              <Badge key={r} color={r === 'admin' ? 'blue' : 'slate'}>
                {r}
              </Badge>
            ))
          ) : (
            <span className="text-slate-400">—</span>
          )}
        </div>
      ),
    },
    {
      key: 'created_at',
      header: 'Kreiran',
      render: (u) => fmtDate(u.created_at),
    },
  ];

  const roleColumns: Column<AdminRole>[] = [
    {
      key: 'name',
      header: 'Uloga',
      render: (r) => <Badge color="blue">{r.name}</Badge>,
    },
    { key: 'description', header: 'Opis', render: (r) => r.description ?? '—' },
    { key: 'permission_count', header: 'Permisija' },
  ];

  const permColumns: Column<AdminPermission>[] = [
    {
      key: 'name',
      header: 'Permisija',
      render: (p) => <code className="text-slate-800">{p.name}</code>,
    },
    { key: 'description', header: 'Opis', render: (p) => p.description ?? '—' },
  ];

  const customers = (usersQ.data ?? []).filter((u) =>
    u.roles.includes('customer'),
  );

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="flex w-60 flex-col border-slate-200 border-r bg-white">
        <div className="px-5 py-5 font-bold text-brand text-lg">
          🚗 RoadMate
        </div>
        <nav className="flex-1 px-3">
          {NAV.map((item) => (
            <button
              type="button"
              key={item.key}
              onClick={() => setSection(item.key)}
              className={`mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left font-medium text-sm transition ${
                section === item.key
                  ? 'bg-brand/10 text-brand'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="border-slate-200 border-t p-3">
          <Link
            to="/"
            className="mb-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left font-medium text-slate-600 text-sm transition hover:bg-slate-100"
          >
            ↩︎ Customer pogled
          </Link>
          <button
            type="button"
            onClick={async () => {
              await signOut();
              navigate({ to: '/login' });
            }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left font-medium text-red-600 text-sm transition hover:bg-red-50"
          >
            ⎋ Odjava
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <header className="flex items-center justify-between border-slate-200 border-b bg-white px-8 py-4">
          <h1 className="font-bold text-slate-900 text-xl">
            {NAV.find((n) => n.key === section)?.label}
          </h1>
          <span className="text-slate-500 text-sm">{session.user.email}</span>
        </header>

        <div className="p-8">
          {section === 'users' && (
            <DataTable
              columns={userColumns}
              rows={usersQ.data ?? []}
              keyField="id"
              loading={usersQ.isLoading}
            />
          )}
          {section === 'customers' && (
            <DataTable
              columns={userColumns}
              rows={customers}
              keyField="id"
              loading={usersQ.isLoading}
              empty="Nema customera"
            />
          )}
          {section === 'roles' && (
            <DataTable
              columns={roleColumns}
              rows={rolesQ.data ?? []}
              keyField="name"
              loading={rolesQ.isLoading}
            />
          )}
          {section === 'permissions' && (
            <DataTable
              columns={permColumns}
              rows={permsQ.data ?? []}
              keyField="name"
              loading={permsQ.isLoading}
            />
          )}
        </div>
      </main>
    </div>
  );
}
