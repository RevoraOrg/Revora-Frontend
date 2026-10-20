import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { routes } from "./App";

function renderAtPath(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  return render(<RouterProvider router={router} />);
}

describe('App Components Accessibility', () => {
  it('renders standard links and buttons correctly', () => {
    renderAtPath("/");
    
    // Test that the 'Get Started' and 'Sign In' links render and have href attributes
    const getStartedLink = screen.getByText('Get Started');
    const signInLink = screen.getByText('Sign In');
    
    expect(getStartedLink).toBeInTheDocument();
    expect(getStartedLink.tagName.toLowerCase()).toBe('a');
    expect(signInLink).toBeInTheDocument();
    expect(signInLink.tagName.toLowerCase()).toBe('a');
  });

  it('renders the header correctly', () => {
    renderAtPath("/");
    const heading = screen.getByRole('heading', { name: /Stellar RevenueShare – Revora/i });
    expect(heading).toBeInTheDocument();
  });

  it.each([
    ["/login", "Welcome to Revora"],
    ["/signup", "Choose your account type"],
    ["/forgot-password", "Forgot Password?"],
    ["/startup/dashboard", "Startup Dashboard"],
    ["/investor/portal", "Discover Offerings"],
  ])("renders the existing route %s", (path, heading) => {
    renderAtPath(path);
    expect(
      screen.getByRole("heading", { name: heading }),
    ).toBeInTheDocument();
  });
});
