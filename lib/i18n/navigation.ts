import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

// Locale-aware Link/router — automatically prefixes hrefs with the current
// locale, so components never have to construct `/${locale}/...` by hand.
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
