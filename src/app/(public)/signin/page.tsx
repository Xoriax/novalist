"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

async function parseJsonSafe(res: Response) {
  // 204 No Content
  if (res.status === 204) return {};
  const ct = res.headers.get("content-type") || "";
  const text = await res.text().catch(() => "");
  if (ct.includes("application/json")) {
    try { return JSON.parse(text || "{}"); } catch { return {}; }
  }
  // Pas JSON : renvoyer un objet avec erreur lisible
  return { ok: false, error: text || `HTTP ${res.status} ${res.statusText}` };
}

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<"email" | "code" | "mfa">("email");
  const [code, setCode] = useState("");
  const [mfa, setMfa] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  async function requestCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/request-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await parseJsonSafe(res);
      if (!res.ok) {
        setError(data.error || "Erreur serveur");
        return;
      }
      setStep("code");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur réseau";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();  
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = await parseJsonSafe(res);
      if (!res.ok) {
        setError(data.error || "Erreur serveur");
        return;
      }
      if (data.requiresMfa) setStep("mfa");
      else if (data.ok) window.location.href = "/dashboard";
      else setError(data.error || "Erreur");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur réseau";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function verifyTotp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/verify-totp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: mfa }),
      });
      const data = await parseJsonSafe(res);
      if (!res.ok) {
        setError(data.error || "Erreur serveur");
        return;
      }
      if (data.ok) window.location.href = "/dashboard";
      else setError(data.error || "Erreur");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur réseau";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  if (!mounted) return null;

  return (
    <div className="signin-container">
      {/* Background */}
      <div className="signin-background">
        <div className="signin-gradient"></div>
        <div className="signin-particles">
          {[...Array(15)].map((_, i) => (
            <div key={i} className={`signin-particle signin-particle-${i + 1}`}></div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="signin-content">
        {/* Header */}
        <div className="signin-header">
          <Link href="/" className="signin-logo">
            <span className="logo-text">Novalist</span>
          </Link>
          <h1 className="signin-title">
            {step === "email" && "Bienvenue"}
            {step === "code" && "Vérification"}
            {step === "mfa" && "Sécurité"}
          </h1>
          <p className="signin-subtitle">
            {step === "email" && "Connectez-vous à votre compte"}
            {step === "code" && "Entrez le code reçu par email"}
            {step === "mfa" && "Authentification à deux facteurs"}
          </p>
        </div>

        {/* Card */}
        <div className="signin-card">
          {/* Progress indicators */}
          <div className="progress-container">
            <div className="progress-step">
              <div className={`progress-circle ${step === "email" ? "active" : "completed"}`}>
                {step === "email" ? "1" : "✓"}
              </div>
              <span className="progress-label">Email</span>
            </div>
            <div className={`progress-line ${step !== "email" ? "completed" : ""}`}></div>
            <div className="progress-step">
              <div className={`progress-circle ${step === "code" ? "active" : step === "mfa" ? "completed" : ""}`}>
                {step === "mfa" ? "✓" : "2"}
              </div>
              <span className="progress-label">Code</span>
            </div>
            <div className={`progress-line ${step === "mfa" ? "completed" : ""}`}></div>
            <div className="progress-step">
              <div className={`progress-circle ${step === "mfa" ? "active" : ""}`}>
                3
              </div>
              <span className="progress-label">MFA</span>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="error-message">
              <svg className="error-icon" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <p className="error-text">{error}</p>
            </div>
          )}

          {/* Step 1: Email */}
          {step === "email" && (
            <form onSubmit={requestCode} className="signin-form">
              <div className="input-group">
                <label htmlFor="email" className="input-label">
                  Adresse email
                </label>
                <div className="input-container">
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="signin-input"
                    placeholder="votre@email.com"
                    required
                    disabled={loading}
                  />
                  <div className="input-focus-ring"></div>
                </div>
              </div>
              
              <button
                type="submit"
                disabled={loading}
                className="signin-button"
              >
                <span className="button-content">
                  {loading ? (
                    <>
                      <div className="loading-spinner"></div>
                      Envoi en cours...
                    </>
                  ) : (
                    "Recevoir un code de connexion"
                  )}
                </span>
                <div className="button-glow"></div>
              </button>
            </form>
          )}

          {/* Step 2: Code verification */}
          {step === "code" && (
            <div className="signin-step">
              <div className="info-box email-info">
                <div className="info-icon">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="info-text">
                  Code envoyé à<br />
                  <strong>{email}</strong>
                </p>
              </div>

              <form onSubmit={verifyCode} className="signin-form">
                <div className="input-group">
                  <label htmlFor="code" className="input-label">
                    Code de vérification
                  </label>
                  <div className="input-container">
                    <input
                      id="code"
                      type="text"
                      value={code}
                      onChange={e => setCode(e.target.value)}
                      className="signin-input code-input"
                      placeholder="000000"
                      inputMode="numeric"
                      maxLength={6}
                      required
                      disabled={loading}
                    />
                    <div className="input-focus-ring"></div>
                  </div>
                </div>
                
                <button
                  type="submit"
                  disabled={loading || code.length !== 6}
                  className="signin-button"
                >
                  <span className="button-content">
                    {loading ? (
                      <>
                        <div className="loading-spinner"></div>
                        Vérification...
                      </>
                    ) : (
                      "Vérifier le code"
                    )}
                  </span>
                  <div className="button-glow"></div>
                </button>
                
                <div className="back-link">
                  <button
                    type="button"
                    onClick={() => setStep("email")}
                    className="back-button"
                  >
                    ← Retour à l&apos;email
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Step 3: MFA */}
          {step === "mfa" && (
            <div className="signin-step">
              <div className="info-box mfa-info">
                <div className="info-icon">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <p className="info-text">
                  Ouvrez votre app<br />
                  <strong>d&apos;authentification</strong>
                </p>
              </div>

              <form onSubmit={verifyTotp} className="signin-form">
                <div className="input-group">
                  <label htmlFor="mfa" className="input-label">
                    Code TOTP
                  </label>
                  <div className="input-container">
                    <input
                      id="mfa"
                      type="text"
                      value={mfa}
                      onChange={e => setMfa(e.target.value)}
                      className="signin-input code-input"
                      placeholder="000000"
                      inputMode="numeric"
                      maxLength={6}
                      required
                      disabled={loading}
                    />
                    <div className="input-focus-ring"></div>
                  </div>
                </div>
                
                <button
                  type="submit"
                  disabled={loading || mfa.length !== 6}
                  className="signin-button"
                >
                  <span className="button-content">
                    {loading ? (
                      <>
                        <div className="loading-spinner"></div>
                        Connexion...
                      </>
                    ) : (
                      "Se connecter"
                    )}
                  </span>
                  <div className="button-glow"></div>
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="signin-footer">
          <p className="footer-text">
            Besoin d&apos;aide ?{" "}
            <Link href="/" className="footer-link">
              Contactez votre administrateur
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}