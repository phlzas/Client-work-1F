import { useState, useEffect, useCallback } from "react";
import { ApiService } from "@/lib/api";

interface Group {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
}

interface GroupWithCount extends Group {
  student_count: number;
}

export function useGroups() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mutating, setMutating] = useState(false);
  const [lastFetch, setLastFetch] = useState<number>(0);

  // Cache duration: 5 minutes
  const CACHE_DURATION = 5 * 60 * 1000;

  const loadGroups = useCallback(
    async (showLoading = true, forceRefresh = false) => {
      // Skip if data is fresh and not forcing refresh
      const now = Date.now();
      if (
        !forceRefresh &&
        groups.length > 0 &&
        now - lastFetch < CACHE_DURATION
      ) {
        return;
      }

      try {
        if (showLoading) setLoading(true);
        setError(null);
        const groupsData = await ApiService.getAllGroups();
        setGroups(groupsData);
        setLastFetch(now);
      } catch (err) {
        console.error("Failed to load groups:", err);
        const errorMessage =
          err instanceof Error ? err.message : "Failed to load groups";
        setError(errorMessage);

        // Only use fallback on initial load, not on refresh
        // Do not inject temporary/fallback groups silently
      } finally {
        if (showLoading) setLoading(false);
      }
    },
    [groups.length, lastFetch]
  );

  useEffect(() => {
    loadGroups();
  }, []);

  const addGroup = async (name: string): Promise<Group> => {
    setMutating(true);
    try {
      const newGroup = await ApiService.addGroup(name);
      // Optimistic update
      setGroups((prev) => [...prev, newGroup]);
      return newGroup;
    } catch (err) {
      // Revert on error by reloading
      await loadGroups(false);
      throw err;
    } finally {
      setMutating(false);
    }
  };

  const updateGroup = async (id: number, name: string): Promise<void> => {
    setMutating(true);
    const originalGroups = groups;

    try {
      // Optimistic update
      setGroups((prev) =>
        prev.map((group) =>
          group.id === id
            ? { ...group, name, updated_at: new Date().toISOString() }
            : group
        )
      );

      await ApiService.updateGroup(id, name);
    } catch (err) {
      // Revert on error
      setGroups(originalGroups);
      throw err;
    } finally {
      setMutating(false);
    }
  };

  const deleteGroup = async (id: number): Promise<boolean> => {
    setMutating(true);
    const originalGroups = groups;

    try {
      // Optimistic update
      setGroups((prev) => prev.filter((group) => group.id !== id));

      const result = await ApiService.deleteGroup(id);
      if (!result) {
        // Revert if deletion failed
        setGroups(originalGroups);
      }
      return result;
    } catch (err) {
      // Revert on error
      setGroups(originalGroups);
      throw err;
    } finally {
      setMutating(false);
    }
  };

  const forceDeleteGroupWithReassignment = async (
    id: number,
    defaultGroupName: string
  ): Promise<boolean> => {
    setMutating(true);
    const originalGroups = groups;

    try {
      // Optimistic update
      setGroups((prev) => prev.filter((group) => group.id !== id));

      const result = await ApiService.forceDeleteGroupWithReassignment(
        id,
        defaultGroupName
      );
      if (!result) {
        // Revert if deletion failed
        setGroups(originalGroups);
      }
      return result;
    } catch (err) {
      // Revert on error
      setGroups(originalGroups);
      throw err;
    } finally {
      setMutating(false);
    }
  };

  const getStudentCountByGroupId = async (groupId: number): Promise<number> => {
    try {
      return await ApiService.getStudentsCountByGroupId(groupId);
    } catch (err) {
      console.error(`Failed to get student count for group ${groupId}:`, err);
      // Return 0 as fallback instead of throwing
      return 0;
    }
  };

  return {
    groups,
    loading,
    error,
    mutating,
    loadGroups,
    addGroup,
    updateGroup,
    deleteGroup,
    forceDeleteGroupWithReassignment,
    getStudentCountByGroupId,
  };
}

export function useGroupsWithCounts() {
  const [groups, setGroups] = useState<GroupWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadGroups = async () => {
    try {
      setLoading(true);
      setError(null);
      const groupsData = await ApiService.getAllGroupsWithCounts();
      setGroups(groupsData);
    } catch (err) {
      console.error("Failed to load groups with counts:", err);
      setError(err instanceof Error ? err.message : "Failed to load groups");
      // Do not create temporary placeholder groups
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGroups();
  }, []);

  return {
    groups,
    loading,
    error,
    loadGroups,
  };
}
