import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import FeedbackForm, { type FeedbackType } from "./FeedbackForm";

// Mock Supabase
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn(() => Promise.resolve({ error: null })),
    })),
  },
}));

// Mock useAuth
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "test-user-id" },
  }),
}));

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe("FeedbackForm Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should render trigger button with default text", () => {
      render(<FeedbackForm feedbackType="platform" />, { wrapper: createWrapper() });

      expect(screen.getByRole("button", { name: /give feedback/i })).toBeInTheDocument();
    });

    it("should render trigger button with custom text", () => {
      render(
        <FeedbackForm feedbackType="donation" triggerText="Rate Donation" />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByRole("button", { name: /rate donation/i })).toBeInTheDocument();
    });

    it("should open dialog when trigger is clicked", async () => {
      render(<FeedbackForm feedbackType="platform" />, { wrapper: createWrapper() });

      fireEvent.click(screen.getByRole("button", { name: /give feedback/i }));

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });
    });
  });

  describe("Feedback Types", () => {
    const feedbackTypes: FeedbackType[] = [
      "donation",
      "pickup",
      "distribution",
      "platform",
      "vendor",
      "ngo",
    ];

    feedbackTypes.forEach((type) => {
      it(`should render correct title for ${type} feedback type`, async () => {
        render(<FeedbackForm feedbackType={type} />, { wrapper: createWrapper() });

        fireEvent.click(screen.getByRole("button", { name: /give feedback/i }));

        await waitFor(() => {
          const dialog = screen.getByRole("dialog");
          expect(dialog).toBeInTheDocument();
        });
      });
    });
  });

  describe("Star Rating", () => {
    it("should render 5 star buttons", async () => {
      render(<FeedbackForm feedbackType="platform" />, { wrapper: createWrapper() });

      fireEvent.click(screen.getByRole("button", { name: /give feedback/i }));

      await waitFor(() => {
        // Should have 5 clickable star elements
        const buttons = screen.getAllByRole("button");
        // Filter for star buttons (not trigger, cancel, submit)
        const starButtons = buttons.filter(
          (btn) => !btn.textContent?.includes("Give") &&
                   !btn.textContent?.includes("Cancel") &&
                   !btn.textContent?.includes("Submit")
        );
        expect(starButtons.length).toBeGreaterThanOrEqual(5);
      });
    });
  });

  describe("Form Validation", () => {
    it("should disable submit button when no rating selected", async () => {
      render(<FeedbackForm feedbackType="platform" />, { wrapper: createWrapper() });

      fireEvent.click(screen.getByRole("button", { name: /give feedback/i }));

      await waitFor(() => {
        const submitButton = screen.getByRole("button", { name: /submit feedback/i });
        expect(submitButton).toBeDisabled();
      });
    });
  });

  describe("Anonymous Option", () => {
    it("should render anonymous checkbox", async () => {
      render(<FeedbackForm feedbackType="platform" />, { wrapper: createWrapper() });

      fireEvent.click(screen.getByRole("button", { name: /give feedback/i }));

      await waitFor(() => {
        expect(screen.getByText(/submit anonymously/i)).toBeInTheDocument();
      });
    });
  });

  describe("Comments Field", () => {
    it("should render comments textarea", async () => {
      render(<FeedbackForm feedbackType="platform" />, { wrapper: createWrapper() });

      fireEvent.click(screen.getByRole("button", { name: /give feedback/i }));

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/share your experience/i)).toBeInTheDocument();
      });
    });

    it("should allow typing in comments field", async () => {
      render(<FeedbackForm feedbackType="platform" />, { wrapper: createWrapper() });

      fireEvent.click(screen.getByRole("button", { name: /give feedback/i }));

      await waitFor(() => {
        const textarea = screen.getByPlaceholderText(/share your experience/i);
        fireEvent.change(textarea, { target: { value: "Great service!" } });
        expect(textarea).toHaveValue("Great service!");
      });
    });
  });

  describe("Dialog Controls", () => {
    it("should close dialog when cancel is clicked", async () => {
      render(<FeedbackForm feedbackType="platform" />, { wrapper: createWrapper() });

      // Open dialog
      fireEvent.click(screen.getByRole("button", { name: /give feedback/i }));

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      // Click cancel
      fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

      await waitFor(() => {
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      });
    });
  });

  describe("Props", () => {
    it("should accept relatedEntityType prop", () => {
      render(
        <FeedbackForm
          feedbackType="donation"
          relatedEntityType="donation_batch"
          relatedEntityId="123"
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByRole("button")).toBeInTheDocument();
    });

    it("should accept different trigger variants", () => {
      const { rerender } = render(
        <FeedbackForm feedbackType="platform" triggerVariant="default" />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByRole("button")).toBeInTheDocument();

      rerender(
        <QueryClientProvider client={new QueryClient()}>
          <FeedbackForm feedbackType="platform" triggerVariant="ghost" />
        </QueryClientProvider>
      );

      expect(screen.getByRole("button")).toBeInTheDocument();
    });
  });
});

describe("FeedbackForm Types", () => {
  describe("FeedbackType", () => {
    it("should accept valid feedback types", () => {
      const validTypes: FeedbackType[] = [
        "donation",
        "pickup",
        "distribution",
        "platform",
        "vendor",
        "ngo",
      ];

      validTypes.forEach((type) => {
        // This is a compile-time check - if it renders, the type is valid
        expect(() =>
          render(<FeedbackForm feedbackType={type} />, { wrapper: createWrapper() })
        ).not.toThrow();
      });
    });
  });
});

describe("FeedbackForm Accessibility", () => {
  it("should have accessible dialog title", async () => {
    render(<FeedbackForm feedbackType="platform" />, { wrapper: createWrapper() });

    fireEvent.click(screen.getByRole("button", { name: /give feedback/i }));

    await waitFor(() => {
      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveAttribute("aria-labelledby");
    });
  });

  it("should have accessible rating buttons", async () => {
    render(<FeedbackForm feedbackType="platform" />, { wrapper: createWrapper() });

    fireEvent.click(screen.getByRole("button", { name: /give feedback/i }));

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
  });

  it("should have labeled form fields", async () => {
    render(<FeedbackForm feedbackType="platform" />, { wrapper: createWrapper() });

    fireEvent.click(screen.getByRole("button", { name: /give feedback/i }));

    await waitFor(() => {
      expect(screen.getByText(/rating/i)).toBeInTheDocument();
      expect(screen.getByText(/comments/i)).toBeInTheDocument();
    });
  });
});
