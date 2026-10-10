"use client";

import { useState } from "react";
import { MenuIcon } from "lucide-react";
import { NavLink } from "@/components/layout/nav-link";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { NavItem } from "@/lib/site";

// Client leaf: the small-screen menu. Controlled so a link click closes the sheet.
export function MobileNav({ items }: { items: readonly NavItem[] }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button variant="ghost" size="icon" aria-label="Open menu" className="md:hidden" />}>
        <MenuIcon aria-hidden="true" />
      </SheetTrigger>
      <SheetContent side="right" className="w-72">
        <SheetHeader className="px-6 pt-6">
          <SheetTitle>Menu</SheetTitle>
          <SheetDescription className="sr-only">Site navigation</SheetDescription>
        </SheetHeader>
        <nav aria-label="Main" className="px-6">
          <ul className="flex flex-col">
            {items.map((item) => (
              <li key={item.href} className="border-b border-border">
                <NavLink href={item.href} onNavigate={close} className="block py-3 text-base after:right-auto after:bottom-1.5 after:w-8">
                  {item.label}
                </NavLink>
              </li>
            ))}
            <li>
              <NavLink href="/search" onNavigate={close} className="block py-3 text-base after:right-auto after:bottom-1.5 after:w-8">
                Search
              </NavLink>
            </li>
          </ul>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
