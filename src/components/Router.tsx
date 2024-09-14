import ProgramEditorPage from "../page/ProgramEditorPage";
import HomePage from "../page/HomePage";
import ProgramListPage from "../page/ProgramListPage";
import { Route, Switch } from "wouter";
import HillPage from "../page/HillPage";

type Route = {
  navName?: string;
  component: () => JSX.Element;
};

export const ALL_ROUTES: Record<string, Route> = {
  "/": {
    navName: "Home",
    component: HomePage,
  },
  "/hills/primary": {
    navName: "Hill",
    component: HillPage,
  },
  "/programs/:id": {
    component: ProgramEditorPage,
  },
  "/programs": {
    navName: "Programs",
    component: ProgramListPage,
  },
};

export const DEFAULT_ROUTE: keyof typeof ALL_ROUTES = "/";

export const Router = () => (
  <Switch>
    {Object.entries(ALL_ROUTES).map(([path, route]) => (
      <Route key={path} path={path} component={route.component} />
    ))}
    <Route component={ALL_ROUTES[DEFAULT_ROUTE].component} />
  </Switch>
);
