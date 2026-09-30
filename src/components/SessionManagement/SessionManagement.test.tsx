import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { SessionManagement } from "./SessionManagement";

const currentSession = {
  id: "current",
  deviceName: "Current Laptop",
  deviceType: "desktop" as const,
  browser: "Chrome",
  os: "Windows",
  ipAddress: "192.0.2.1",
  location: "Boston, MA",
  lastActive: "2026-06-26T10:30:00Z",
  isCurrent: true,
};

const otherSession = {
  ...currentSession,
  id: "other",
  deviceName: "Personal Phone",
  deviceType: "mobile" as const,
  isCurrent: false,
};

function renderManagement(props: React.ComponentProps<typeof SessionManagement> = {}) {
  return render(
    <MemoryRouter>
      <SessionManagement {...props} />
    </MemoryRouter>,
  );
}

describe("SessionManagement", () => {
  it("does not render the confirmation dialog while it is closed", () => {
    renderManagement({ __initialSessions: [currentSession, otherSession] });

    expect(screen.getByRole("heading", { name: "Session Management" })).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "Revoke session?" })).not.toBeInTheDocument();
  });

  it("shows the revoke confirmation and closes it on cancel", async () => {
    const user = userEvent.setup();
    renderManagement({ __initialSessions: [currentSession, otherSession] });

    await user.click(screen.getByRole("button", { name: "View details for Personal Phone" }));
    await user.click(screen.getByRole("button", { name: "Revoke session" }));

    expect(screen.getByRole("dialog", { name: "Revoke session?" })).toBeInTheDocument();
    expect(screen.getByText(/sign out "Personal Phone" immediately/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("dialog", { name: "Revoke session?" })).not.toBeInTheDocument();
    expect(screen.getByTestId("device-drawer-other")).toBeInTheDocument();
  });

  it("revokes the selected session after confirmation", async () => {
    const user = userEvent.setup();
    const onRevokeSingle = vi.fn().mockResolvedValue(undefined);
    renderManagement({ __initialSessions: [currentSession, otherSession], __onRevokeSingle: onRevokeSingle });

    await user.click(screen.getByRole("button", { name: "View details for Personal Phone" }));
    await user.click(screen.getByRole("button", { name: "Revoke session" }));
    await user.click(screen.getByRole("button", { name: "Revoke", exact: true }));

    expect(onRevokeSingle).toHaveBeenCalledWith("other");
    expect(screen.queryByTestId("session-other")).not.toBeInTheDocument();
    expect(screen.getByTestId("session-current")).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "Revoke session?" })).not.toBeInTheDocument();
  });

  it("shows the empty state when there are no sessions", () => {
    renderManagement({ __initialSessions: [] });
    const sessionsRegion = screen.getByRole("region", { name: "Active sessions" });

    expect(within(sessionsRegion).getByRole("status")).toHaveTextContent("No active sessions");
    expect(within(sessionsRegion).queryByRole("list")).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("does not offer bulk revocation when only the current session remains", () => {
    renderManagement({ __initialSessions: [currentSession] });

    expect(screen.getByText("Only your current session is active.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Sign out of all other devices" })).not.toBeInTheDocument();
  });
});