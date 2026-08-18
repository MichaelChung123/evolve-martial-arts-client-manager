// Declared here rather than in nav-icons.tsx so this module keeps depending on
// nothing. nav-icons.tsx imports the type and keys its map by it, which turns a
// missing glyph into a compile error instead of a blank rail.
export type NavIconKey = "users";

export type NavItem = {
  key: string;
  label: string;
  href: string;
  icon: NavIconKey;
};

// Flat by intent. Promotion to grouped sections is a contained change to this
// file plus nav-list.tsx, and is not justified by a single item.
export const navItems: NavItem[] = [
  { key: "students", label: "Students", href: "/", icon: "users" },
];
