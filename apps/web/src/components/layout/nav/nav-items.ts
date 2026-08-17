export type NavItem = {
  key: string;
  label: string;
  href: string;
};

// Flat by intent. Promotion to grouped sections is a contained change to this
// file plus nav-list.tsx, and is not justified by a single item.
export const navItems: NavItem[] = [
  { key: "students", label: "Students", href: "/" },
];
