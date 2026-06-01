import { render, screen, fireEvent } from "@testing-library/react";
import { Login } from "./Login";
import { BrowserRouter } from "react-router-dom";
import { describe, it, expect } from "vitest";

describe("Login Page", () => {
  it("shows error message on failed login attempt", async () => {
    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>,
    );

    const emailInput = screen.getByLabelText("Email Address", {
      selector: "input",
    });
    const passwordInput = screen.getByLabelText("Password", {
      selector: "input",
    });
    const submitButton = screen.getByRole("button", { name: /Sign In/i });

    // Initially no error
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "wrongpassword" } });
    fireEvent.click(submitButton);

    const errorBanner = await screen.findByRole("alert");
    expect(errorBanner).toBeInTheDocument();
    expect(errorBanner).toHaveTextContent(/Invalid email or password/i);

    // Check if inputs are marked as error
    expect(emailInput).toHaveClass("input-error");
    expect(passwordInput).toHaveClass("input-error");

    // Check aria-describedby
    expect(emailInput).toHaveAttribute("aria-describedby", "login-error");
    expect(passwordInput).toHaveAttribute("aria-describedby", "login-error");
  });

  it("toggles password visibility", () => {
    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>,
    );

    const passwordInput = screen.getByLabelText("Password", {
      selector: "input",
    }) as HTMLInputElement;
    const toggleButton = screen.getByLabelText(/Show password/i);

    expect(passwordInput.type).toBe("password");

    fireEvent.click(toggleButton);
    expect(passwordInput.type).toBe("text");
    expect(screen.getByLabelText(/Hide password/i)).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText(/Hide password/i));
    expect(passwordInput.type).toBe("password");
  });
});
