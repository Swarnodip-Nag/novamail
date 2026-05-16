import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import { toast } from "sonner";
import { Mail, Lock, Eye, EyeOff, Settings2, Zap, Shield, Cpu } from "lucide-react";

const PROVIDER_HINTS: Record<string, { label: string; hint: string; badge: string }> = {
  gmail: {
    label: "App Password",
    hint: "Gmail requires an App Password — generate one at myaccount.google.com → Security → App Passwords",
    badge: "Gmail",
  },
  microsoft365: {
    label: "App Password",
    hint: "Outlook requires an App Password from your Microsoft account security settings",
    badge: "Outlook",
  },
  yahoo: {
    label: "App Password",
    hint: "Yahoo requires an App Password — generate one at account.yahoo.com → Security",
    badge: "Yahoo",
  },
  imap: {
    label: "Password",
    hint: "",
    badge: "",
  },
};

function detectProvider(email: string) {
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  if (domain === "gmail.com" || domain === "googlemail.com") return "gmail";
  if (["outlook.com", "hotmail.com", "live.com", "microsoft.com"].includes(domain)) return "microsoft365";
  if (domain === "yahoo.com" || domain === "ymail.com") return "yahoo";
  return "imap";
}

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail]         = useState("");
  const [password, setPassword]   = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [imapHost, setImapHost]   = useState("");
  const [imapPort, setImapPort]   = useState("");
  const [smtpHost, setSmtpHost]   = useState("");
  const [smtpPort, setSmtpPort]   = useState("");
  const [error, setError]         = useState("");

  const provider = detectProvider(email);
  const providerMeta = PROVIDER_HINTS[provider] ?? PROVIDER_HINTS.imap;
  const isValidEmail = email.includes("@") && email.includes(".");

  // Auto-fetch server defaults silently when email domain is known
  const defaultsQuery = trpc.auth.providerDefaults.useQuery(
    { email },
    { enabled: isValidEmail, staleTime: Infinity }
  );

  useEffect(() => {
    if (defaultsQuery.data) {
      const d = defaultsQuery.data;
      if (!imapHost) setImapHost(d.imapHost);
      if (!imapPort) setImapPort(String(d.imapPort));
      if (!smtpHost) setSmtpHost(d.smtpHost);
      if (!smtpPort) setSmtpPort(String(d.smtpPort));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultsQuery.data]);

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: () => {
      toast.success("Signed in successfully!");
      navigate("/");
    },
    onError: (err) => setError(err.message),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    loginMutation.mutate({
      email,
      password,
      imapHost: imapHost || undefined,
      imapPort: imapPort ? parseInt(imapPort) : undefined,
      smtpHost: smtpHost || undefined,
      smtpPort: smtpPort ? parseInt(smtpPort) : undefined,
    });
  }

  const isLoading = loginMutation.isPending;

  return (
    <div className="nm-login-bg">
      <div className="nm-orb nm-orb-1" />
      <div className="nm-orb nm-orb-2" />
      <div className="nm-orb nm-orb-3" />

      <div className="nm-login-container">

        {/* ── Left branding panel ── */}
        <div className="nm-brand-panel">
          <div className="nm-brand-logo">
            <Mail className="nm-brand-icon" />
          </div>
          <h1 className="nm-brand-title">NovaMail</h1>
          <p className="nm-brand-subtitle">
            Your AI-powered universal email client. Connect any inbox and let AI handle the rest.
          </p>
          <div className="nm-feature-list">
            <div className="nm-feature-item">
              <div className="nm-feature-icon"><Zap size={16} /></div>
              <div>
                <div className="nm-feature-name">AI Summarization</div>
                <div className="nm-feature-desc">Smart summaries powered by NVIDIA NIM</div>
              </div>
            </div>
            <div className="nm-feature-item">
              <div className="nm-feature-icon"><Shield size={16} /></div>
              <div>
                <div className="nm-feature-name">Secure & Private</div>
                <div className="nm-feature-desc">Credentials stay on your own server</div>
              </div>
            </div>
            <div className="nm-feature-item">
              <div className="nm-feature-icon"><Cpu size={16} /></div>
              <div>
                <div className="nm-feature-name">Universal Inbox</div>
                <div className="nm-feature-desc">Gmail, Outlook, Yahoo, or any IMAP provider</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right form panel ── */}
        <div className="nm-form-panel">
          <div className="nm-form-card">

            <div className="nm-form-header">
              <h2 className="nm-form-title">Sign in to your email</h2>
              <p className="nm-form-subtitle">
                Enter your email address and password — that's it.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="nm-form">

              {/* Email */}
              <div className="nm-field">
                <label className="nm-label" htmlFor="nm-email">Email address</label>
                <div className="nm-input-wrap">
                  <Mail className="nm-input-icon" size={16} />
                  <input
                    id="nm-email"
                    type="email"
                    autoComplete="email"
                    required
                    placeholder="you@gmail.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      // Reset advanced fields when email changes so they re-detect
                      setImapHost(""); setImapPort("");
                      setSmtpHost(""); setSmtpPort("");
                    }}
                    className="nm-input"
                  />
                  {/* Provider badge */}
                  {providerMeta.badge && isValidEmail && (
                    <span className="nm-provider-badge">{providerMeta.badge}</span>
                  )}
                </div>
              </div>

              {/* Password */}
              <div className="nm-field">
                <label className="nm-label" htmlFor="nm-password">
                  {providerMeta.label}
                </label>
                <div className="nm-input-wrap">
                  <Lock className="nm-input-icon" size={16} />
                  <input
                    id="nm-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="nm-input nm-input-with-action"
                  />
                  <button
                    type="button"
                    className="nm-input-action"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {/* Provider hint */}
                {providerMeta.hint && isValidEmail && (
                  <p className="nm-help-text">{providerMeta.hint}</p>
                )}
              </div>

              {/* Error */}
              {error && (
                <div className="nm-error" role="alert">{error}</div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading}
                className="nm-submit"
                id="nm-login-btn"
              >
                {isLoading ? (
                  <span className="nm-submit-loading">
                    <span className="nm-spinner" />
                    Connecting…
                  </span>
                ) : "Sign In"}
              </button>

              {/* Advanced settings (collapsed by default) */}
              <button
                type="button"
                className="nm-advanced-toggle"
                onClick={() => setShowAdvanced((v) => !v)}
              >
                <Settings2 size={13} />
                {showAdvanced ? "Hide" : "Custom"} IMAP / SMTP settings
              </button>

              {showAdvanced && (
                <div className="nm-advanced">
                  <p className="nm-advanced-note">
                    Leave blank to use auto-detected settings for your email provider.
                  </p>
                  <div className="nm-advanced-grid">
                    <div className="nm-field">
                      <label className="nm-label" htmlFor="nm-imap-host">IMAP Host</label>
                      <input
                        id="nm-imap-host"
                        type="text"
                        placeholder={defaultsQuery.data?.imapHost || "imap.example.com"}
                        value={imapHost}
                        onChange={(e) => setImapHost(e.target.value)}
                        className="nm-input nm-input-noicon"
                      />
                    </div>
                    <div className="nm-field">
                      <label className="nm-label" htmlFor="nm-imap-port">IMAP Port</label>
                      <input
                        id="nm-imap-port"
                        type="number"
                        placeholder={String(defaultsQuery.data?.imapPort ?? 993)}
                        value={imapPort}
                        onChange={(e) => setImapPort(e.target.value)}
                        className="nm-input nm-input-noicon"
                      />
                    </div>
                    <div className="nm-field">
                      <label className="nm-label" htmlFor="nm-smtp-host">SMTP Host</label>
                      <input
                        id="nm-smtp-host"
                        type="text"
                        placeholder={defaultsQuery.data?.smtpHost || "smtp.example.com"}
                        value={smtpHost}
                        onChange={(e) => setSmtpHost(e.target.value)}
                        className="nm-input nm-input-noicon"
                      />
                    </div>
                    <div className="nm-field">
                      <label className="nm-label" htmlFor="nm-smtp-port">SMTP Port</label>
                      <input
                        id="nm-smtp-port"
                        type="number"
                        placeholder={String(defaultsQuery.data?.smtpPort ?? 587)}
                        value={smtpPort}
                        onChange={(e) => setSmtpPort(e.target.value)}
                        className="nm-input nm-input-noicon"
                      />
                    </div>
                  </div>
                </div>
              )}
            </form>

            <p className="nm-form-footer">
              Your password is only used to connect via IMAP and is never shared externally.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
