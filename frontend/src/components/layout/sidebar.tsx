"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  Search,
  FileText,
  Settings,
  User,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  BookOpen,
  Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface SidebarItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: string | number;
}

interface SidebarSection {
  title?: string;
  items: SidebarItem[];
}

const SIDEBAR_SECTIONS: SidebarSection[] = [
  {
    items: [
      { label: "Home", href: "/", icon: Home },
      { label: "Find Scholarships", href: "/scholarships", icon: Search },
      { label: "My Plan", href: "/plan", icon: FileText },
    ],
  },
  {
    title: "Account",
    items: [
      { label: "Profile", href: "/profile", icon: User },
      { label: "Notifications", href: "/notifications", icon: Bell, badge: 3 },
      { label: "Settings", href: "/settings", icon: Settings },
    ],
  },
  {
    title: "Resources",
    items: [
      { label: "Documentation", href: "/docs", icon: BookOpen },
      { label: "Help & Support", href: "/help", icon: HelpCircle },
    ],
  },
];

interface SidebarProps {
  className?: string;
  defaultCollapsed?: boolean;
}

export function Sidebar({ className, defaultCollapsed = false }: SidebarProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <aside
      className={cn(
        "fixed left-0 top-16 z-40 h-[calc(100vh-4rem)] border-r bg-white dark:bg-gray-900 transition-all duration-300",
        isCollapsed ? "w-16" : "w-64",
        className,
      )}
    >
      <div className="flex h-full flex-col">
        {/* Sidebar content */}
        <div className="flex-1 overflow-y-auto py-4">
          {SIDEBAR_SECTIONS.map((section, sectionIndex) => (
            <div key={sectionIndex} className="mb-6">
              {/* Section title */}
              {section.title && !isCollapsed && (
                <h3 className="mb-2 px-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  {section.title}
                </h3>
              )}

              {/* Section items */}
              <nav className="space-y-1 px-2">
                {section.items.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                          : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800",
                      )}
                    >
                      <item.icon
                        className={cn(
                          "h-5 w-5 flex-shrink-0",
                          isActive
                            ? "text-blue-600 dark:text-blue-400"
                            : "text-gray-400 group-hover:text-gray-500 dark:group-hover:text-gray-300",
                        )}
                      />

                      <AnimatePresence>
                        {!isCollapsed && (
                          <motion.span
                            initial={{ opacity: 0, width: 0 }}
                            animate={{ opacity: 1, width: "auto" }}
                            exit={{ opacity: 0, width: 0 }}
                            className="truncate"
                          >
                            {item.label}
                          </motion.span>
                        )}
                      </AnimatePresence>

                      {/* Badge */}
                      {item.badge && !isCollapsed && (
                        <span className="ml-auto inline-flex items-center justify-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-600 dark:bg-blue-900 dark:text-blue-400">
                          {item.badge}
                        </span>
                      )}

                      {/* Badge dot when collapsed */}
                      {item.badge && isCollapsed && (
                        <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-blue-500" />
                      )}

                      {/* Tooltip when collapsed */}
                      {isCollapsed && (
                        <div className="absolute left-full ml-2 hidden rounded-md bg-gray-900 px-2 py-1 text-xs text-white group-hover:block dark:bg-gray-700">
                          {item.label}
                        </div>
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>

        {/* Collapse toggle button */}
        <div className="border-t p-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleCollapse}
            className="w-full justify-center"
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4 mr-2" />
                <span>Collapse</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </aside>
  );
}

// Sidebar layout wrapper
interface SidebarLayoutProps {
  children: React.ReactNode;
  showSidebar?: boolean;
}

export function SidebarLayout({
  children,
  showSidebar = true,
}: SidebarLayoutProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="min-h-screen">
      {showSidebar && <Sidebar defaultCollapsed={isCollapsed} />}
      <main
        className={cn(
          "transition-all duration-300",
          showSidebar ? (isCollapsed ? "ml-16" : "ml-64") : "",
        )}
      >
        {children}
      </main>
    </div>
  );
}
