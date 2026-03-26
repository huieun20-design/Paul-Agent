"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Mail,
  LayoutDashboard,
  FileText,
  Landmark,
  CheckSquare,
  DollarSign,
  Settings,
  LogOut,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Email", href: "/email", icon: Mail },
  { name: "Finance", href: "/finance", icon: Landmark },
  { name: "Billing", href: "/billing", icon: FileText },
  { name: "Todo", href: "/todo", icon: CheckSquare },
  { name: "Payroll", href: "/payroll", icon: DollarSign },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop — left sidebar */}
      <aside className="hidden md:flex h-screen w-16 flex-col items-center bg-white border-r border-gray-200 py-4">
        <div className="mb-6">
          <span className="text-lg font-black text-gray-900 tracking-tight">PAUL</span>
        </div>
        <nav className="flex-1 flex flex-col items-center gap-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link key={item.name} href={item.href} title={item.name}
                className={cn("flex h-10 w-10 items-center justify-center rounded-xl transition-all",
                  isActive ? "bg-gray-900 text-white shadow-sm" : "text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                )}>
                <item.icon className="h-[18px] w-[18px]" />
              </Link>
            );
          })}
        </nav>
        <button onClick={() => signOut({ callbackUrl: "/login" })} title="Logout"
          className="flex h-10 w-10 items-center justify-center rounded-xl text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all">
          <LogOut className="h-[18px] w-[18px]" />
        </button>
      </aside>

      {/* Mobile — bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 px-2 pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around py-1">
          {navigation.slice(0, 5).map((item) => {
            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link key={item.name} href={item.href}
                className={cn("flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg transition-all min-w-[48px]",
                  isActive ? "text-gray-900" : "text-gray-400"
                )}>
                <item.icon className="h-5 w-5" />
                <span className="text-[9px] font-medium">{item.name}</span>
              </Link>
            );
          })}
          <Link href="/settings"
            className={cn("flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg transition-all min-w-[48px]",
              pathname === "/settings" ? "text-gray-900" : "text-gray-400"
            )}>
            <Settings className="h-5 w-5" />
            <span className="text-[9px] font-medium">More</span>
          </Link>
        </div>
      </nav>
    </>
  );
}
