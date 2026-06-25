import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { RemediationChecklist } from "./RemediationChecklist";

describe("RemediationChecklist", () => {
  const mockSteps = [
    {
      id: "1",
      title: "Upload government ID",
      description: "Provide a valid passport or driver's license",
      completed: false,
      actionLabel: "Upload now",
      onAction: vi.fn(),
    },
  ];

  it("renders nothing when steps array is empty", () => {
    const { container } = render(<RemediationChecklist steps={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when steps is null", () => {
    const { container } = render(<RemediationChecklist steps={null as any} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders a single step with correct content", () => {
    render(<RemediationChecklist steps={mockSteps} />);
    
    expect(screen.getByText("Upload government ID")).toBeInTheDocument();
    expect(screen.getByText("Provide a valid passport or driver's license")).toBeInTheDocument();
  });

  it("renders multiple steps", () => {
    const steps = [
      ...mockSteps,
      {
        id: "2",
        title: "Take a selfie",
        description: "Follow the on-screen instructions",
        completed: false,
        actionLabel: "Start verification",
        onAction: vi.fn(),
      },
    ];
    
    render(<RemediationChecklist steps={steps} />);
    
    expect(screen.getByText("Upload government ID")).toBeInTheDocument();
    expect(screen.getByText("Take a selfie")).toBeInTheDocument();
  });

  it("renders custom title when provided", () => {
    render(<RemediationChecklist steps={mockSteps} title="Custom Title" />);
    
    expect(screen.getByText("Custom Title")).toBeInTheDocument();
  });

  it("renders default title when not provided", () => {
    render(<RemediationChecklist steps={mockSteps} />);
    
    expect(screen.getByText("Steps to resolve")).toBeInTheDocument();
  });

  it("displays correct progress for completed steps", () => {
    const steps = [
      { ...mockSteps[0], completed: true },
      { ...mockSteps[0], id: "2", completed: false },
    ];
    
    render(<RemediationChecklist steps={steps} />);
    
    expect(screen.getByText("1/2")).toBeInTheDocument();
  });

  it("displays correct progress when all steps are completed", () => {
    const steps = [
      { ...mockSteps[0], completed: true },
      { ...mockSteps[0], id: "2", completed: true },
    ];
    
    render(<RemediationChecklist steps={steps} />);
    
    expect(screen.getByText("2/2")).toBeInTheDocument();
  });

  it("displays correct progress when no steps are completed", () => {
    const steps = [
      { ...mockSteps[0], completed: false },
      { ...mockSteps[0], id: "2", completed: false },
    ];
    
    render(<RemediationChecklist steps={steps} />);
    
    expect(screen.getByText("0/2")).toBeInTheDocument();
  });

  it("renders action button for incomplete steps", () => {
    render(<RemediationChecklist steps={mockSteps} />);
    
    const actionButton = screen.getByRole("button", { name: /Upload now for Upload government ID/i });
    expect(actionButton).toBeInTheDocument();
  });

  it("does not render action button for completed steps", () => {
    const completedStep = { ...mockSteps[0], completed: true };
    
    render(<RemediationChecklist steps={[completedStep]} />);
    
    const actionButton = screen.queryByRole("button", { name: /Upload now/i });
    expect(actionButton).not.toBeInTheDocument();
  });

  it("calls onAction with correct step id when action button is clicked", () => {
    render(<RemediationChecklist steps={mockSteps} />);
    
    const actionButton = screen.getByRole("button", { name: /Upload now/i });
    fireEvent.click(actionButton);
    
    expect(mockSteps[0].onAction).toHaveBeenCalledWith("1");
  });

  it("does not call onAction when step is disabled", () => {
    const disabledStep = { ...mockSteps[0], disabled: true };
    
    render(<RemediationChecklist steps={[disabledStep]} />);
    
    const actionButton = screen.getByRole("button", { name: /Upload now/i });
    fireEvent.click(actionButton);
    
    expect(disabledStep.onAction).not.toHaveBeenCalled();
  });

  it("opens external URL when actionUrl is provided", () => {
    const stepWithUrl = {
      ...mockSteps[0],
      actionUrl: "https://example.com",
    };
    
    const mockOpen = vi.fn();
    global.open = mockOpen;
    
    render(<RemediationChecklist steps={[stepWithUrl]} />);
    
    const actionButton = screen.getByRole("button", { name: /Learn more/i });
    fireEvent.click(actionButton);
    
    expect(mockOpen).toHaveBeenCalledWith("https://example.com", "_blank", "noopener,noreferrer");
  });

  it("renders correct icon for completed steps", () => {
    const completedStep = { ...mockSteps[0], completed: true };
    const { container } = render(<RemediationChecklist steps={[completedStep]} />);
    
    const icon = container.querySelector("svg");
    expect(icon).toBeInTheDocument();
  });

  it("renders correct icon for incomplete steps", () => {
    const { container } = render(<RemediationChecklist steps={mockSteps} />);
    
    const icon = container.querySelector("svg");
    expect(icon).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(
      <RemediationChecklist steps={mockSteps} className="custom-class" />
    );
    
    expect(container.firstChild).toHaveClass("custom-class");
  });

  it("uses default id when not provided", () => {
    render(<RemediationChecklist steps={mockSteps} />);
    
    const checklist = screen.getByRole("region", { name: /remediation checklist/i });
    expect(checklist).toHaveAttribute("id", "remediation-checklist");
  });

  it("uses custom id when provided", () => {
    render(<RemediationChecklist steps={mockSteps} id="custom-id" />);
    
    const checklist = screen.getByRole("region", { name: /remediation checklist/i });
    expect(checklist).toHaveAttribute("id", "custom-id");
  });

  it("has correct ARIA attributes for progress bar", () => {
    const steps = [
      { ...mockSteps[0], completed: true },
      { ...mockSteps[0], id: "2", completed: false },
    ];
    
    const { container } = render(<RemediationChecklist steps={steps} />);
    const progressbar = container.querySelector('[role="progressbar"]');
    
    expect(progressbar).toBeInTheDocument();
    expect(progressbar).toHaveAttribute("aria-valuenow", "1");
    expect(progressbar).toHaveAttribute("aria-valuemin", "0");
    expect(progressbar).toHaveAttribute("aria-valuemax", "2");
  });

  it("has correct ARIA label for progress bar", () => {
    const steps = [
      { ...mockSteps[0], completed: true },
      { ...mockSteps[0], id: "2", completed: false },
    ];
    
    const { container } = render(<RemediationChecklist steps={steps} />);
    const progressbar = container.querySelector('[role="progressbar"]');
    
    expect(progressbar).toHaveAttribute("aria-label", "1 of 2 steps completed");
  });

  it("has region role with aria-label", () => {
    render(<RemediationChecklist steps={mockSteps} />);
    
    const region = screen.getByRole("region", { name: /remediation checklist/i });
    expect(region).toBeInTheDocument();
  });

  it("has list role for steps", () => {
    render(<RemediationChecklist steps={mockSteps} />);
    
    const list = screen.getByRole("list");
    expect(list).toBeInTheDocument();
  });

  it("has listitem role for each step", () => {
    render(<RemediationChecklist steps={mockSteps} />);
    
    const listItems = screen.getAllByRole("listitem");
    expect(listItems).toHaveLength(1);
  });

  it("renders icons with aria-hidden attribute", () => {
    const { container } = render(<RemediationChecklist steps={mockSteps} />);
    const icons = container.querySelectorAll("svg");
    
    icons.forEach((icon) => {
      expect(icon).toHaveAttribute("aria-hidden", "true");
    });
  });

  it("applies correct styling for completed steps", () => {
    const completedStep = { ...mockSteps[0], completed: true };
    const { container } = render(<RemediationChecklist steps={[completedStep]} />);
    
    const step = container.querySelector('[role="listitem"]');
    expect(step).toHaveClass("bg-[rgba(16,185,129,0.05)]");
  });

  it("applies correct styling for incomplete steps", () => {
    const { container } = render(<RemediationChecklist steps={mockSteps} />);
    
    const step = container.querySelector('[role="listitem"]');
    expect(step).toHaveClass("bg-[rgba(148,163,184,0.05)]");
  });

  it("renders ExternalLink icon for external URLs", () => {
    const stepWithUrl = {
      ...mockSteps[0],
      actionUrl: "https://example.com",
    };
    
    const { container } = render(<RemediationChecklist steps={[stepWithUrl]} />);
    
    const icons = container.querySelectorAll("svg");
    expect(icons.length).toBeGreaterThan(1);
  });

  it("renders ChevronRight icon for callback actions", () => {
    const { container } = render(<RemediationChecklist steps={mockSteps} />);
    
    const icons = container.querySelectorAll("svg");
    expect(icons.length).toBeGreaterThan(1);
  });

  it("handles step without description", () => {
    const stepWithoutDescription = {
      ...mockSteps[0],
      description: undefined,
    };
    
    render(<RemediationChecklist steps={[stepWithoutDescription]} />);
    
    expect(screen.getByText("Upload government ID")).toBeInTheDocument();
  });

  it("handles step without action", () => {
    const stepWithoutAction = {
      ...mockSteps[0],
      actionLabel: undefined,
      onAction: undefined,
    };
    
    render(<RemediationChecklist steps={[stepWithoutAction]} />);
    
    expect(screen.getByText("Upload government ID")).toBeInTheDocument();
    const actionButton = screen.queryByRole("button");
    expect(actionButton).not.toBeInTheDocument();
  });

  it("applies aria-current to first incomplete step", () => {
    const steps = [
      { ...mockSteps[0], completed: true },
      { ...mockSteps[0], id: "2", completed: false },
    ];
    
    const { container } = render(<RemediationChecklist steps={steps} />);
    const listItems = container.querySelectorAll('[role="listitem"]');
    
    expect(listItems[1]).toHaveAttribute("aria-current", "step");
  });

  it("does not apply aria-current to completed steps", () => {
    const completedStep = { ...mockSteps[0], completed: true };
    const { container } = render(<RemediationChecklist steps={[completedStep]} />);
    const listItem = container.querySelector('[role="listitem"]');
    
    expect(listItem).not.toHaveAttribute("aria-current");
  });

  it("disables action button for completed steps", () => {
    const completedStep = { ...mockSteps[0], completed: true, actionLabel: "Action" };
    
    render(<RemediationChecklist steps={[completedStep]} />);
    
    const actionButton = screen.queryByRole("button");
    expect(actionButton).not.toBeInTheDocument();
  });

  it("disables action button when step is disabled", () => {
    const disabledStep = { ...mockSteps[0], disabled: true };
    
    render(<RemediationChecklist steps={[disabledStep]} />);
    
    const actionButton = screen.getByRole("button");
    expect(actionButton).toBeDisabled();
  });

  it("renders action button with correct aria-label", () => {
    render(<RemediationChecklist steps={mockSteps} />);
    
    const actionButton = screen.getByRole("button", { name: /Upload now for Upload government ID/i });
    expect(actionButton).toBeInTheDocument();
  });
});
