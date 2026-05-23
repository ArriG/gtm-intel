import { useState } from "react";
import { Route, Switch, Link, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Aperture, Building2, Sparkles, Users, Newspaper, Flag, Radio, ChevronRight, ChevronDown, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { useHistory, clearHistory } from "@/lib/history";

import AccountBriefPage from "./pages/account-brief";
import YourCompany from "./pages/your-company";
import ICPs from "./pages/icps";
import ICPDetail from "./pages/icp-detail";
import Dashboard from "./pages/dashboard";
import Competitors from "./pages/competitors";
import CompetitorDetail from "./pages/competitor-detail";
import Signals from "./pages/signals";
import MarketProspect from "./pages/market-prospect";
import NotFound from "./pages/not-found";

const queryClient = new QueryClient();

const NAV_ITEMS = [
  { href: "/your-company", label: "Your Company", icon: Building2 },
  { href: "/",             label: "Search",       icon: Sparkles },
  { href: "/prospect",     label: "Prospect",     icon: Target },
  { href: "/icps",         label: "ICPs",         icon: Users },
  { href: "/dashboard",    label: "Dashboard",    icon: Newspaper },
  { href: "/competitors",  label: "Competitors",  icon: Flag },
  { href: "/signals",      label: "Signals",      icon: Radio },
];

function RecentSearches() {
  const history = useHistory();
  const [open, setOpen] = useState(false);
  if (history.length === 0) return null;
  return (
    <div className="ml-6">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-1 px-2.5 py-1 text-xs text-[#5A677C] hover:text-[#2D3748] rounded-md transition-colors"
      >
        {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        <span>Recent searches</span>
        <span className="ml-auto text-[10px] text-[#5A677C]/70">{history.length}</span>
      </button>
      {open && (
        <div className="mb-1">
          {history.map(entry => (
            <Link
              key={entry.id}
              href={`/?h=${entry.id}`}
              className="block px-2.5 py-1 text-xs text-[#5A677C] hover:text-[#2D3748] hover:bg-background/60 rounded-md transition-colors truncate"
            >
              {entry.label}
            </Link>
          ))}
          <button
            type="button"
            onClick={clearHistory}
            className="px-2.5 pt-1.5 text-[11px] text-[#5A677C]/70 hover:text-destructive transition-colors"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
}

function Sidebar() {
  const [location] = useLocation();
  const isActive = (href: string) => href === "/" ? location === "/" : location.startsWith(href);

  return (
    <aside className="w-56 shrink-0 border-r border-border bg-muted/30 flex flex-col">
      <div className="px-5 py-5 border-b border-border">
        <Link href="/" className="flex items-center gap-2 font-bold tracking-tight text-[#2D3748]">
          <Aperture className="w-5 h-5 text-primary" />
          <span>GTM Intel</span>
        </Link>
      </div>
      <nav className="flex-1 p-2 space-y-0.5">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
          <div key={href}>
            <Link
              href={href}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-normal transition-colors",
                isActive(href)
                  ? "bg-background text-[#2D3748] font-semibold shadow-sm"
                  : "text-[#5A677C] hover:bg-background/60 hover:text-[#2D3748]",
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
            {href === "/" && <RecentSearches />}
          </div>
        ))}
      </nav>
    </aside>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 min-w-0">
          <Switch>
            <Route path="/" component={AccountBriefPage} />
            <Route path="/prospect" component={MarketProspect} />
            <Route path="/your-company" component={YourCompany} />
            <Route path="/icps" component={ICPs} />
            <Route path="/icps/:id" component={ICPDetail} />
            <Route path="/dashboard" component={Dashboard} />
            <Route path="/competitors" component={Competitors} />
            <Route path="/competitors/:id" component={CompetitorDetail} />
            <Route path="/signals" component={Signals} />
            <Route component={NotFound} />
          </Switch>
        </main>
      </div>
    </QueryClientProvider>
  );
}
