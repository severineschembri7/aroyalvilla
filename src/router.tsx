import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

const runtime = typeof window !== "undefined" ? window.location.hostname : "";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient, runtime },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
