"use client";

import { useState, useEffect } from "react";
import { apiClient, AgentInfo, AgentsResponse } from "@/lib/api";

interface UseAgentsReturn {
  agents: AgentInfo[];
  defaultAgent: string;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useAgents(): UseAgentsReturn {
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [defaultAgent, setDefaultAgent] = useState<string>("supervisor");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAgents = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response: AgentsResponse = await apiClient.getAgents();
      setAgents(response.agents);
      setDefaultAgent(response.default_agent);
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Failed to fetch agents"),
      );
      // Set fallback agents on error
      setAgents([
        {
          id: "supervisor",
          label: "Supervisor",
          description: "Coordinating agents",
          color: "purple",
        },
        {
          id: "profile",
          label: "Profile Agent",
          description: "Analyzing your profile",
          color: "blue",
        },
        {
          id: "search",
          label: "Search Agent",
          description: "Finding scholarships",
          color: "emerald",
        },
        {
          id: "plan",
          label: "Plan Agent",
          description: "Planning your journey",
          color: "amber",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  return {
    agents,
    defaultAgent,
    isLoading,
    error,
    refetch: fetchAgents,
  };
}
