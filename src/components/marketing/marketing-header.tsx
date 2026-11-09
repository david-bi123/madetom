"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Menu, X } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

const links = [
  { href: "#product", label: "Product" },
  { href: "#operations", label: "Operations" },
  { href: "#roles", label: "Roles" },
  { href: "#pricing", label: "Plans" },
];

export function MarketingHeader({ contactEmail }: { contactEmail: string }) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-[#f6f7f3]/90 backdrop-blur-md">
      <div className="page-container flex h-[68px] items-center justify-between">
        <Link href="/" aria-label="Madetom home" className="rounded-md">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-7 md:flex" aria-label="Main navigation">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="hidden sm:inline-flex" render={<Link href="/login" />} nativeButton={false}>
            Sign in
          </Button>
          <Button
            size="sm"
            className="hidden sm:inline-flex"
            render={<a href={`mailto:${contactEmail}?subject=Madetom access request`} />}
           nativeButton={false}>
            Request access
            <ArrowRight className="size-3.5" />
          </Button>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            className="flex size-9 items-center justify-center rounded-lg border border-border bg-card text-foreground md:hidden"
          >
            {open ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </div>

      {open ? (
        <div id="mobile-menu" className="border-t border-border bg-[#fbfcf9] px-4 py-3 md:hidden">
          <nav className="flex flex-col" aria-label="Mobile navigation">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                {link.label}
              </a>
            ))}
          </nav>
          <div className="mt-2 grid grid-cols-2 gap-2 border-t border-border pt-3">
            <Button variant="outline" size="sm" render={<Link href="/login" />} nativeButton={false}>
              Sign in
            </Button>
            <Button size="sm" render={<a href={`mailto:${contactEmail}?subject=Madetom access request`} />} nativeButton={false}>
              Request access
            </Button>
          </div>
        </div>
      ) : null}
    </header>
  );
}

