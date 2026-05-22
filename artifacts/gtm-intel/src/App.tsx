import { Route, Switch, Link, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Sparkles, Users, Newspaper, Flag, Radio } from "lucide-react";
import { cn } from "@/lib/utils";

import AccountBriefPage from "./pages/account-brief";
import ICPs from "./pages/icps";
import ICPDetail from "./pages/icp-detail";
import Dashboard from "./pages/dashboard";
import Competitors from "./pages/competitors";
import CompetitorDetail from "./pages/competitor-detail";
import Signals from "./pages/signals";
import NotFound from "./pages/not-found";

const queryClient = new QueryClient();

const NAV_ITEMS = [
  { href: "/",            label: "Search",      icon: Sparkles },
  { href: "/icps",        label: "ICPs",        icon: Users },
  { href: "/dashboard",   label: "Dashboard",   icon: Newspaper },
  { href: "/competitors", label: "Competitors", icon: Flag },
  { href: "/signals",     label: "Signals",     icon: Radio },
];

function Sidebar() {
  const [location] = useLocation();
  const isActive = (href: string) => href === "/" ? location === "/" : location.startsWith(href);

  return (
    <aside className="w-56 shrink-0 border-r border-border bg-muted/30 flex flex-col">
      <div className="px-5 py-5 border-b border-border">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <Sparkles className="w-4 h-4 text-slate-500" />
          <span>GTM Intel</span>
        </Link>
      </div>
      <nav className="flex-1 p-2 space-y-0.5">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors",
              isActive(href)
                ? "bg-background text-foreground font-medium shadow-sm"
                : "text-muted-foreground hover:bg-background/60 hover:text-foreground",
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </Link>
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
