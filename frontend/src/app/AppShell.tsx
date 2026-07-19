import {
  useRef,
  useState,
} from "react";

import {
  useMutation,
} from "@tanstack/react-query";

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
} from "../features/search/search.types";

import "./AppShell.css";

export function AppShell() {
  const [selectedTask, setSelectedTask] =
    useState<TaskId>("task_1");

  const feedbackTextRef =
    useRef("");

  const searchMutation = useMutation({
    mutationFn: searchVideos,
  });

  function handleFeedbackChange(
    value: string,
  ) {
    feedbackTextRef.current = value;
  }

  function handleSearch(
    value: QueryBuilderValue,
  ) {
    const request = createSearchRequest(
      selectedTask,
      feedbackTextRef.current,
      value,
    );

    searchMutation.mutate(request);
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
        onFeedbackChange={
          handleFeedbackChange
        }
      />

      <div className="app-shell__content">
        <QuerySidebar
          onSearch={handleSearch}
        />

        <ResultsWorkspace
          response={searchMutation.data}
          isLoading={
            searchMutation.isPending
          }
          errorMessage={errorMessage}
        />
      </div>
    </div>
  );
}