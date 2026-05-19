import { Switch, Route, Router as WouterRouter, Link, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Competitors from "@/pages/competitors";
import CompetitorDetail from "@/pages/competitor-detail";
import Icps from "@/pages/icps";
import IcpDetail from "@/pages/icp-detail";
import Battlecards from "@/pages/battlecards";
import BattlecardDetail from "@/pages/battlecard-detail";
import Signals from "@/pages/signals";
import AccountBriefPage from "@/pages/account-brief";
import { LayoutDashboard, Shield, Users, Swords, Activity, Search } from "lucide-react";

const queryClient = new QueryClient();

const NAV_LINKS = [
  { href: "/account-brief", label: "Search Companies", icon: Search },
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/competitors", label: "Competitors", icon: Shield },
  { href: "/icps", label: "ICPs", icon: Users },
  { href: "/battlecards", label: "Battlecards", icon: Swords },
  { href: "/signals", label: "Signals Feed", icon: Activity },
];

function NavLink({ href, label, icon: Icon }: { href: string; label: string; icon: React.ElementType }) {
  const [location] = useLocation();
  const isActive = href === "/" ? location === "/" : location.startsWith(href);
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
        isActive
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </Link>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      <nav className="w-full md:w-60 border-b md:border-b-0 md:border-r border-border bg-card flex flex-col md:min-h-screen shrink-0">
        <div className="p-5 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-primary flex items-center justify-center">
              <Shield className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-foreground leading-none">GTM Intel</h1>
              <p className="text-xs text-muted-foreground mt-0.5">Strategic Command</p>
            </div>
          </div>
        </div>
        <div className="flex-1 py-4 flex flex-col gap-1 px-3">
          {NAV_LINKS.map(link => (
            <NavLink key={link.href} {...link} />
          ))}
        </div>
        <div className="p-3 border-t border-border">
          <p className="text-xs text-muted-foreground font-mono text-center">GTM Intelligence Platform</p>
        </div>
      </nav>
      <main className="flex-1 overflow-auto min-h-screen">
        {children}
      </main>
    </div>
  );
}

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/competitors" component={Competitors} />
        <Route path="/competitors/:id" component={CompetitorDetail} />
        <Route path="/icps" component={Icps} />
        <Route path="/icps/:id" component={IcpDetail} />
        <Route path="/battlecards" component={Battlecards} />
        <Route path="/battlecards/:id" component={BattlecardDetail} />
        <Route path="/signals" component={Signals} />
        <Route path="/account-brief" component={AccountBriefPage} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
