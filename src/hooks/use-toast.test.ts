import { describe, it, expect, beforeEach, vi } from "vitest";
import { reducer } from "./use-toast";

// Define types locally for testing
type ToasterToast = {
  id: string;
  title?: string;
  description?: string;
  open?: boolean;
};

type State = {
  toasts: ToasterToast[];
};

type Action =
  | { type: "ADD_TOAST"; toast: ToasterToast }
  | { type: "UPDATE_TOAST"; toast: Partial<ToasterToast> }
  | { type: "DISMISS_TOAST"; toastId?: string }
  | { type: "REMOVE_TOAST"; toastId?: string };

describe("useToast reducer", () => {
  const initialState: State = { toasts: [] };

  describe("ADD_TOAST action", () => {
    it("adds a new toast to empty state", () => {
      const newToast: ToasterToast = { id: "1", title: "Test Toast" };
      const action: Action = { type: "ADD_TOAST", toast: newToast };

      const result = reducer(initialState, action);

      expect(result.toasts).toHaveLength(1);
      expect(result.toasts[0]).toEqual(newToast);
    });

    it("prepends new toast and removes old ones due to TOAST_LIMIT of 1", () => {
      const existingState: State = {
        toasts: [{ id: "1", title: "First Toast" }],
      };
      const newToast: ToasterToast = { id: "2", title: "Second Toast" };
      const action: Action = { type: "ADD_TOAST", toast: newToast };

      const result = reducer(existingState, action);

      // TOAST_LIMIT is 1, so only the newest toast is kept
      expect(result.toasts).toHaveLength(1);
      expect(result.toasts[0].id).toBe("2");
    });

    it("limits toasts to TOAST_LIMIT (1)", () => {
      const existingState: State = {
        toasts: [{ id: "1", title: "First Toast" }],
      };
      const newToast: ToasterToast = { id: "2", title: "Second Toast" };
      const action: Action = { type: "ADD_TOAST", toast: newToast };

      const result = reducer(existingState, action);

      // Should only keep the newest toast
      expect(result.toasts).toHaveLength(1);
      expect(result.toasts[0].id).toBe("2");
    });

    it("preserves toast properties", () => {
      const newToast: ToasterToast = {
        id: "1",
        title: "Title",
        description: "Description",
        open: true,
      };
      const action: Action = { type: "ADD_TOAST", toast: newToast };

      const result = reducer(initialState, action);

      expect(result.toasts[0].title).toBe("Title");
      expect(result.toasts[0].description).toBe("Description");
      expect(result.toasts[0].open).toBe(true);
    });
  });

  describe("UPDATE_TOAST action", () => {
    it("updates existing toast by id", () => {
      const existingState: State = {
        toasts: [{ id: "1", title: "Original Title", open: true }],
      };
      const action: Action = {
        type: "UPDATE_TOAST",
        toast: { id: "1", title: "Updated Title" },
      };

      const result = reducer(existingState, action);

      expect(result.toasts[0].title).toBe("Updated Title");
      expect(result.toasts[0].open).toBe(true); // Preserves other properties
    });

    it("does not modify other toasts", () => {
      const existingState: State = {
        toasts: [
          { id: "1", title: "Toast 1" },
          { id: "2", title: "Toast 2" },
        ],
      };
      const action: Action = {
        type: "UPDATE_TOAST",
        toast: { id: "1", title: "Updated Toast 1" },
      };

      const result = reducer(existingState, action);

      expect(result.toasts[0].title).toBe("Updated Toast 1");
      expect(result.toasts[1].title).toBe("Toast 2");
    });

    it("handles non-existent toast id gracefully", () => {
      const existingState: State = {
        toasts: [{ id: "1", title: "Toast 1" }],
      };
      const action: Action = {
        type: "UPDATE_TOAST",
        toast: { id: "999", title: "Non-existent" },
      };

      const result = reducer(existingState, action);

      expect(result.toasts).toHaveLength(1);
      expect(result.toasts[0].title).toBe("Toast 1");
    });

    it("can update multiple properties at once", () => {
      const existingState: State = {
        toasts: [{ id: "1", title: "Original", description: "Desc", open: true }],
      };
      const action: Action = {
        type: "UPDATE_TOAST",
        toast: { id: "1", title: "New Title", description: "New Desc" },
      };

      const result = reducer(existingState, action);

      expect(result.toasts[0].title).toBe("New Title");
      expect(result.toasts[0].description).toBe("New Desc");
      expect(result.toasts[0].open).toBe(true);
    });
  });

  describe("DISMISS_TOAST action", () => {
    it("sets open to false for specific toast", () => {
      const existingState: State = {
        toasts: [{ id: "1", title: "Toast", open: true }],
      };
      const action: Action = { type: "DISMISS_TOAST", toastId: "1" };

      const result = reducer(existingState, action);

      expect(result.toasts[0].open).toBe(false);
    });

    it("dismisses all toasts when no toastId provided", () => {
      const existingState: State = {
        toasts: [
          { id: "1", title: "Toast 1", open: true },
          { id: "2", title: "Toast 2", open: true },
        ],
      };
      const action: Action = { type: "DISMISS_TOAST" };

      const result = reducer(existingState, action);

      result.toasts.forEach((toast) => {
        expect(toast.open).toBe(false);
      });
    });

    it("preserves other toast properties when dismissing", () => {
      const existingState: State = {
        toasts: [{ id: "1", title: "Toast", description: "Desc", open: true }],
      };
      const action: Action = { type: "DISMISS_TOAST", toastId: "1" };

      const result = reducer(existingState, action);

      expect(result.toasts[0].title).toBe("Toast");
      expect(result.toasts[0].description).toBe("Desc");
      expect(result.toasts[0].open).toBe(false);
    });

    it("only dismisses the specified toast", () => {
      const existingState: State = {
        toasts: [
          { id: "1", title: "Toast 1", open: true },
          { id: "2", title: "Toast 2", open: true },
        ],
      };
      const action: Action = { type: "DISMISS_TOAST", toastId: "1" };

      const result = reducer(existingState, action);

      expect(result.toasts[0].open).toBe(false);
      expect(result.toasts[1].open).toBe(true);
    });
  });

  describe("REMOVE_TOAST action", () => {
    it("removes specific toast by id", () => {
      const existingState: State = {
        toasts: [
          { id: "1", title: "Toast 1" },
          { id: "2", title: "Toast 2" },
        ],
      };
      const action: Action = { type: "REMOVE_TOAST", toastId: "1" };

      const result = reducer(existingState, action);

      expect(result.toasts).toHaveLength(1);
      expect(result.toasts[0].id).toBe("2");
    });

    it("removes all toasts when no toastId provided", () => {
      const existingState: State = {
        toasts: [
          { id: "1", title: "Toast 1" },
          { id: "2", title: "Toast 2" },
        ],
      };
      const action: Action = { type: "REMOVE_TOAST" };

      const result = reducer(existingState, action);

      expect(result.toasts).toHaveLength(0);
    });

    it("handles removing non-existent toast gracefully", () => {
      const existingState: State = {
        toasts: [{ id: "1", title: "Toast 1" }],
      };
      const action: Action = { type: "REMOVE_TOAST", toastId: "999" };

      const result = reducer(existingState, action);

      expect(result.toasts).toHaveLength(1);
      expect(result.toasts[0].id).toBe("1");
    });

    it("handles empty state", () => {
      const action: Action = { type: "REMOVE_TOAST", toastId: "1" };

      const result = reducer(initialState, action);

      expect(result.toasts).toHaveLength(0);
    });
  });

  describe("state immutability", () => {
    it("returns new state object on ADD_TOAST", () => {
      const action: Action = { type: "ADD_TOAST", toast: { id: "1", title: "Test" } };

      const result = reducer(initialState, action);

      expect(result).not.toBe(initialState);
    });

    it("returns new state object on UPDATE_TOAST", () => {
      const existingState: State = {
        toasts: [{ id: "1", title: "Original" }],
      };
      const action: Action = { type: "UPDATE_TOAST", toast: { id: "1", title: "Updated" } };

      const result = reducer(existingState, action);

      expect(result).not.toBe(existingState);
      expect(result.toasts).not.toBe(existingState.toasts);
    });

    it("returns new state object on DISMISS_TOAST", () => {
      const existingState: State = {
        toasts: [{ id: "1", title: "Test", open: true }],
      };
      const action: Action = { type: "DISMISS_TOAST", toastId: "1" };

      const result = reducer(existingState, action);

      expect(result).not.toBe(existingState);
    });

    it("returns new state object on REMOVE_TOAST", () => {
      const existingState: State = {
        toasts: [{ id: "1", title: "Test" }],
      };
      const action: Action = { type: "REMOVE_TOAST", toastId: "1" };

      const result = reducer(existingState, action);

      expect(result).not.toBe(existingState);
    });
  });

  describe("edge cases", () => {
    it("handles empty title and description", () => {
      const toast: ToasterToast = { id: "1" };
      const action: Action = { type: "ADD_TOAST", toast };

      const result = reducer(initialState, action);

      expect(result.toasts[0].id).toBe("1");
      expect(result.toasts[0].title).toBeUndefined();
      expect(result.toasts[0].description).toBeUndefined();
    });

    it("handles toast with all properties", () => {
      const toast: ToasterToast = {
        id: "1",
        title: "Title",
        description: "Description",
        open: true,
      };
      const action: Action = { type: "ADD_TOAST", toast };

      const result = reducer(initialState, action);

      expect(result.toasts[0]).toEqual(toast);
    });
  });
});
