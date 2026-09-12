import { useState } from "react";
import { useMutation } from "@tanstack/react-query";

import {
  AppHeader,
  type TaskId,
} from "../features/header/AppHeader";

import {
  QuerySidebar,
} from "../features/query-builder/QuerySidebar";

import type {
  QueryBuilderValue,
} from "../features/query-builder/query.types";

import {
  ResultsWorkspace,
} from "../features/results/ResultsWorkspace";

import {
  searchVideos,
} from "../features/search/search.api";

import {
  createSearchRequest,
  type SearchRequest,
  type SearchResponse,
} from "../features/search/search.types";

import type {
  RefinementResponse,
} from "../features/refinement/refinement.types";
import type {
  DresCurrentTask,
} from "../features/dres/dres.api";
import "./AppShell.css";

export function AppShell() {
  const [selectedTask, setSelectedTask] =
    useState<TaskId>("task_1");
  const [
    currentDresTask,
    setCurrentDresTask,
  ] = useState<DresCurrentTask | null>(null);
  const [
    originalRequest,
    setOriginalRequest,
  ] = useState<SearchRequest | null>(null);

  const [
    activeResponse,
    setActiveResponse,
  ] = useState<
    SearchResponse | RefinementResponse | undefined
  >(undefined);

  const [
    refinementIteration,
    setRefinementIteration,
  ] = useState(0);

  const searchMutation = useMutation({
    mutationFn: searchVideos,

    onSuccess: (
      response,
      request,
    ) => {
      setOriginalRequest(request);
      setActiveResponse(response);
      setRefinementIteration(0);
    },
  });

  function handleSearch(
    value: QueryBuilderValue,
  ) {
    const request = createSearchRequest(
      selectedTask,
      value,
    );

    searchMutation.mutate(request);
  }

  function handleRefinementComplete(
    response: RefinementResponse,
  ) {
    setActiveResponse(response);

    setRefinementIteration(
      response.refinement_iteration,
    );
  }

  const errorMessage =
    searchMutation.error instanceof Error
      ? searchMutation.error.message
      : undefined;

  return (
    <div className="app-shell">
      <AppHeader
        selectedTask={selectedTask}
        onTaskChange={setSelectedTask}
        currentDresTask={currentDresTask}
        onDresTaskChange={setCurrentDresTask}
      />

      <div className="app-shell__content">
        <QuerySidebar
          onSearch={handleSearch}
        />

        <ResultsWorkspace
          response={activeResponse}
          originalRequest={
            originalRequest ?? undefined
          }
          refinementIteration={
            refinementIteration
          }
          isLoading={
            searchMutation.isPending
          }
          errorMessage={errorMessage}
          onRefinementComplete={
            handleRefinementComplete
          }
        />
      </div>
    </div>
  );
}