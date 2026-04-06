import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email) { setError("Email is required"); return; }
    if (!email.includes("@")) { setError("Invalid email format"); return; }
    if (!password) { setError("Password is required"); return; }
    setLoading(true);
    const ok = await login(email, password);
    setLoading(false);
    if (ok === true) {
      navigate("/dashboard");
    } else if (typeof ok === "string") {
      setError(ok);
    } else {
      setError("Invalid credentials");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm border border-border p-8">
        <h1 className="font-display text-4xl font-bold text-center mb-1">ETYMOS</h1>
        <p className="text-center text-xs font-mono text-muted-foreground mb-8">Admin Portal</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium uppercase tracking-wide mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              placeholder="admin@etymos.com"
            />
          </div>
          <div>
            <label className="block text-xs font-medium uppercase tracking-wide mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-primary-foreground py-2.5 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
