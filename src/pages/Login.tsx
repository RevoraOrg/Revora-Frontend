import React, { useState } from "react";
import { AuthLayout } from "../components/AuthLayout";
import { FormError } from "../components/FormError";
import { Mail, Lock, Wallet, Eye, EyeOff } from "lucide-react";
import { Link } from "react-router-dom";

export const Login: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitState, setSubmitState] = useState<SubmitButtonState>('idle');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Login attempt:", { email, password });
    // Mock login failure for UI demonstration
    setError("Invalid email or password. Please try again.");
  };

  return (
    <AuthLayout
      title="Welcome to Revora"
      subtitle="Sign in to manage your RevenueShare offerings or track your portfolio."
    >
      <form
        onSubmit={handleSubmit}
        className={`space-y-4 ${error ? "animate-shake" : ""}`}
        noValidate
      >
        <FormError message={error} id="login-error" />

        <div className="input-group">
          <label className="input-label" htmlFor="email">
            Email Address
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-3 text-muted" size={18} />
            <input
              id="email"
              type="email"
              className={`input-field pl-10 ${error ? "input-error" : ""}`}
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              aria-required="true"
              aria-label="Email Address"
              aria-describedby={error ? "login-error" : undefined}
            />
          </div>
        </div>

        <div className="input-group">
          <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2 mb-2">
            <label className="input-label" style={{ marginBottom: 0 }} htmlFor="password">Password</label>
            <Link
              to="/forgot-password"
              aria-label="Forgot your password? Go to account recovery"
              className="link-styled text-sm py-1 px-1"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-3 text-muted" size={18} />
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              className={`input-field pl-10 pr-10 ${error ? "input-error" : ""}`}
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              aria-required="true"
              aria-label="Password"
              aria-describedby={error ? "login-error" : undefined}
            />
            <button
              type="button"
              className="absolute right-3 top-3 text-muted hover:text-main transition-colors"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <button type="submit" className="btn-primary mt-2">
          Sign In
        </button>

        <div className="relative my-6 py-2 flex items-center">
          <div className="flex-grow border-t border-[rgba(148,163,184,0.1)]"></div>
          <span className="flex-shrink mx-4 text-muted text-xs uppercase tracking-wider font-medium">
            Or continue with
          </span>
          <div className="flex-grow border-t border-[rgba(148,163,184,0.1)]"></div>
        </div>

        <button type="button" className="btn btn--secondary btn--md">
          <Wallet size={18} />
          Connect Stellar Wallet
        </button>

        <p className="mt-8 text-center text-sm text-muted">
          Don't have an account?{" "}
          <Link to="/signup" className="link-styled">
            Create an account
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
};
