import { Link } from "react-router-dom";
import type { ReactNode } from "react";

export type DashboardSection =
  | "dashboard"
  | "profile"
  | "security"
  | "notifications"
  | "activity"
  | "delete"
  | "plan"
  | "invoices";

interface NavItem {
  id: DashboardSection;
  label: string;
  icon: ReactNode;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const iconClass = "h-4 w-4 shrink-0";

function DashboardIcon() {
  return (
    <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 12a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1v-7z" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
    </svg>
  );
}

function CardIcon() {
  return (
    <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

function ReceiptIcon() {
  return (
    <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 14l2 2 4-4M7 3h10a2 2 0 012 2v16l-4-2-4 2-4-2-4 2V5a2 2 0 012-2z" />
    </svg>
  );
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: "Your Account",
    items: [{ id: "dashboard", label: "Dashboard", icon: <DashboardIcon /> }],
  },
  {
    title: "Account",
    items: [
      { id: "profile", label: "Profile", icon: <UserIcon /> },
      { id: "security", label: "Security", icon: <ShieldIcon /> },
      { id: "notifications", label: "Notifications", icon: <BellIcon /> },
      { id: "activity", label: "Activity Logs", icon: <ListIcon /> },
      { id: "delete", label: "Delete", icon: <TrashIcon /> },
    ],
  },
  {
    title: "Billing",
    items: [
      { id: "plan", label: "Plan", icon: <CardIcon /> },
      { id: "invoices", label: "Invoices", icon: <ReceiptIcon /> },
    ],
  },
];

interface DashboardShellProps {
  section: DashboardSection;
  onSectionChange: (section: DashboardSection) => void;
  title: string;
  children: ReactNode;
  topRight?: ReactNode;
}

export default function DashboardShell({
  section,
  onSectionChange,
  title,
  children,
  topRight,
}: DashboardShellProps) {
  return (
    <div className="cc-dashboard mx-auto flex min-h-[calc(100vh-4rem)] max-w-[1400px] gap-0 px-0 py-0 md:gap-0">
      <aside className="cc-dashboard-sidebar hidden w-56 shrink-0 border-r border-[rgb(var(--border))] bg-[rgb(var(--card))] md:block lg:w-60">
        <div className="sticky top-0 flex h-full flex-col py-6 pl-4 pr-2">
          {NAV_GROUPS.map((group) => (
            <div key={group.title} className="mb-6 last:mb-0">
              <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-[rgb(var(--muted))]">
                {group.title}
              </p>
              <nav className="space-y-0.5">
                {group.items.map((item) => {
                  const active = section === item.id;
                  const isDanger = item.id === "delete";
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onSectionChange(item.id)}
                      className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm transition ${
                        active
                          ? isDanger
                            ? "bg-red-500/10 font-medium text-red-500"
                            : "bg-red-500/10 font-medium text-red-500"
                          : isDanger
                            ? "text-red-400/80 hover:bg-red-500/5 hover:text-red-400"
                            : "text-[rgb(var(--muted))] hover:bg-[rgb(var(--card-hover))] hover:text-[rgb(var(--foreground))]"
                      }`}
                    >
                      {item.icon}
                      {item.label}
                    </button>
                  );
                })}
              </nav>
            </div>
          ))}
          <div className="mt-auto border-t border-[rgb(var(--border))] pt-4">
            <Link
              to="/"
              className="flex items-center gap-2 px-3 py-2 text-sm text-[rgb(var(--muted))] transition hover:text-brand"
            >
              ← Back to converter
            </Link>
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1 bg-[rgb(var(--background))]">
        <div className="border-b border-[rgb(var(--border))] px-4 py-4 md:px-8 md:py-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 md:hidden">
              <select
                value={section}
                onChange={(e) => onSectionChange(e.target.value as DashboardSection)}
                className="input-modern text-sm"
              >
                {NAV_GROUPS.flatMap((g) => g.items).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
            <h1 className="text-xl font-semibold tracking-tight md:text-2xl">{title}</h1>
            {topRight}
          </div>
        </div>
        <div className="px-4 py-6 md:px-8 md:py-8">{children}</div>
      </div>
    </div>
  );
}
