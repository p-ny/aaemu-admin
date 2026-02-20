import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Layout from "@/components/layout";
import LoginPage from "@/pages/login";
import DashboardPage from "@/pages/dashboard";
import ConsolePage from "@/pages/console";
import HistoryPage from "@/pages/history";
import CharactersPage from "@/pages/characters";
import ExpeditionsPage from "@/pages/expeditions";
import AuctionPage from "@/pages/auction";
import MailPage from "@/pages/mail";
import ServersPage from "@/pages/servers";
import SettingsPage from "@/pages/settings";
import CashShopPage from "@/pages/cashshop";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />

      <Route path="/">
        <Layout><DashboardPage /></Layout>
      </Route>
      <Route path="/console">
        <Layout><ConsolePage /></Layout>
      </Route>
      <Route path="/history">
        <Layout><HistoryPage /></Layout>
      </Route>
      <Route path="/characters">
        <Layout><CharactersPage /></Layout>
      </Route>
      <Route path="/expeditions">
        <Layout><ExpeditionsPage /></Layout>
      </Route>
      <Route path="/auction">
        <Layout><AuctionPage /></Layout>
      </Route>
      <Route path="/mail">
        <Layout><MailPage /></Layout>
      </Route>
      <Route path="/servers">
        <Layout><ServersPage /></Layout>
      </Route>
      <Route path="/settings">
        <Layout><SettingsPage /></Layout>
      </Route>
      <Route path="/cashshop">
        <Layout><CashShopPage /></Layout>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
