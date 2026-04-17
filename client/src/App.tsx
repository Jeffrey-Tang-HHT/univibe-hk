import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import { lazy, Suspense } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import { AuthProvider } from "./contexts/AuthContext";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Feed from "./pages/Feed";
import Dating from "./pages/Dating";
import Tools from "./pages/Tools";
import Profile from "./pages/Profile";

// Lazy load Plaza (heavy 3D deps)
const Plaza = lazy(() => import("./pages/Plaza"));

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/login"} component={Login} />
      <Route path={"/feed"} component={Feed} />
      <Route path={"/dating"} component={Dating} />
      <Route path={"/tools"} component={Tools} />
      <Route path={"/plaza"}>
        {() => (
          <Suspense fallback={<div className="h-screen w-screen flex items-center justify-center bg-background"><div className="text-muted-foreground text-sm">Loading 3D Plaza...</div></div>}>
            <Plaza />
          </Suspense>
        )}
      </Route>
      <Route path={"/profile"} component={Profile} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light" switchable>
        <LanguageProvider>
          <AuthProvider>
            <TooltipProvider>
              <Toaster />
              <Router />
            </TooltipProvider>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
