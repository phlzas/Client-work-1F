"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus,
  Loader2,
  AlertCircle,
  Edit2,
  Check,
  X,
  Users,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { useGroups } from "@/hooks/useGroups";

interface GroupManagementProps {
  onStatusChange: (status: string, error?: string) => void;
}

export function GroupManagement({ onStatusChange }: GroupManagementProps) {
  const {
    groups,
    loading: groupsLoading,
    error: groupsError,
    mutating: groupsMutating,
    addGroup: addGroupToBackend,
    updateGroup: updateGroupInBackend,
    deleteGroup: deleteGroupFromBackend,
    getStudentCountByGroupId,
  } = useGroups();

  // Local state for group management
  const [newGroup, setNewGroup] = useState("");
  const [editingGroupId, setEditingGroupId] = useState<number | null>(null);
  const [editingGroupName, setEditingGroupName] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<{
    id: number;
    name: string;
    studentCount: number;
  } | null>(null);
  const [groupStudentCounts, setGroupStudentCounts] = useState<
    Record<number, number>
  >({});
  const [loadingStudentCounts, setLoadingStudentCounts] = useState(false);

  // Memoize group IDs to prevent unnecessary effect runs
  const groupIds = useMemo(() => groups.map((g) => g.id).sort(), [groups]);

  // Optimized student count loading with parallel requests
  const loadStudentCounts = useCallback(async () => {
    if (groupIds.length === 0 || groupsLoading || loadingStudentCounts) {
      return;
    }

    setLoadingStudentCounts(true);

    try {
      // Load all counts in parallel instead of sequentially
      const countPromises = groupIds.map(async (groupId) => {
        try {
          const count = await getStudentCountByGroupId(groupId);
          return { groupId, count };
        } catch (error) {
          console.warn(
            `Could not load student count for group ${groupId}:`,
            error
          );
          return { groupId, count: 0 };
        }
      });

      const results = await Promise.all(countPromises);

      // Convert results to counts object
      const counts = results.reduce((acc, { groupId, count }) => {
        acc[groupId] = count;
        return acc;
      }, {} as Record<number, number>);

      setGroupStudentCounts(counts);
    } catch (error) {
      console.error("Failed to load student counts:", error);
      onStatusChange("", "فشل في تحميل عدد الطلاب");
    } finally {
      setLoadingStudentCounts(false);
    }
  }, [
    groupIds,
    groupsLoading,
    loadingStudentCounts,
    getStudentCountByGroupId,
    onStatusChange,
  ]);

  // Load student counts when group IDs change
  useEffect(() => {
    loadStudentCounts();
  }, [loadStudentCounts]);

  // Memoized validation function
  const validateGroupName = useCallback(
    (name: string, excludeId?: number) => {
      const trimmedName = name.trim();
      if (!trimmedName) {
        return "اسم المجموعة مطلوب";
      }

      const exists = groups.some(
        (group) => group.id !== excludeId && group.name === trimmedName
      );

      if (exists) {
        return "اسم المجموعة موجود بالفعل";
      }

      return null;
    },
    [groups]
  );

  const addGroup = useCallback(async () => {
    const validationError = validateGroupName(newGroup);
    if (validationError) {
      onStatusChange("", validationError);
      return;
    }

    try {
      const newGroupData = await addGroupToBackend(newGroup.trim());
      setNewGroup("");
      // Update student counts for the new group
      setGroupStudentCounts((prev) => ({ ...prev, [newGroupData.id]: 0 }));
      onStatusChange("تم إضافة المجموعة بنجاح");
    } catch (error) {
      console.error("Failed to add group:", error);
      onStatusChange("", "فشل في إضافة المجموعة");
    }
  }, [newGroup, validateGroupName, addGroupToBackend, onStatusChange]);

  const startEditingGroup = useCallback(
    (groupId: number, currentName: string) => {
      setEditingGroupId(groupId);
      setEditingGroupName(currentName);
    },
    []
  );

  const cancelEditingGroup = useCallback(() => {
    setEditingGroupId(null);
    setEditingGroupName("");
  }, []);

  const saveGroupEdit = useCallback(async () => {
    if (!editingGroupId || !editingGroupName.trim()) return;

    const validationError = validateGroupName(editingGroupName, editingGroupId);
    if (validationError) {
      onStatusChange("", validationError);
      return;
    }

    try {
      await updateGroupInBackend(editingGroupId, editingGroupName.trim());
      setEditingGroupId(null);
      setEditingGroupName("");
      onStatusChange("تم تحديث اسم المجموعة بنجاح");
    } catch (error) {
      console.error("Failed to update group:", error);
      onStatusChange("", "فشل في تحديث اسم المجموعة");
    }
  }, [
    editingGroupId,
    editingGroupName,
    validateGroupName,
    updateGroupInBackend,
    onStatusChange,
  ]);

  const initiateDeleteGroup = useCallback(
    async (groupId: number, groupName: string) => {
      try {
        const studentCount = await getStudentCountByGroupId(groupId);
        setGroupToDelete({ id: groupId, name: groupName, studentCount });
        setDeleteDialogOpen(true);
      } catch (error) {
        console.error("Failed to get student count:", error);
        onStatusChange("", "فشل في التحقق من عدد الطلاب في المجموعة");
      }
    },
    [getStudentCountByGroupId, onStatusChange]
  );

  const confirmDeleteGroup = useCallback(async () => {
    if (!groupToDelete) return;

    try {
      const success = await deleteGroupFromBackend(groupToDelete.id);

      if (success) {
        // Remove from student counts
        setGroupStudentCounts((prev) => {
          const newCounts = { ...prev };
          delete newCounts[groupToDelete.id];
          return newCounts;
        });
        onStatusChange("تم حذف المجموعة بنجاح");
      } else {
        onStatusChange("", "فشل في حذف المجموعة");
      }
    } catch (error) {
      console.error("Failed to delete group:", error);
      onStatusChange("", "فشل في حذف المجموعة");
    } finally {
      setDeleteDialogOpen(false);
      setGroupToDelete(null);
    }
  }, [groupToDelete, deleteGroupFromBackend, onStatusChange]);

  // Memoized handlers for keyboard events
  const handleNewGroupKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        addGroup();
      }
    },
    [addGroup]
  );

  const handleEditKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        saveGroupEdit();
      } else if (e.key === "Escape") {
        e.preventDefault();
        cancelEditingGroup();
      }
    },
    [saveGroupEdit, cancelEditingGroup]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">إدارة المجموعات</h3>
        {(groupsLoading || groupsMutating || loadingStudentCounts) && (
          <Loader2 className="h-4 w-4 animate-spin" />
        )}
      </div>

      {groupsError && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            خطأ في تحميل المجموعات: {groupsError}
          </AlertDescription>
        </Alert>
      )}

      {/* Add Group Form */}
      <div className="flex gap-2">
        <Input
          placeholder="اسم المجموعة الجديدة"
          value={newGroup}
          onChange={(e) => setNewGroup(e.target.value)}
          onKeyDown={handleNewGroupKeyDown}
          disabled={groupsLoading || groupsMutating}
        />
        <Button
          onClick={addGroup}
          size="sm"
          disabled={groupsLoading || groupsMutating || !newGroup.trim()}
        >
          {groupsMutating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          إضافة
        </Button>
      </div>

      {/* Groups List */}
      <div className="space-y-2">
        {groupsLoading ? (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            جاري تحميل المجموعات...
          </div>
        ) : groups.length === 0 ? (
          <div className="text-sm text-gray-500 p-4 text-center border-2 border-dashed border-gray-200 rounded-lg">
            لا توجد مجموعات. أضف مجموعة جديدة للبدء.
          </div>
        ) : (
          groups.map((group) => (
            <div
              key={group.id}
              className="flex items-center justify-between p-3 border rounded-lg bg-gray-50"
            >
              <div className="flex items-center gap-3">
                {editingGroupId === group.id ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={editingGroupName}
                      onChange={(e) => setEditingGroupName(e.target.value)}
                      onKeyDown={handleEditKeyDown}
                      className="w-48"
                      autoFocus
                      disabled={groupsMutating}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={saveGroupEdit}
                      disabled={groupsMutating || !editingGroupName.trim()}
                    >
                      <Check className="h-4 w-4 text-green-600" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={cancelEditingGroup}
                      disabled={groupsMutating}
                    >
                      <X className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{group.name}</span>
                    <Badge
                      variant="outline"
                      className="flex items-center gap-1"
                    >
                      <Users className="h-3 w-3" />
                      {loadingStudentCounts ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        `${groupStudentCounts[group.id] ?? 0} طالب`
                      )}
                    </Badge>
                  </div>
                )}
              </div>

              {editingGroupId !== group.id && (
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => startEditingGroup(group.id, group.name)}
                    disabled={groupsMutating}
                    title="تعديل اسم المجموعة"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => initiateDeleteGroup(group.id, group.name)}
                    disabled={groupsMutating}
                    title="حذف المجموعة"
                    className="hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Group Deletion Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              تأكيد حذف المجموعة
            </DialogTitle>
            <DialogDescription className="text-right">
              {groupToDelete && (
                <div className="space-y-2">
                  <p>هل أنت متأكد من حذف المجموعة "{groupToDelete.name}"؟</p>
                  {groupToDelete.studentCount > 0 ? (
                    <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <div className="flex items-center gap-2 text-orange-800">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="font-medium">تحذير:</span>
                      </div>
                      <p className="text-orange-700 mt-1">
                        هذه المجموعة تحتوي على {groupToDelete.studentCount}{" "}
                        طالب. سيتم حذف المجموعة والطلاب معاً.
                      </p>
                    </div>
                  ) : (
                    <p className="text-gray-600">
                      هذه المجموعة فارغة ويمكن حذفها بأمان.
                    </p>
                  )}
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={groupsMutating}
            >
              إلغاء
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteGroup}
              disabled={groupsMutating}
            >
              {groupsMutating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              {groupToDelete && groupToDelete.studentCount > 0
                ? "حذف المجموعة والطلاب"
                : "حذف المجموعة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
