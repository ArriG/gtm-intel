import { useEffect, useState } from "react";
import { Route, Switch, Link, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Building2, Sparkles, Radio, ChevronRight, ChevronDown, Brain, FolderOpen, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { BearMark } from "@/components/bear-mark";
import { BetaGate } from "@/components/beta-gate";
import { BriefStatusPill } from "@/components/brief-status-pill";
import { useHistory, clearHistory, getWatchedBriefs } from "@/lib/history";
import { countScanDue } from "@/lib/signal-tracking";
import { useIsYourCompanyConfigured } from "@/lib/your-company";

import AccountBriefPage from "./pages/account-brief";
import YourCompany from "./pages/your-company";
import ReasoningPage from "./pages/reasoning";
import Signals from "./pages/signals";
import CallPrepPage from "./pages/call-prep";
import MyBriefsPage from "./pages/my-briefs";
import NotFound from "./pages/not-found";

const queryClient = new QueryClient();

const NAV_SETUP = [
  { href: "/your-company", label: "Your Company", icon: Building2 },
  { href: "/reasoning", label: "Reasoning", icon: Brain },
];

const NAV_RESEARCH_BASE = [
  { href: "/", label: "Search", icon: Sparkles },
  { href: "/my-briefs", label: "My list", icon: FolderOpen },
  { href: "/signals", label: "Signals", icon: Radio },
] as const;

function RecentSearches() {
  const history = useHistory();
  const [open, setOpen] = useState(false);
  if (history.length === 0) return null;
  return (
    <div className="ml-3 mt-0.5">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-1 px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground rounded-md transition-colors"
      >
        {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        <span>Recent searches</span>
        <span className="ml-auto text-[10px] text-muted-foreground/70">{history.length}</span>
      </button>
      {open && (
        <div className="mb-1">
          {history.map(entry => (
            <Link
              key={entry.id}
              href={`/?h=${entry.id}`}
              className="flex items-center gap-2 px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-background/60 rounded-md transition-colors min-w-0"
            >
              <span className="truncate flex-1">{entry.label}</span>
              <BriefStatusPill status={entry.status ?? "not_contacted"} className="shrink-0 scale-90 origin-right" />
            </Link>
          ))}
          <button
            type="button"
            onClick={clearHistory}
            className="px-2.5 pt-1.5 text-[11px] text-muted-foreground/70 hover:text-destructive transition-colors"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
}

function NavSectionLabel({ children }: { children: string }) {
  return (
    <p className="px-4 pt-4 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/80">
      {children}
    </p>
  );
}

function SidebarNavLink({
  href,
  label,
  icon: Icon,
  active,
  badge,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2.5 pl-2.5 pr-3 py-2 rounded-r-md text-sm transition-colors border-l-2",
        active
          ? "border-primary bg-primary/10 text-foreground font-semibold"
          : "border-transparent text-muted-foreground font-medium hover:bg-background/80 hover:text-foreground",
      )}
    >
      <Icon className={cn("w-4 h-4 shrink-0", active ? "text-foreground" : "text-muted-foreground/80")} />
      <span className="flex-1">{label}</span>
      {badge != null && badge > 0 && (
        <span className="min-w-[1.25rem] rounded-full bg-amber-500/20 px-1.5 py-0.5 text-center text-[10px] font-bold text-amber-900 dark:text-amber-100">
          {badge}
        </span>
      )}
    </Link>
  );
}

function Sidebar() {
  const [location] = useLocation();
  const history = useHistory();
  const isActive = (href: string) => href === "/" ? location === "/" : location.startsWith(href);
  const scanDueCount = countScanDue(getWatchedBriefs());
  const researchNav = NAV_RESEARCH_BASE;

  return (
    <aside className="w-56 shrink-0 border-r border-border bg-sidebar flex flex-col">
      <div className="px-4 py-4 border-b border-border bg-sidebar">
        <Link href="/your-company" className="flex items-center gap-2.5 font-bold tracking-tight text-foreground">
          <BearMark size={32} />
          <span>GTM Intel</span>
        </Link>
      </div>
      <nav className="flex-1 p-2">
        <NavSectionLabel>Setup</NavSectionLabel>
        <div className="space-y-0.5">
          {NAV_SETUP.map(({ href, label, icon }) => (
            <SidebarNavLink key={href} href={href} label={label} icon={icon} active={isActive(href)} />
          ))}
        </div>

        <div className="my-3 mx-3 border-t border-border" />

        <NavSectionLabel>Research</NavSectionLabel>
        <div className="space-y-0.5">
          {researchNav.map(({ href, label, icon }) => (
            <div key={href}>
              <SidebarNavLink
                href={href}
                label={label}
                icon={icon}
                active={isActive(href)}
                badge={href === "/signals" ? scanDueCount : undefined}
              />
              {href === "/" && <RecentSearches />}
            </div>
          ))}
        </div>
      </nav>
    </aside>
  );
}

/** Send first-time users to Your Company before Search. */
function FirstRunRedirect() {
  const [location, setLocation] = useLocation();
  const configured = useIsYourCompanyConfigured();

  useEffect(() => {
    if (!configured && location === "/") {
      setLocation("/your-company");
    }
  }, [configured, location, setLocation]);

  return null;
}

export default function App() {
  return (
    <BetaGate>
      <QueryClientProvider client={queryClient}>
        <FirstRunRedirect />
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 min-w-0">
            <Switch>
              <Route path="/" component={AccountBriefPage} />
              <Route path="/my-briefs" component={MyBriefsPage} />
              <Route path="/prep" component={CallPrepPage} />
              <Route path="/your-company" component={YourCompany} />
              <Route path="/reasoning" component={ReasoningPage} />
              <Route path="/signals" component={Signals} />
              <Route component={NotFound} />
            </Switch>
          </main>
        </div>
      </QueryClientProvider>
    </BetaGate>
  );
}
