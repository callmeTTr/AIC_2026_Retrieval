import { useQuery } from "@tanstack/react-query";

import { getHealthStatus } from "./health.api";

export function HealthStatus() {
  const healthQuery = useQuery({
    queryKey: ["backend-health"],
    queryFn: getHealthStatus,
    retry: 1,
  });

  if (healthQuery.isPending) {
    return <p>Connecting to backend...</p>;
  }

  if (healthQuery.isError) {
    return (
      <div>
        <strong>Backend connection failed</strong>
        <p>{healthQuery.error.message}</p>
      </div>
    );
  }

  return (
    <div>
      <strong>Backend connected</strong>
      <p>
        {healthQuery.data.service}: {healthQuery.data.status}
      </p>
    </div>
  );
}