import { useState, useEffect } from "react";
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

  const loadGroups = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setError(null);
      const groupsData = await ApiService.getAllGroups();
      setGroups(groupsData);
    } catch (err) {
      console.error("Failed to load groups:", err);
      setError(err instanceof Error ? err.message : "Failed to load groups");

      // Only use fallback on initial load, not on refresh
      if (groups.length === 0) {
        setGroups([
          { id: 1, name: "Group A", created_at: "", updated_at: "" },
          { id: 2, name: "Group B", created_at: "", updated_at: "" },
          { id: 3, name: "Group C", created_at: "", updated_at: "" },
        ]);
      }
    } finally {
      if (showLoading) setLoading(false);
    }
  };

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

  return {
    groups,
    loading,
    error,
    mutating,
    loadGroups,
    addGroup,
    updateGroup,
    deleteGroup,
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
      // Fallback to default groups if API fails
      setGroups([
        {
          id: 1,
          name: "Group A",
          student_count: 0,
          created_at: "",
          updated_at: "",
        },
        {
          id: 2,
          name: "Group B",
          student_count: 0,
          created_at: "",
          updated_at: "",
        },
        {
          id: 3,
          name: "Group C",
          student_count: 0,
          created_at: "",
          updated_at: "",
        },
      ]);
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
