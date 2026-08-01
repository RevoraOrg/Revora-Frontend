import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { OnchainBadge, type OnchainBadgeVariant } from "./OnchainBadge";

describe("OnchainBadge", () => {
  const variants: OnchainBadgeVariant[] = [
    "pending",
    "retrying",
    "confirming",
    "confirmed",
  ];

  it.each(variants)("renders the %s variant with correct role and testid", (variant) => {
    render(<OnchainBadge variant={variant} />);
    const badge = screen.getByTestId(`onchain-badge-${variant}`);
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveAttribute("role", "status");
  });

  it("renders pending with Clock icon and Pending label", () => {
    render(<OnchainBadge variant="pending" />);
    expect(screen.getByText("Pending")).toBeInTheDocument();
    expect(screen.getByTestId("onchain-badge-pending").querySelector("svg")).toBeInTheDocument();
  });

  it("renders retrying with RefreshCw icon and Retrying label", () => {
    render(<OnchainBadge variant="retrying" />);
    expect(screen.getByText("Retrying")).toBeInTheDocument();
    expect(screen.getByTestId("onchain-badge-retrying").querySelector("svg")).toBeInTheDocument();
  });

  it("renders confirming with ArrowUpCircle icon and Confirming label", () => {
    render(<OnchainBadge variant="confirming" currentConfirmations={3} targetConfirmations={12} />);
    expect(screen.getByText("Confirming")).toBeInTheDocument();
    const badge = screen.getByTestId("onchain-badge-confirming");
    expect(badge.querySelector("svg")).toBeInTheDocument();
  });

  it("renders confirmed with CheckCircle2 icon and Confirmed label", () => {
    render(<OnchainBadge variant="confirmed" />);
    expect(screen.getByText("Confirmed")).toBeInTheDocument();
    expect(screen.getByTestId("onchain-badge-confirmed").querySelector("svg")).toBeInTheDocument();
  });

  it("shows confirmation counter for confirming variant", () => {
    render(<OnchainBadge variant="confirming" currentConfirmations={5} targetConfirmations={12} />);
    expect(screen.getByText("/12")).toBeInTheDocument();
  });

  it("shows confirmation counter for confirmed variant", () => {
    render(<OnchainBadge variant="confirmed" currentConfirmations={12} targetConfirmations={12} />);
    expect(screen.getByText("/12")).toBeInTheDocument();
  });

  it("does not show confirmation counter for pending variant", () => {
    render(<OnchainBadge variant="pending" currentConfirmations={0} targetConfirmations={12} />);
    expect(screen.queryByText("/12")).not.toBeInTheDocument();
  });

  it("does not show confirmation counter for retrying variant", () => {
    render(<OnchainBadge variant="retrying" currentConfirmations={0} targetConfirmations={12} />);
    expect(screen.queryByText("/12")).not.toBeInTheDocument();
  });

  describe("aria-labels", () => {
    it("uses plain-language description for pending", () => {
      render(<OnchainBadge variant="pending" />);
      const badge = screen.getByTestId("onchain-badge-pending");
      expect(badge).toHaveAttribute(
        "aria-label",
        "Transaction pending - waiting for network confirmation",
      );
    });

    it("uses plain-language description for retrying", () => {
      render(<OnchainBadge variant="retrying" />);
      const badge = screen.getByTestId("onchain-badge-retrying");
      expect(badge).toHaveAttribute(
        "aria-label",
        "Transaction retrying - attempting to resubmit to the network",
      );
    });

    it("includes confirmation count in aria-label for confirming", () => {
      render(<OnchainBadge variant="confirming" currentConfirmations={3} targetConfirmations={12} />);
      const badge = screen.getByTestId("onchain-badge-confirming");
      expect(badge).toHaveAttribute(
        "aria-label",
        "Transaction confirming - 3 of 12 confirmations received",
      );
    });

    it("includes confirmation count in aria-label for confirmed", () => {
      render(<OnchainBadge variant="confirmed" currentConfirmations={12} targetConfirmations={12} />);
      const badge = screen.getByTestId("onchain-badge-confirmed");
      expect(badge).toHaveAttribute(
        "aria-label",
        "Transaction confirmed with 12 of 12 confirmations",
      );
    });

    it("handles zero confirmations gracefully in aria-label", () => {
      render(<OnchainBadge variant="confirming" currentConfirmations={0} targetConfirmations={0} />);
      const badge = screen.getByTestId("onchain-badge-confirming");
      expect(badge).toHaveAttribute(
        "aria-label",
        "Transaction confirming - 0 of 0 confirmations received",
      );
    });
  });

  describe("sizes", () => {
    it.each(["sm", "md", "lg"] as const)("applies size class for %s", (size) => {
      const { container } = render(<OnchainBadge variant="confirmed" size={size} />);
      expect(container.firstChild).toHaveClass(`onchain-badge--${size}`);
    });
  });

  describe("className", () => {
    it("applies custom className", () => {
      const { container } = render(
        <OnchainBadge variant="confirmed" className="custom-class" />,
      );
      expect(container.firstChild).toHaveClass("custom-class");
    });
  });

  describe("icons", () => {
    it("renders icons with aria-hidden", () => {
      const { container } = render(<OnchainBadge variant="pending" />);
      const svg = container.querySelector("svg");
      expect(svg).toHaveAttribute("aria-hidden", "true");
    });
  });

  describe("edge cases", () => {
    it("renders confirming with zero confirmations", () => {
      render(<OnchainBadge variant="confirming" currentConfirmations={0} targetConfirmations={12} />);
      expect(screen.getByText("Confirming")).toBeInTheDocument();
      expect(screen.getByText("/12")).toBeInTheDocument();
    });

    it("renders confirming when current equals target", () => {
      render(<OnchainBadge variant="confirming" currentConfirmations={12} targetConfirmations={12} />);
      expect(screen.getByText("Confirming")).toBeInTheDocument();
    });

    it("renders confirmed with zero confirmations", () => {
      render(<OnchainBadge variant="confirmed" />);
      expect(screen.getByText("Confirmed")).toBeInTheDocument();
      expect(screen.getByText("/0")).toBeInTheDocument();
    });

    it("applies variant CSS class", () => {
      const { container } = render(<OnchainBadge variant="confirming" />);
      expect(container.firstChild).toHaveClass("onchain-badge--confirming");
    });
  });

  describe("subStatus", () => {
    it("renders speed_up label for pending with speed_up subStatus", () => {
      render(<OnchainBadge variant="pending" subStatus="speed_up" />);
      expect(screen.getByText("Speeding up")).toBeInTheDocument();
    });

    it("renders replacing label for pending with replacing subStatus", () => {
      render(<OnchainBadge variant="pending" subStatus="replacing" />);
      expect(screen.getByText("Replacing")).toBeInTheDocument();
    });

    it("renders default Pending label without subStatus", () => {
      render(<OnchainBadge variant="pending" />);
      expect(screen.getByText("Pending")).toBeInTheDocument();
    });

    it("renders finalized label for confirmed finalized", () => {
      render(<OnchainBadge variant="confirmed" subStatus="finalized" />);
      expect(screen.getByText("Finalized")).toBeInTheDocument();
    });

    it("renders reverted label and red variant for reverted", () => {
      const { container } = render(
        <OnchainBadge variant="confirmed" subStatus="reverted" currentConfirmations={0} targetConfirmations={12} />,
      );
      expect(screen.getByText("Reverted")).toBeInTheDocument();
      expect(container.firstChild).toHaveClass("onchain-badge--reverted");
    });

    it("includes subStatus in aria-label for pending speed_up", () => {
      render(<OnchainBadge variant="pending" subStatus="speed_up" />);
      expect(screen.getByTestId("onchain-badge-pending")).toHaveAttribute(
        "aria-label",
        expect.stringContaining("(speed up)"),
      );
    });
  });

  describe("retryAttempt/maxRetries", () => {
    it("renders retry count label", () => {
      render(<OnchainBadge variant="retrying" retryAttempt={2} maxRetries={3} />);
      expect(screen.getByText("Retrying 2/3")).toBeInTheDocument();
    });

    it("includes retry attempt in aria-label", () => {
      render(<OnchainBadge variant="retrying" retryAttempt={1} maxRetries={3} />);
      expect(screen.getByTestId("onchain-badge-retrying")).toHaveAttribute(
        "aria-label",
        expect.stringContaining("attempt 1/3"),
      );
    });

    it("renders default Retrying label without retryAttempt", () => {
      render(<OnchainBadge variant="retrying" />);
      expect(screen.getByText("Retrying")).toBeInTheDocument();
    });
  });

  describe("txHash", () => {
    it("renders truncated txHash and copy button", () => {
      render(
        <OnchainBadge
          variant="confirmed"
          txHash="0xabcdef1234567890abcdef1234567890abcdef12"
        />,
      );
      expect(screen.getByText("0xabcd...cdef")).toBeInTheDocument();
    });

    it("renders copy button", () => {
      render(
        <OnchainBadge
          variant="confirmed"
          txHash="0xabc123def456"
        />,
      );
      expect(screen.getByLabelText(/Copy transaction hash/)).toBeInTheDocument();
    });

    it("shows Copied state after clicking copy", async () => {
      render(
        <OnchainBadge
          variant="confirmed"
          txHash="0xabc123"
        />,
      );
      const btn = screen.getByLabelText(/Copy transaction hash/);
      fireEvent.click(btn);
      await waitFor(() => {
        expect(screen.getByText("Copied")).toBeInTheDocument();
      });
    });

    it("renders explorer button when onClick provided", () => {
      render(
        <OnchainBadge
          variant="confirmed"
          txHash="0xabc123"
          onClick={() => {}}
        />,
      );
      expect(screen.getByLabelText("View transaction on block explorer")).toBeInTheDocument();
    });

    it("applies clickable class when txHash present", () => {
      const { container } = render(
        <OnchainBadge variant="confirmed" txHash="0xabc123" />,
      );
      expect(container.firstChild).toHaveClass("onchain-badge--clickable");
    });
  });

  describe("onClick", () => {
    it("calls onClick when badge is clicked", () => {
      const onClick = vi.fn();
      const { container } = render(
        <OnchainBadge variant="confirmed" onClick={onClick} />,
      );
      fireEvent.click(container.firstChild as Element);
      expect(onClick).toHaveBeenCalledTimes(1);
    });
  });

  describe("progressBar", () => {
    it("shows progress bar instead of counter when progressBar=true", () => {
      const { container } = render(
        <OnchainBadge
          variant="confirming"
          currentConfirmations={4}
          targetConfirmations={12}
          progressBar={true}
        />,
      );
      expect(container.querySelector(".ob-progress")).toBeInTheDocument();
      expect(screen.queryByText("/12")).toBeNull();
      expect(screen.getByText("4/12")).toBeInTheDocument();
    });

    it("does not show progress bar by default", () => {
      const { container } = render(
        <OnchainBadge
          variant="confirming"
          currentConfirmations={4}
          targetConfirmations={12}
        />,
      );
      expect(container.querySelector(".ob-progress")).not.toBeInTheDocument();
      expect(screen.getByText("/12")).toBeInTheDocument();
    });
  });
});
