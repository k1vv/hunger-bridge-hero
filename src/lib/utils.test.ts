import { describe, it, expect } from "vitest";
import { cn } from "./utils";

describe("cn (className utility)", () => {
  describe("basic functionality", () => {
    it("combines multiple class names", () => {
      expect(cn("class1", "class2")).toBe("class1 class2");
    });

    it("returns single class name unchanged", () => {
      expect(cn("single-class")).toBe("single-class");
    });

    it("handles empty arguments", () => {
      expect(cn()).toBe("");
    });
  });

  describe("conditional classes", () => {
    it("handles boolean conditions", () => {
      expect(cn("base", true && "active")).toBe("base active");
      expect(cn("base", false && "inactive")).toBe("base");
    });

    it("handles undefined and null values", () => {
      expect(cn("base", undefined, "end")).toBe("base end");
      expect(cn("base", null, "end")).toBe("base end");
    });

    it("handles ternary operators", () => {
      const isActive = true;
      expect(cn("base", isActive ? "active" : "inactive")).toBe("base active");
    });
  });

  describe("object syntax", () => {
    it("handles object with boolean values", () => {
      expect(cn({ active: true, disabled: false })).toBe("active");
    });

    it("combines objects with strings", () => {
      expect(cn("base", { active: true })).toBe("base active");
    });

    it("handles multiple objects", () => {
      expect(cn({ a: true }, { b: true }, { c: false })).toBe("a b");
    });
  });

  describe("array syntax", () => {
    it("handles array of classes", () => {
      expect(cn(["class1", "class2"])).toBe("class1 class2");
    });

    it("handles nested arrays", () => {
      expect(cn(["outer", ["inner1", "inner2"]])).toBe("outer inner1 inner2");
    });

    it("handles mixed array content", () => {
      expect(cn(["base", false && "hidden", "visible"])).toBe("base visible");
    });
  });

  describe("tailwind-merge functionality", () => {
    it("merges conflicting tailwind padding classes", () => {
      expect(cn("p-4", "p-8")).toBe("p-8");
    });

    it("merges conflicting tailwind margin classes", () => {
      expect(cn("m-2", "m-4")).toBe("m-4");
    });

    it("merges conflicting tailwind width classes", () => {
      expect(cn("w-full", "w-1/2")).toBe("w-1/2");
    });

    it("merges conflicting tailwind text color classes", () => {
      expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
    });

    it("merges conflicting tailwind background classes", () => {
      expect(cn("bg-white", "bg-gray-100")).toBe("bg-gray-100");
    });

    it("keeps non-conflicting classes", () => {
      expect(cn("p-4", "m-4", "text-center")).toBe("p-4 m-4 text-center");
    });

    it("merges responsive variants correctly", () => {
      expect(cn("md:p-4", "md:p-8")).toBe("md:p-8");
    });

    it("keeps different responsive variants", () => {
      expect(cn("p-4", "md:p-8", "lg:p-12")).toBe("p-4 md:p-8 lg:p-12");
    });

    it("merges hover states correctly", () => {
      expect(cn("hover:bg-red-500", "hover:bg-blue-500")).toBe("hover:bg-blue-500");
    });

    it("handles complex tailwind class combinations", () => {
      const result = cn(
        "px-4 py-2 bg-blue-500 text-white rounded",
        "hover:bg-blue-600",
        true && "cursor-pointer",
        false && "opacity-50",
        { "font-bold": true }
      );

      expect(result).toContain("px-4");
      expect(result).toContain("py-2");
      expect(result).toContain("bg-blue-500");
      expect(result).toContain("hover:bg-blue-600");
      expect(result).toContain("cursor-pointer");
      expect(result).not.toContain("opacity-50");
      expect(result).toContain("font-bold");
    });
  });

  describe("edge cases", () => {
    it("handles empty strings", () => {
      expect(cn("", "class1", "")).toBe("class1");
    });

    it("handles whitespace-only strings", () => {
      expect(cn("  ", "class1")).toBe("class1");
    });

    it("handles mixed falsy values", () => {
      expect(cn(false, null, undefined, 0, "", "valid")).toBe("valid");
    });

    it("handles number inputs (truthy check)", () => {
      // Numbers other than 0 are truthy but shouldn't be class names
      expect(cn("class1", { numbered: 1 })).toBe("class1 numbered");
    });
  });

  describe("real-world usage patterns", () => {
    it("handles component variant pattern", () => {
      const variant = "primary";
      const size = "large";
      const disabled = false;

      const result = cn(
        "button-base",
        {
          "btn-primary": variant === "primary",
          "btn-secondary": variant === "secondary",
          "btn-lg": size === "large",
          "btn-sm": size === "small",
          "opacity-50 cursor-not-allowed": disabled,
        }
      );

      expect(result).toBe("button-base btn-primary btn-lg");
    });

    it("handles state-based styling", () => {
      const isActive = true;
      const isHovered = false;
      const isDisabled = false;

      const result = cn(
        "base-style",
        isActive && "active-style",
        isHovered && "hover-style",
        isDisabled && "disabled-style"
      );

      expect(result).toBe("base-style active-style");
    });

    it("handles override pattern for component props", () => {
      const defaultClasses = "p-4 text-gray-700 bg-white";
      const userClasses = "p-8 text-red-500";

      const result = cn(defaultClasses, userClasses);

      // tailwind-merge should override p-4 with p-8 and text-gray-700 with text-red-500
      expect(result).toBe("bg-white p-8 text-red-500");
    });
  });
});
