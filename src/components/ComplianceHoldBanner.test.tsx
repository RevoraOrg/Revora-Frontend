import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ComplianceHoldBanner, ComplianceSeverity } from "./ComplianceHoldBanner";

describe("ComplianceHoldBanner", () => {
  const mockHold = {
    id: "1",
    type: "kyc",
    severity: "blocking" as ComplianceSeverity,
    title: "Identity verification required",
    message: "Complete identity verification to continue",
  };

  it("renders nothing when holds array is empty", () => {
    const { container } = render(<ComplianceHoldBanner holds={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when holds is null", () => {
    const { container } = render(<ComplianceHoldBanner holds={null as any} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders a single hold with correct content", () => {
    render(<ComplianceHoldBanner holds={[mockHold]} />);
    
    expect(screen.getByText("Identity verification required")).toBeInTheDocument();
    expect(screen.getByText("Complete identity verification to continue")).toBeInTheDocument();
  });

  it("renders multiple holds", () => {
    const holds = [
      mockHold,
      {
        id: "2",
        type: "aml",
        severity: "warning" as ComplianceSeverity,
        title: "Additional information needed",
        message: "Provide your tax identification number",
      },
    ];
    
    render(<ComplianceHoldBanner holds={holds} />);
    
    expect(screen.getByText("Identity verification required")).toBeInTheDocument();
    expect(screen.getByText("Additional information needed")).toBeInTheDocument();
  });

  it("applies correct severity styles for info severity", () => {
    const infoHold = {
      ...mockHold,
      severity: "info" as ComplianceSeverity,
    };
    
    const { container } = render(<ComplianceHoldBanner holds={[infoHold]} />);
    const banner = container.firstChild as HTMLElement;
    
    expect(banner).toHaveClass("bg-[rgba(59,130,246,0.1)]");
    expect(banner).toHaveClass("border-[rgba(59,130,246,0.2)]");
  });

  it("applies correct severity styles for warning severity", () => {
    const warningHold = {
      ...mockHold,
      severity: "warning" as ComplianceSeverity,
    };
    
    const { container } = render(<ComplianceHoldBanner holds={[warningHold]} />);
    const banner = container.firstChild as HTMLElement;
    
    expect(banner).toHaveClass("bg-[rgba(245,158,11,0.1)]");
    expect(banner).toHaveClass("border-[rgba(245,158,11,0.2)]");
  });

  it("applies correct severity styles for blocking severity", () => {
    const { container } = render(<ComplianceHoldBanner holds={[mockHold]} />);
    const banner = container.firstChild as HTMLElement;
    
    expect(banner).toHaveClass("bg-[rgba(239,68,68,0.1)]");
    expect(banner).toHaveClass("border-[rgba(239,68,68,0.2)]");
  });

  it("renders dismiss button when canDismiss is true and onDismiss is provided", () => {
    const dismissibleHold = {
      ...mockHold,
      canDismiss: true,
    };
    
    render(<ComplianceHoldBanner holds={[dismissibleHold]} onDismiss={vi.fn()} />);
    
    const dismissButton = screen.getByRole("button", { name: /dismiss/i });
    expect(dismissButton).toBeInTheDocument();
  });

  it("does not render dismiss button when canDismiss is false", () => {
    render(<ComplianceHoldBanner holds={[mockHold]} onDismiss={vi.fn()} />);
    
    const dismissButton = screen.queryByRole("button", { name: /dismiss/i });
    expect(dismissButton).not.toBeInTheDocument();
  });

  it("does not render dismiss button when onDismiss is not provided", () => {
    const dismissibleHold = {
      ...mockHold,
      canDismiss: true,
    };
    
    render(<ComplianceHoldBanner holds={[dismissibleHold]} />);
    
    const dismissButton = screen.queryByRole("button", { name: /dismiss/i });
    expect(dismissButton).not.toBeInTheDocument();
  });

  it("calls onDismiss with correct hold id when dismiss button is clicked", () => {
    const dismissibleHold = {
      ...mockHold,
      canDismiss: true,
    };
    const onDismiss = vi.fn();
    
    render(<ComplianceHoldBanner holds={[dismissibleHold]} onDismiss={onDismiss} />);
    
    const dismissButton = screen.getByRole("button", { name: /dismiss/i });
    fireEvent.click(dismissButton);
    
    expect(onDismiss).toHaveBeenCalledWith("1");
  });

  it("applies custom className", () => {
    const { container } = render(
      <ComplianceHoldBanner holds={[mockHold]} className="custom-class" />
    );
    
    expect(container.firstChild).toHaveClass("custom-class");
  });

  it("uses default id when not provided", () => {
    render(<ComplianceHoldBanner holds={[mockHold]} />);
    
    const banner = screen.getByRole("region", { name: /compliance holds/i });
    expect(banner).toHaveAttribute("id", "compliance-hold-banner");
  });

  it("uses custom id when provided", () => {
    render(<ComplianceHoldBanner holds={[mockHold]} id="custom-id" />);
    
    const banner = screen.getByRole("region", { name: /compliance holds/i });
    expect(banner).toHaveAttribute("id", "custom-id");
  });

  it("has correct ARIA attributes for blocking severity", () => {
    const { container } = render(<ComplianceHoldBanner holds={[mockHold]} />);
    const banner = container.querySelector('[role="alert"]');
    
    expect(banner).toBeInTheDocument();
    expect(banner).toHaveAttribute("aria-live", "assertive");
    expect(banner).toHaveAttribute("aria-atomic", "true");
  });

  it("has correct ARIA attributes for warning severity", () => {
    const warningHold = {
      ...mockHold,
      severity: "warning" as ComplianceSeverity,
    };
    
    const { container } = render(<ComplianceHoldBanner holds={[warningHold]} />);
    const banner = container.querySelector('[role="alert"]');
    
    expect(banner).toBeInTheDocument();
    expect(banner).toHaveAttribute("aria-live", "assertive");
  });

  it("has correct ARIA attributes for info severity", () => {
    const infoHold = {
      ...mockHold,
      severity: "info" as ComplianceSeverity,
    };
    
    const { container } = render(<ComplianceHoldBanner holds={[infoHold]} />);
    const banner = container.querySelector('[role="status"]');
    
    expect(banner).toBeInTheDocument();
    expect(banner).toHaveAttribute("aria-live", "polite");
  });

  it("has region role with aria-label", () => {
    render(<ComplianceHoldBanner holds={[mockHold]} />);
    
    const region = screen.getByRole("region", { name: /compliance holds/i });
    expect(region).toBeInTheDocument();
  });

  it("renders icon with aria-hidden attribute", () => {
    const { container } = render(<ComplianceHoldBanner holds={[mockHold]} />);
    const icon = container.querySelector("svg");
    
    expect(icon).toHaveAttribute("aria-hidden", "true");
  });

  it("handles multiple concurrent holds with different severities", () => {
    const holds = [
      {
        id: "1",
        type: "kyc",
        severity: "blocking" as ComplianceSeverity,
        title: "Blocking issue",
        message: "This blocks access",
      },
      {
        id: "2",
        type: "aml",
        severity: "warning" as ComplianceSeverity,
        title: "Warning issue",
        message: "This is a warning",
      },
      {
        id: "3",
        type: "document",
        severity: "info" as ComplianceSeverity,
        title: "Info issue",
        message: "This is informational",
      },
    ];
    
    render(<ComplianceHoldBanner holds={holds} />);
    
    expect(screen.getByText("Blocking issue")).toBeInTheDocument();
    expect(screen.getByText("Warning issue")).toBeInTheDocument();
    expect(screen.getByText("Info issue")).toBeInTheDocument();
  });

  it("dismiss button has correct aria-label", () => {
    const dismissibleHold = {
      ...mockHold,
      canDismiss: true,
      title: "Specific Hold Title",
    };
    
    render(<ComplianceHoldBanner holds={[dismissibleHold]} onDismiss={vi.fn()} />);
    
    const dismissButton = screen.getByRole("button", { name: /dismiss Specific Hold Title/i });
    expect(dismissButton).toBeInTheDocument();
  });
});
