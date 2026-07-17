import {
  useCallback,
  useMemo,
  useState,
} from "react";

import type {
  SearchResult,
  TaskId,
} from "../search/search.types";

import {
  createCandidateKey,
  type CandidateItem,
} from "./candidate.types";

type CandidateMap = Record<
  string,
  CandidateItem
>;

export function useCandidateSelection() {
  const [
    candidatesByKey,
    setCandidatesByKey,
  ] = useState<CandidateMap>({});

  const candidates = useMemo(
    () => Object.values(candidatesByKey),
    [candidatesByKey],
  );

  const candidateCount = candidates.length;

  const isCandidateSelected = useCallback(
    (result: SearchResult): boolean => {
      const candidateKey =
        createCandidateKey(result);

      return Boolean(
        candidatesByKey[candidateKey],
      );
    },
    [candidatesByKey],
  );

  const toggleCandidate = useCallback(
    (
      task: TaskId,
      searchId: string,
      result: SearchResult,
    ) => {
      const candidateKey =
        createCandidateKey(result);

      setCandidatesByKey(
        (currentCandidates) => {
          if (
            currentCandidates[candidateKey]
          ) {
            const {
              [candidateKey]: _removed,
              ...remainingCandidates
            } = currentCandidates;

            return remainingCandidates;
          }

          return {
            ...currentCandidates,
            [candidateKey]: {
              key: candidateKey,
              task,
              searchId,
              result,
              selectedAt:
                new Date().toISOString(),
            },
          };
        },
      );
    },
    [],
  );

  const removeCandidate = useCallback(
    (candidateKey: string) => {
      setCandidatesByKey(
        (currentCandidates) => {
          if (
            !currentCandidates[candidateKey]
          ) {
            return currentCandidates;
          }

          const {
            [candidateKey]: _removed,
            ...remainingCandidates
          } = currentCandidates;

          return remainingCandidates;
        },
      );
    },
    [],
  );

  const clearCandidates = useCallback(
    () => {
      setCandidatesByKey({});
    },
    [],
  );

  return {
    candidates,
    candidateCount,
    isCandidateSelected,
    toggleCandidate,
    removeCandidate,
    clearCandidates,
  };
}