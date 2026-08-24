import type { Permission } from "@/lib/auth/permissions";

export type AdminNavItem = {
  label: string;
  href: string;
  permission: Permission | null;
};

export type AdminNavGroup = {
  id: string;
  label: string;
  items: AdminNavItem[];
};

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    id: "overview",
    label: "Overzicht",
    items: [{ label: "Dashboard", href: "/admin", permission: null }],
  },
  {
    id: "sales",
    label: "Sales",
    items: [
      { label: "Leads", href: "/admin/leads", permission: "leads.read" },
      { label: "Offertes", href: "/admin/quotes", permission: "quotes.view_assigned" },
      { label: "Klanten", href: "/admin/customers", permission: "customers.view" },
      { label: "Orders", href: "/admin/orders", permission: "orders.read" },
    ],
  },
  {
    id: "commerce",
    label: "Commerce",
    items: [
      { label: "Producten", href: "/admin/products", permission: "products.read" },
      { label: "Categorieën", href: "/admin/categories", permission: "products.read" },
      { label: "Betalingen", href: "/admin/payments", permission: "payments.read" },
      { label: "Facturen", href: "/admin/invoices", permission: "invoices.view_assigned" },
    ],
  },
  {
    id: "delivery",
    label: "Delivery",
    items: [
      { label: "Projecten", href: "/admin/projects", permission: "projects.view_all" },
      { label: "Website-productie", href: "/admin/website-production", permission: "jobs.review" },
      { label: "Jobs", href: "/admin/jobs", permission: "jobs.review" },
    ],
  },
  {
    id: "partners",
    label: "Partners",
    items: [
      { label: "Partners", href: "/admin/partners", permission: "partners.view" },
      { label: "Aanvragen", href: "/admin/partner-applications", permission: "partners.view" },
      { label: "Commissies", href: "/admin/commissions", permission: "partners.view" },
      { label: "Uitbetalingen", href: "/admin/payouts", permission: "payouts.review" },
    ],
  },
  {
    id: "service",
    label: "Service",
    items: [
      { label: "Support", href: "/admin/support", permission: "support.manage" },
      { label: "Berichten", href: "/admin/messages", permission: "messages.manage" },
      { label: "Meldingen", href: "/admin/notifications", permission: "notifications.manage" },
    ],
  },
  {
    id: "automation",
    label: "Automation",
    items: [
      { label: "Events", href: "/admin/automation", permission: "jobs.review" },
      { label: "Failed jobs", href: "/admin/jobs", permission: "jobs.review" },
    ],
  },
  {
    id: "manage",
    label: "Beheer",
    items: [
      { label: "Gebruikers", href: "/admin/users", permission: "roles.read" },
      { label: "Rollen", href: "/admin/roles", permission: "roles.read" },
      { label: "Audit log", href: "/admin/audit", permission: "audit.read" },
      { label: "Content", href: "/admin/content", permission: "content.manage" },
      { label: "Instellingen", href: "/admin/settings", permission: "settings.read" },
    ],
  },
];
