import { useEffect, useState } from "react";
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
  SearchMode,
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
import {
  resolveDresSubmissionMode,
  type DresCurrentTask,
  type DresSubmissionModeSetting,
} from "../features/dres/dres.api";
import "./AppShell.css";

interface SearchMutationInput {
  request: SearchRequest;
  searchMode: SearchMode;
}

export function AppShell() {
  const [selectedTask, setSelectedTask] =
    useState<TaskId>("task_1");
  const [
    currentDresTask,
    setCurrentDresTask,
  ] = useState<DresCurrentTask | null>(null);

  const [
    dresSubmissionModeSetting,
    setDresSubmissionModeSetting,
  ] = useState<DresSubmissionModeSetting>("AUTO");
  const [
    originalRequest,
    setOriginalRequest,
  ] = useState<SearchRequest | null>(null);

  const [
    originalVerificationIntent,
    setOriginalVerificationIntent,
  ] = useState(() => {
    try {
      return (
        window.localStorage.getItem(
          "aic-original-verification-intent",
        ) ?? ""
      );
    } catch {
      return "";
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(
        "aic-original-verification-intent",
        originalVerificationIntent,
      );
    } catch {
      // Ignore storage errors in private / restricted browser modes.
    }
  }, [originalVerificationIntent]);

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
    mutationFn: async ({
      request,
      searchMode,
    }: SearchMutationInput) => {
      if (
        searchMode === "standard"
      ) {
        return searchVideos(
          request,
        );
      }

      const startedAt =
        performance.now();

      const actionResponses:
        SearchResponse[] = [];

      for (
        const scene
        of request.scenes
      ) {
        const actionRequest:
          SearchRequest = {
          ...request,

          scenes: [
            scene,
          ],
        };

        try {
          const response =
            await searchVideos(
              actionRequest,
            );

          actionResponses.push(
            response,
          );
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : "Unknown search error.";

          throw new Error(
            `TRAKE Action ${scene.scene_id} failed: ${message}`,
          );
        }
      }

      const results =
        actionResponses.flatMap(
          (
            actionResponse,
            actionIndex,
          ) => {
            const scene =
              request.scenes[
                actionIndex
              ];

            return actionResponse.results.map(
              (result) => ({
                ...result,

                source_search_id:
                  actionResponse.search_id,

                matched_scene:
                  scene.scene_id,
              }),
            );
          },
        );

      const warnings =
        actionResponses.flatMap(
          (
            actionResponse,
            actionIndex,
          ) =>
            actionResponse.warnings.map(
              (warning) => ({
                ...warning,

                module:
                  `Action ${request.scenes[actionIndex].scene_id} · ${warning.module}`,
              }),
            ),
        );

      return {
        search_id:
          `trake-${Date.now()}`,

        task:
          request.task,

        query_mode:
          "trake",

        processing_time_ms:
          Math.round(
            performance.now() -
              startedAt,
          ),

        total_results:
          results.length,

        warnings,
        results,
      } satisfies SearchResponse;
    },

    onSuccess: (
      response,
      variables,
    ) => {
      setOriginalRequest(
        variables.request,
      );

      setActiveResponse(
        response,
      );

      setRefinementIteration(
        0,
      );
    },
  });

  function handleSearch(
    value: QueryBuilderValue,
  ) {
    const request = createSearchRequest(
      selectedTask,
      value,
    );

    searchMutation.mutate({
      request,
      searchMode:
        value.searchMode,
    });
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
  const dresSubmissionMode =
    resolveDresSubmissionMode(
      currentDresTask,
      dresSubmissionModeSetting,
    );
  return (
    <div className="app-shell">
      <AppHeader
        selectedTask={selectedTask}
        onTaskChange={setSelectedTask}
        currentDresTask={currentDresTask}
        onDresTaskChange={setCurrentDresTask}
        dresSubmissionModeSetting={
          dresSubmissionModeSetting
        }
        onDresSubmissionModeSettingChange={
          setDresSubmissionModeSetting
        }
      />

      <div className="app-shell__content">
        <QuerySidebar
          onSearch={handleSearch}
          originalVerificationIntent={
            originalVerificationIntent
          }
          onOriginalVerificationIntentChange={
            setOriginalVerificationIntent
          }
        />

        <ResultsWorkspace
          response={activeResponse}
          originalVerificationIntent={
            originalVerificationIntent
          }
          currentDresTaskName={
            currentDresTask?.name ?? ""
          }
          dresSubmissionMode={
            dresSubmissionMode
          }
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