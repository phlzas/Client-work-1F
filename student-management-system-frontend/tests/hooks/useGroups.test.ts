import { renderHook, waitFor } from "@testing-library/react";
import { useGroups } from "@/hooks/useGroups";
import { invoke } from "@tauri-apps/api";

// Mock Tauri API
jest.mock("@tauri-apps/api", () => ({
  invoke: jest.fn(),
}));

const mockInvoke = invoke as jest.MockedFunction<typeof invoke>;

describe("useGroups Hook", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("loads groups successfully", async () => {
    const mockGroups = [
      { id: 1, name: "المجموعة الأولى" },
      { id: 2, name: "المجموعة الثانية" },
    ];

    mockInvoke.mockResolvedValue(mockGroups);

    const { result } = renderHook(() => useGroups());

    expect(result.current.loading).toBe(true);
    expect(result.current.groups).toEqual([]);
    expect(result.current.error).toBe(null);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.groups).toEqual(mockGroups);
    expect(result.current.error).toBe(null);
    expect(mockInvoke).toHaveBeenCalledWith("get_all_groups");
  });

  it("handles loading error", async () => {
    const errorMessage = "Failed to load groups";
    mockInvoke.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useGroups());

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.groups).toEqual([]);
    expect(result.current.error).toBe(errorMessage);
  });

  it("handles empty groups list", async () => {
    mockInvoke.mockResolvedValue([]);

    const { result } = renderHook(() => useGroups());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.groups).toEqual([]);
    expect(result.current.error).toBe(null);
  });

  it("handles invalid response format", async () => {
    mockInvoke.mockResolvedValue(null);

    const { result } = renderHook(() => useGroups());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.groups).toEqual([]);
    expect(result.current.error).toBe("Invalid response format");
  });

  it("retries on network error", async () => {
    mockInvoke
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValue([{ id: 1, name: "المجموعة الأولى" }]);

    const { result } = renderHook(() => useGroups());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Should eventually succeed after retry
    expect(result.current.groups).toEqual([{ id: 1, name: "المجموعة الأولى" }]);
    expect(result.current.error).toBe(null);
  });
});
