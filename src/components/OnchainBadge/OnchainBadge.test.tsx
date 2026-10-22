import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect } from "vitest";
import { axe, toHaveNoViolations } from "jest-axe";
import { OnchainBadge, type OnchainBadgeVariant } from "./OnchainBadge";

expect.extend(toHaveNoViolations);

describe("OnchainBadge", () => {
  const variants: OnchainBadgeVariant[] = [
    "pending",
    "retrying",
    "confirming",
    "confirmed",
    "failed",
    "reorged",
  ];

  it.each(variants)("renders the %s variant as a static badge with no live role", (variant) => {
    render(<OnchainBadge variant={variant} />);
    const badge = screen.getByTestId(`onchain-badge-${variant}`);
    expect(badge).toBeInTheDocument();
    expect(badge).not.toHaveAttribute("role", "status");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("uses a separate live region only when the status changes", () => {
    const { rerender } = render(<OnchainBadge variant="pending" />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();

    rerender(<OnchainBadge variant="confirming" currentConfirmations={3} targetConfirmations={12} />);
    const liveRegion = screen.getByRole("status");
    expect(liveRegion).toHaveAttribute("aria-live", "polite");
    expect(liveRegion).toHaveTextContent(
      "Transaction confirming - 3 of 12 confirmations received",
    );
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

  it("renders failed with XCircle icon and Failed label", () => {
    render(<OnchainBadge variant="failed" />);
    expect(screen.getByText("Failed")).toBeInTheDocument();
    expect(screen.getByTestId("onchain-badge-failed").querySelector("svg")).toBeInTheDocument();
  });

  it("renders reorged with RotateCcw icon and Reorged label", () => {
    render(<OnchainBadge variant="reorged" />);
    expect(screen.getByText("Reorged")).toBeInTheDocument();
    expect(screen.getByTestId("onchain-badge-reorged").querySelector("svg")).toBeInTheDocument();
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

  it("does not show confirmation counter for failed variant", () => {
    render(<OnchainBadge variant="failed" currentConfirmations={0} targetConfirmations={12} />);
    expect(screen.queryByText("/12")).not.toBeInTheDocument();
  });

  it("does not show confirmation counter for reorged variant", () => {
    render(<OnchainBadge variant="reorged" currentConfirmations={0} targetConfirmations={12} />);
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

    it("uses plain-language description for failed", () => {
      render(<OnchainBadge variant="failed" />);
      const badge = screen.getByTestId("onchain-badge-failed");
      expect(badge).toHaveAttribute(
        "aria-label",
        "Transaction failed - the on-chain operation did not succeed",
      );
    });

    it("uses plain-language description for reorged", () => {
      render(<OnchainBadge variant="reorged" />);
      const badge = screen.getByTestId("onchain-badge-reorged");
      expect(badge).toHaveAttribute(
        "aria-label",
        "Transaction reorged - removed from the chain by a chain reorganization",
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

  describe("confirmation tooltip", () => {
    const metadata = {
      blockNumber: 55001234,
      confirmedAt: "2026-08-28T10:00:00.000Z",
      network: "testnet" as const,
    };
    const txHash = "a1b2c3d4e5f6789012345678901234567890abcd";

    it("is closed by default even with metadata present", () => {
      render(
        <OnchainBadge
          variant="confirmed"
          transactionHash={txHash}
          currentConfirmations={12}
          targetConfirmations={12}
          metadata={metadata}
        />,
      );
      const tooltip = screen.getByTestId("onchain-badge-tooltip");
      expect(tooltip).toBeInTheDocument();
      expect(tooltip).not.toHaveClass("ob-tooltip--open");
    });

    it("shows block, confirmations and time-since data on focus", () => {
      render(
        <OnchainBadge
          variant="confirmed"
          transactionHash={txHash}
          currentConfirmations={12}
          targetConfirmations={12}
          metadata={metadata}
        />,
      );
      fireEvent.focus(screen.getByTestId("onchain-badge-confirmed"));
      const tooltip = screen.getByTestId("onchain-badge-tooltip");
      expect(tooltip).toHaveClass("ob-tooltip--open");
      expect(screen.getByTestId("ob-tooltip-block")).toHaveTextContent("55,001,234");
      expect(screen.getByTestId("ob-tooltip-confirmations")).toHaveTextContent("12 / 12");
      expect(screen.getByTestId("ob-tooltip-time")).toHaveTextContent(/ago/);
    });

    it("links to the explorer when a hash is available", () => {
      render(
        <OnchainBadge
          variant="confirmed"
          transactionHash={txHash}
          metadata={{ network: "testnet" }}
        />,
      );
      fireEvent.focus(screen.getByTestId("onchain-badge-confirmed"));
      const link = screen.getByTestId("ob-tooltip-explorer");
      expect(link).toHaveAttribute("href", expect.stringContaining("stellar.expert/explorer/testnet/tx/"));
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    });

    it("respects an explicit explorerUrl override", () => {
      render(
        <OnchainBadge
          variant="confirmed"
          transactionHash={txHash}
          explorerUrl="https://example.com/tx/abc"
        />,
      );
      fireEvent.focus(screen.getByTestId("onchain-badge-confirmed"));
      expect(screen.getByTestId("ob-tooltip-explorer")).toHaveAttribute(
        "href",
        "https://example.com/tx/abc",
      );
    });

    it("does not render the explorer link without a hash or URL", () => {
      render(
        <OnchainBadge
          variant="confirmed"
          metadata={{ blockNumber: 22 }}
        />,
      );
      fireEvent.focus(screen.getByTestId("onchain-badge-confirmed"));
      expect(screen.queryByTestId("ob-tooltip-explorer")).not.toBeInTheDocument();
      expect(screen.getByText("Explorer link unavailable")).toBeInTheDocument();
    });

    it("closes on Escape and reopens after blur/refocus", () => {
      render(
        <OnchainBadge
          variant="confirmed"
          transactionHash={txHash}
          metadata={metadata}
        />,
      );
      const badge = screen.getByTestId("onchain-badge-confirmed");
      fireEvent.focus(badge);
      expect(screen.getByTestId("onchain-badge-tooltip")).toHaveClass("ob-tooltip--open");

      fireEvent.keyDown(document, { key: "Escape" });
      expect(screen.getByTestId("onchain-badge-tooltip")).not.toHaveClass("ob-tooltip--open");

      fireEvent.blur(badge);
      fireEvent.focus(badge);
      expect(screen.getByTestId("onchain-badge-tooltip")).toHaveClass("ob-tooltip--open");
    });

    it("closes on blur", () => {
      render(
        <OnchainBadge
          variant="confirming"
          transactionHash={txHash}
          currentConfirmations={2}
          targetConfirmations={12}
        />,
      );
      const badge = screen.getByTestId("onchain-badge-confirming");
      fireEvent.focus(badge);
      expect(screen.getByTestId("onchain-badge-tooltip")).toHaveClass("ob-tooltip--open");
      fireEvent.blur(badge);
      expect(screen.getByTestId("onchain-badge-tooltip")).not.toHaveClass("ob-tooltip--open");
    });

    it("wires aria-describedby to the tooltip trigger", () => {
      render(
        <OnchainBadge
          variant="confirmed"
          transactionHash={txHash}
          metadata={metadata}
        />,
      );
      const badge = screen.getByTestId("onchain-badge-confirmed");
      const tooltip = screen.getByTestId("onchain-badge-tooltip");
      expect(badge).toHaveAttribute("aria-describedby", tooltip.id);
    });

    it("suppresses the tooltip when showTooltip is false", () => {
      render(
        <OnchainBadge
          variant="confirmed"
          transactionHash={txHash}
          metadata={metadata}
          showTooltip={false}
        />,
      );
      expect(screen.queryByTestId("onchain-badge-tooltip")).not.toBeInTheDocument();
      expect(screen.getByTestId("onchain-badge-confirmed")).not.toHaveAttribute("tabindex");
    });

    it("does not render a tooltip when no metadata is supplied", () => {
      render(<OnchainBadge variant="failed" />);
      expect(screen.queryByTestId("onchain-badge-tooltip")).not.toBeInTheDocument();
      expect(screen.getByTestId("onchain-badge-failed")).not.toHaveAttribute("tabindex");
    });

    it("has no axe violations with the tooltip open", async () => {
      const { container } = render(
        <OnchainBadge
          variant="confirming"
          transactionHash={txHash}
          currentConfirmations={5}
          targetConfirmations={12}
          metadata={{ blockNumber: 123456, confirmedAt: "2026-08-28T10:00:00.000Z" }}
        />,
      );
      fireEvent.focus(screen.getByTestId("onchain-badge-confirming"));
      expect(await axe(container)).toHaveNoViolations();
    });

    it("regression: Tab from the badge moves focus to the explorer link and it stays rendered", async () => {
      const user = userEvent.setup();
      render(
        <OnchainBadge
          variant="confirmed"
          transactionHash={txHash}
          metadata={metadata}
        />,
      );
      const badge = screen.getByTestId("onchain-badge-confirmed");
      expect(badge.tagName).toBe("BUTTON");
      expect(badge).toHaveAttribute("aria-expanded", "false");

      await user.tab();
      expect(badge).toHaveFocus();
      expect(badge).toHaveAttribute("aria-expanded", "true");
      expect(screen.getByTestId("onchain-badge-tooltip")).toHaveClass("ob-tooltip--open");

      const linkBeforeBlur = screen.getByTestId("ob-tooltip-explorer");
      fireEvent.blur(badge, { relatedTarget: linkBeforeBlur });
      expect(screen.getByTestId("onchain-badge-tooltip")).toHaveClass("ob-tooltip--open");

      await user.tab();

      const link = screen.getByTestId("ob-tooltip-explorer");
      expect(link).toBeInTheDocument();
      expect(link).toHaveFocus();
      expect(screen.getByTestId("onchain-badge-tooltip")).toHaveClass("ob-tooltip--open");
    });

    it("regression: Escape closes and refocuses the badge", async () => {
      const user = userEvent.setup();
      const { container } = render(
        <OnchainBadge
          variant="confirmed"
          transactionHash={txHash}
          metadata={metadata}
        />,
      );
      const badge = screen.getByTestId("onchain-badge-confirmed");
      await user.tab();
      expect(badge).toHaveFocus();
      await user.tab();
      const link = screen.getByTestId("ob-tooltip-explorer");
      expect(link).toHaveFocus();
      expect(await axe(container)).toHaveNoViolations();

      await user.keyboard("{Escape}");
      expect(screen.getByTestId("onchain-badge-tooltip")).not.toHaveClass("ob-tooltip--open");
      expect(badge).toHaveAttribute("aria-expanded", "false");
      expect(badge).toHaveFocus();
    });

    it("closes panel when tabbing out of explorer link to an external element", async () => {
      const user = userEvent.setup();
      render(
        <div>
          <OnchainBadge
            variant="confirmed"
            transactionHash={txHash}
            metadata={metadata}
          />
          <button type="button" data-testid="after-btn">
            Next
          </button>
        </div>,
      );
      const badge = screen.getByTestId("onchain-badge-confirmed");
      await user.tab();
      expect(badge).toHaveFocus();
      await user.tab();
      expect(screen.getByTestId("ob-tooltip-explorer")).toHaveFocus();

      await user.tab();
      expect(screen.getByTestId("after-btn")).toHaveFocus();
      expect(screen.getByTestId("onchain-badge-tooltip")).not.toHaveClass("ob-tooltip--open");
    });
  });
});
