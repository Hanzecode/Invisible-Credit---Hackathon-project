import { useState, useEffect } from "react";
import { CheckCircle, AlertTriangle, XCircle, ChevronRight, ChevronLeft, Loader2, RotateCcw } from "lucide-react";

const API_BASE = "http://localhost:8001";

const PSYCHOMETRIC_QUESTIONS = [
  "If you borrowed ₱5,000 today, when and how would you plan to repay it?",
  "Describe a time when money was tight. What did you do to manage?",
  "How do you usually decide whether to spend or save when you have extra cash?",
  "If a neighbour asked to borrow money but you had bills due, what would you do?",
  "What is your biggest financial goal in the next two years, and what steps are you taking toward it?",
];

const PARTNER_BANKS = [
  "Select partner bank…",
  "Rural Bank of Cebu",
  "Cooperative Bank of Davao",
  "First Consolidated Bank",
  "Leyte Development Bank",
  "Mindanao Rural Bank",
  "Bicol Savings Bank",
];

// ── Colour helpers ────────────────────────────────────────────────────────────
function bandColor(band) {
  if (band === "Approve") return { bg: "#0f4c35", ring: "#22c55e", text: "#4ade80" };
  if (band === "Conditional Approve") return { bg: "#3b2000", ring: "#f59e0b", text: "#fbbf24" };
  return { bg: "#3b0a0a", ring: "#ef4444", text: "#f87171" };
}

function BandIcon({ band, size = 20 }) {
  if (band === "Approve") return <CheckCircle size={size} style={{ color: "#4ade80" }} />;
  if (band === "Conditional Approve") return <AlertTriangle size={size} style={{ color: "#fbbf24" }} />;
  return <XCircle size={size} style={{ color: "#f87171" }} />;
}

// ── Score ring ────────────────────────────────────────────────────────────────
function ScoreRing({ score, band }) {
  const r = 54, cx = 64, cy = 64;
  const circ = 2 * Math.PI * r;
  const fill = (score / 100) * circ;
  const { text } = bandColor(band);

  return (
    <svg width="128" height="128" viewBox="0 0 128 128">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1e293b" strokeWidth="10" />
      <circle
        cx={cx} cy={cy} r={r}
        fill="none"
        stroke={text}
        strokeWidth="10"
        strokeDasharray={`${fill} ${circ - fill}`}
        strokeDashoffset={circ / 4}
        strokeLinecap="round"
        style={{ transition: "stroke-dasharray 1s ease" }}
      />
      <text x={cx} y={cy - 6} textAnchor="middle" fill={text} fontSize="28" fontWeight="700" fontFamily="'DM Mono', monospace">{score}</text>
      <text x={cx} y={cy + 14} textAnchor="middle" fill="#64748b" fontSize="11" fontFamily="'DM Sans', sans-serif">/ 100</text>
    </svg>
  );
}

// ── Field components ──────────────────────────────────────────────────────────
function Field({ label, hint, children }) {
  return (
    <div style={{ marginBottom: "1.1rem" }}>
      <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.08em", color: "#94a3b8", marginBottom: "0.35rem", textTransform: "uppercase" }}>
        {label}
      </label>
      {hint && <p style={{ fontSize: "0.72rem", color: "#475569", marginBottom: "0.35rem", marginTop: 0 }}>{hint}</p>}
      {children}
    </div>
  );
}

const inputStyle = {
  width: "100%",
  background: "#0f172a",
  border: "1px solid #1e293b",
  borderRadius: "8px",
  color: "#e2e8f0",
  fontSize: "0.9rem",
  padding: "0.55rem 0.8rem",
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.15s",
  fontFamily: "inherit",
};

function Input({ value, onChange, type = "text", min, max, placeholder }) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      type={type} value={value} onChange={onChange}
      min={min} max={max} placeholder={placeholder}
      style={{ ...inputStyle, borderColor: focused ? "#3b82f6" : "#1e293b" }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    />
  );
}

function Select({ value, onChange, options }) {
  const [focused, setFocused] = useState(false);
  return (
    <select
      value={value} onChange={onChange}
      style={{ ...inputStyle, borderColor: focused ? "#3b82f6" : "#1e293b", cursor: "pointer" }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    >
      {options.map(o => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>)}
    </select>
  );
}

function Toggle({ value, onChange, label }) {
  return (
    <div
      onClick={() => onChange(!value)}
      style={{
        display: "flex", alignItems: "center", gap: "0.6rem", cursor: "pointer", userSelect: "none",
      }}
    >
      <div style={{
        width: 40, height: 22, borderRadius: 11,
        background: value ? "#3b82f6" : "#1e293b",
        position: "relative", transition: "background 0.2s",
        border: `1px solid ${value ? "#3b82f6" : "#334155"}`,
      }}>
        <div style={{
          position: "absolute", top: 2, left: value ? 19 : 2,
          width: 16, height: 16, borderRadius: "50%",
          background: value ? "#fff" : "#64748b",
          transition: "left 0.2s",
        }} />
      </div>
      <span style={{ color: "#cbd5e1", fontSize: "0.88rem" }}>{label}</span>
    </div>
  );
}

function Btn({ children, onClick, disabled, variant = "primary", style: extraStyle = {} }) {
  const base = {
    display: "flex", alignItems: "center", gap: "0.4rem",
    padding: "0.6rem 1.2rem",
    borderRadius: "8px", border: "none", cursor: disabled ? "not-allowed" : "pointer",
    fontSize: "0.85rem", fontWeight: 600, transition: "opacity 0.15s, transform 0.1s",
    opacity: disabled ? 0.5 : 1, fontFamily: "inherit",
    ...extraStyle,
  };
  const styles = variant === "primary"
    ? { ...base, background: "#3b82f6", color: "#fff" }
    : variant === "ghost"
      ? { ...base, background: "transparent", color: "#94a3b8", border: "1px solid #1e293b" }
      : { ...base, background: "#0f172a", color: "#94a3b8", border: "1px solid #1e293b" };

  return <button style={styles} onClick={onClick} disabled={disabled}>{children}</button>;
}

// ── Step indicator ────────────────────────────────────────────────────────────
function StepBar({ current }) {
  const steps = ["Borrower Info", "Psychometric Quiz", "Credit Score"];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: "2rem" }}>
      {steps.map((s, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", flex: i < 2 ? 1 : "none" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
            <div style={{
              width: 26, height: 26, borderRadius: "50%",
              background: i < current ? "#3b82f6" : i === current ? "#1d4ed8" : "#1e293b",
              border: `2px solid ${i <= current ? "#3b82f6" : "#334155"}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "0.72rem", fontWeight: 700,
              color: i <= current ? "#fff" : "#475569",
              transition: "all 0.3s",
            }}>
              {i < current ? "✓" : i + 1}
            </div>
            <span style={{
              fontSize: "0.75rem", fontWeight: i === current ? 600 : 400,
              color: i === current ? "#e2e8f0" : "#475569",
              whiteSpace: "nowrap",
            }}>{s}</span>
          </div>
          {i < 2 && (
            <div style={{
              flex: 1, height: 2, margin: "0 0.6rem",
              background: i < current ? "#3b82f6" : "#1e293b",
              transition: "background 0.3s",
            }} />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [step, setStep] = useState(0); // 0=intake, 1=psychometric, 2=score
  const [partnerBank, setPartnerBank] = useState(PARTNER_BANKS[0]);

  // Intake form
  const [intake, setIntake] = useState({
    borrower_name: "",
    telco_provider: "Globe",
    monthly_topup: "",
    topup_frequency: "",
    utility_payments_on_time: "",
    gcash_maya_active: true,
    monthly_send_volume: "",
    livelihood_type: "vendor",
    years_in_livelihood: "",
  });

  // Psychometric
  const [quizAnswers, setQuizAnswers] = useState(["", "", "", "", ""]);
  const [psychoResult, setPsychoResult] = useState(null);
  const [psychoLoading, setPsychoLoading] = useState(false);
  const [psychoError, setPsychoError] = useState("");
  const [manualMode, setManualMode] = useState(false);
  const [manualScore, setManualScore] = useState("");
  const [manualJustification, setManualJustification] = useState("");

  // Score
  const [scoreResult, setScoreResult] = useState(null);
  const [scoreLoading, setScoreLoading] = useState(false);
  const [scoreError, setScoreError] = useState("");

  const setField = (key, val) => setIntake(p => ({ ...p, [key]: val }));

  // ── Step 0: Intake form ────────────────────────────────────────────────────
  function intakeValid() {
    const { borrower_name, monthly_topup, topup_frequency, utility_payments_on_time, monthly_send_volume, years_in_livelihood } = intake;
    return borrower_name.trim() && monthly_topup !== "" && topup_frequency !== "" &&
      utility_payments_on_time !== "" && monthly_send_volume !== "" && years_in_livelihood !== "";
  }

  // ── Step 1: Psychometric ───────────────────────────────────────────────────
  function quizComplete() {
    return quizAnswers.every(a => a.trim().length > 0);
  }

  async function runPsychometric() {
    setPsychoLoading(true);
    setPsychoError("");
    try {
      if (manualMode) {
        const res = await fetch(`${API_BASE}/psychometric/fallback`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ manual_score: parseFloat(manualScore), justification: manualJustification }),
        });
        if (!res.ok) throw new Error(await res.text());
        setPsychoResult(await res.json());
      } else {
        const res = await fetch(`${API_BASE}/psychometric`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answers: quizAnswers, borrower_name: intake.borrower_name || "Borrower" }),
        });
        if (!res.ok) throw new Error(await res.text());
        setPsychoResult(await res.json());
      }
      setStep(2);
      runScore();
    } catch (e) {
      setPsychoError(e.message || "API error. Use manual fallback.");
    } finally {
      setPsychoLoading(false);
    }
  }

  // ── Step 2: Score ──────────────────────────────────────────────────────────
  async function runScore(psycho = null) {
    const ps = psycho ?? psychoResult;
    setScoreLoading(true);
    setScoreError("");
    try {
      const payload = {
        telco_provider: intake.telco_provider,
        monthly_topup: parseInt(intake.monthly_topup),
        topup_frequency: parseInt(intake.topup_frequency),
        utility_payments_on_time: parseInt(intake.utility_payments_on_time),
        gcash_maya_active: intake.gcash_maya_active,
        monthly_send_volume: parseInt(intake.monthly_send_volume),
        livelihood_type: intake.livelihood_type,
        years_in_livelihood: parseInt(intake.years_in_livelihood),
        psychometric_score: ps?.psychometric_score ?? 50,
      };
      const res = await fetch(`${API_BASE}/score`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      setScoreResult(await res.json());
    } catch (e) {
      setScoreError(e.message || "Scoring failed.");
    } finally {
      setScoreLoading(false);
    }
  }

  useEffect(() => {
    if (step === 2 && psychoResult && !scoreResult) {
      runScore(psychoResult);
    }
  }, [step, psychoResult]);

  function reset() {
    setStep(0);
    setIntake({ borrower_name: "", telco_provider: "Globe", monthly_topup: "", topup_frequency: "", utility_payments_on_time: "", gcash_maya_active: true, monthly_send_volume: "", livelihood_type: "vendor", years_in_livelihood: "" });
    setQuizAnswers(["", "", "", "", ""]);
    setPsychoResult(null);
    setScoreResult(null);
    setPsychoError("");
    setScoreError("");
    setManualMode(false);
    setManualScore("");
    setManualJustification("");
    setPartnerBank(PARTNER_BANKS[0]);
  }

  // ── Layout ─────────────────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: "100vh",
      background: "#020817",
      fontFamily: "'DM Sans', sans-serif",
      color: "#e2e8f0",
    }}>
      {/* Header */}
      <div style={{
        borderBottom: "1px solid #0f172a",
        padding: "1rem 2rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "rgba(2,8,23,0.95)",
        backdropFilter: "blur(10px)",
        position: "sticky", top: 0, zIndex: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div style={{
            width: 32, height: 32, borderRadius: "8px",
            background: "linear-gradient(135deg, #1d4ed8, #7c3aed)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "0.9rem", fontWeight: 800, color: "#fff",
          }}>IC</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: "0.95rem", letterSpacing: "-0.02em" }}>Invisible Credit</div>
            <div style={{ fontSize: "0.65rem", color: "#475569", letterSpacing: "0.05em", textTransform: "uppercase" }}>Loan Officer Dashboard</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <Select
            value={partnerBank}
            onChange={e => setPartnerBank(e.target.value)}
            options={PARTNER_BANKS}
          />
          {step > 0 && (
            <Btn variant="ghost" onClick={reset} style={{ padding: "0.5rem 0.8rem" }}>
              <RotateCcw size={14} /> New Assessment
            </Btn>
          )}
        </div>
      </div>

      {/* Main */}
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "2.5rem 1.5rem" }}>

        <StepBar current={step} />

        {/* ── STEP 0: INTAKE ─────────────────────────────────────────── */}
        {step === 0 && (
          <div>
            <h1 style={{ fontSize: "1.4rem", fontWeight: 700, marginBottom: "0.25rem", letterSpacing: "-0.03em" }}>
              Borrower Intake
            </h1>
            <p style={{ color: "#64748b", fontSize: "0.85rem", marginBottom: "2rem" }}>
              Capture the borrower's alternative data profile. All fields are required.
            </p>

            <div style={{ background: "#080f1e", border: "1px solid #0f172a", borderRadius: "12px", padding: "1.5rem", marginBottom: "1rem" }}>
              <h2 style={{ fontSize: "0.8rem", fontWeight: 700, color: "#3b82f6", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "1.2rem" }}>Personal Info</h2>
              <Field label="Borrower Name">
                <Input value={intake.borrower_name} onChange={e => setField("borrower_name", e.target.value)} placeholder="e.g. Elena Reyes" />
              </Field>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <Field label="Livelihood Type">
                  <Select value={intake.livelihood_type} onChange={e => setField("livelihood_type", e.target.value)}
                    options={[{ value: "vendor", label: "Market Vendor" }, { value: "farmer", label: "Farmer" }, { value: "fisher", label: "Fisher" }, { value: "other", label: "Other Micro-enterprise" }]} />
                </Field>
                <Field label="Years in Livelihood">
                  <Input type="number" min="0" max="60" value={intake.years_in_livelihood} onChange={e => setField("years_in_livelihood", e.target.value)} placeholder="e.g. 7" />
                </Field>
              </div>
            </div>

            <div style={{ background: "#080f1e", border: "1px solid #0f172a", borderRadius: "12px", padding: "1.5rem", marginBottom: "1rem" }}>
              <h2 style={{ fontSize: "0.8rem", fontWeight: 700, color: "#8b5cf6", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "1.2rem" }}>Mobile & Telco</h2>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
                <Field label="Telco Provider">
                  <Select value={intake.telco_provider} onChange={e => setField("telco_provider", e.target.value)}
                    options={["Smart", "Globe", "DITO"].map(v => ({ value: v, label: v }))} />
                </Field>
                <Field label="Monthly Top-Up (₱)" hint="PHP amount">
                  <Input type="number" min="0" value={intake.monthly_topup} onChange={e => setField("monthly_topup", e.target.value)} placeholder="e.g. 300" />
                </Field>
                <Field label="Top-Up Frequency" hint="times/month">
                  <Input type="number" min="0" max="31" value={intake.topup_frequency} onChange={e => setField("topup_frequency", e.target.value)} placeholder="e.g. 8" />
                </Field>
              </div>
              <div style={{ marginTop: "0.5rem" }}>
                <Toggle value={intake.gcash_maya_active} onChange={v => setField("gcash_maya_active", v)} label="Has active GCash or Maya account" />
              </div>
            </div>

            <div style={{ background: "#080f1e", border: "1px solid #0f172a", borderRadius: "12px", padding: "1.5rem", marginBottom: "2rem" }}>
              <h2 style={{ fontSize: "0.8rem", fontWeight: 700, color: "#06b6d4", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "1.2rem" }}>Financial Behaviour</h2>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <Field label="Utility Payments On Time" hint="months in last 12">
                  <Input type="number" min="0" max="12" value={intake.utility_payments_on_time} onChange={e => setField("utility_payments_on_time", e.target.value)} placeholder="e.g. 10" />
                </Field>
                <Field label="Monthly Send Volume (₱)" hint="via mobile money">
                  <Input type="number" min="0" value={intake.monthly_send_volume} onChange={e => setField("monthly_send_volume", e.target.value)} placeholder="e.g. 1500" />
                </Field>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <Btn onClick={() => setStep(1)} disabled={!intakeValid()}>
                Next: Psychometric Quiz <ChevronRight size={16} />
              </Btn>
            </div>
          </div>
        )}

        {/* ── STEP 1: PSYCHOMETRIC ───────────────────────────────────── */}
        {step === 1 && (
          <div>
            <h1 style={{ fontSize: "1.4rem", fontWeight: 700, marginBottom: "0.25rem", letterSpacing: "-0.03em" }}>
              Psychometric Assessment
            </h1>
            <p style={{ color: "#64748b", fontSize: "0.85rem", marginBottom: "0.5rem" }}>
              Ask <strong style={{ color: "#94a3b8" }}>{intake.borrower_name || "the borrower"}</strong> each question aloud and transcribe their response.
            </p>

            {!manualMode ? (
              <>
                {PSYCHOMETRIC_QUESTIONS.map((q, i) => (
                  <div key={i} style={{ background: "#080f1e", border: "1px solid #0f172a", borderRadius: "12px", padding: "1.25rem", marginBottom: "0.75rem" }}>
                    <div style={{ display: "flex", gap: "0.7rem", marginBottom: "0.75rem" }}>
                      <span style={{
                        flexShrink: 0, width: 22, height: 22, borderRadius: "50%",
                        background: quizAnswers[i].trim() ? "#1d4ed8" : "#0f172a",
                        border: `1px solid ${quizAnswers[i].trim() ? "#3b82f6" : "#1e293b"}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "0.7rem", fontWeight: 700, color: quizAnswers[i].trim() ? "#93c5fd" : "#475569",
                        transition: "all 0.2s",
                      }}>
                        {quizAnswers[i].trim() ? "✓" : i + 1}
                      </span>
                      <p style={{ fontSize: "0.85rem", color: "#cbd5e1", margin: 0, lineHeight: 1.5 }}>{q}</p>
                    </div>
                    <textarea
                      value={quizAnswers[i]}
                      onChange={e => {
                        const a = [...quizAnswers]; a[i] = e.target.value; setQuizAnswers(a);
                      }}
                      placeholder="Transcribe borrower's response here…"
                      rows={3}
                      style={{
                        ...inputStyle, resize: "vertical", fontFamily: "inherit",
                        borderColor: quizAnswers[i].trim() ? "#1d4ed8" : "#1e293b",
                      }}
                    />
                  </div>
                ))}

                {psychoError && (
                  <div style={{ background: "#1e0a0a", border: "1px solid #7f1d1d", borderRadius: "8px", padding: "0.75rem 1rem", color: "#fca5a5", fontSize: "0.82rem", marginBottom: "1rem" }}>
                    ⚠ {psychoError}
                    <button onClick={() => setManualMode(true)} style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", textDecoration: "underline", marginLeft: "0.5rem", fontSize: "0.82rem" }}>
                      Switch to manual entry
                    </button>
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.5rem" }}>
                  <div style={{ display: "flex", gap: "0.75rem" }}>
                    <Btn variant="ghost" onClick={() => setStep(0)}><ChevronLeft size={15} /> Back</Btn>
                    <button onClick={() => setManualMode(true)} style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: "0.8rem", textDecoration: "underline" }}>
                      Use manual fallback
                    </button>
                  </div>
                  <Btn onClick={runPsychometric} disabled={!quizComplete() || psychoLoading}>
                    {psychoLoading ? <><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> Analysing…</> : <>Score with AI <ChevronRight size={16} /></>}
                  </Btn>
                </div>
              </>
            ) : (
              <div style={{ background: "#080f1e", border: "1px solid #0f172a", borderRadius: "12px", padding: "1.5rem" }}>
                <p style={{ color: "#f59e0b", fontSize: "0.8rem", marginBottom: "1rem" }}>⚠ Manual fallback — AI scoring unavailable</p>
                <Field label="Manual Psychometric Score (0–100)">
                  <Input type="number" min="0" max="100" value={manualScore} onChange={e => setManualScore(e.target.value)} placeholder="e.g. 65" />
                </Field>
                <Field label="Justification" hint="Describe your assessment of the borrower's responses">
                  <textarea value={manualJustification} onChange={e => setManualJustification(e.target.value)}
                    rows={3} placeholder="e.g. Borrower demonstrated clear repayment plan and savings discipline…"
                    style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }} />
                </Field>
                <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem" }}>
                  <Btn variant="ghost" onClick={() => setManualMode(false)}>← Try AI scoring</Btn>
                  <Btn onClick={runPsychometric}
                    disabled={!manualScore || !manualJustification.trim() || psychoLoading}>
                    {psychoLoading ? <><Loader2 size={15} /> Saving…</> : <>Submit & Score <ChevronRight size={15} /></>}
                  </Btn>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 2: RESULT ─────────────────────────────────────────── */}
        {step === 2 && (
          <div>
            <h1 style={{ fontSize: "1.4rem", fontWeight: 700, marginBottom: "0.25rem", letterSpacing: "-0.03em" }}>
              Credit Assessment
            </h1>
            <p style={{ color: "#64748b", fontSize: "0.85rem", marginBottom: "2rem" }}>
              {intake.borrower_name || "Borrower"} · {intake.livelihood_type} · {partnerBank !== PARTNER_BANKS[0] ? partnerBank : "Unassigned bank"}
            </p>

            {/* Psychometric card */}
            {psychoResult && (
              <div style={{ background: "#080f1e", border: "1px solid #0f172a", borderRadius: "12px", padding: "1.25rem", marginBottom: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.75rem" }}>
                  <div>
                    <div style={{ fontSize: "0.72rem", color: "#475569", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.3rem" }}>Psychometric Score</div>
                    <div style={{ fontSize: "2rem", fontWeight: 800, fontFamily: "'DM Mono', monospace", color: "#a78bfa" }}>
                      {psychoResult.psychometric_score.toFixed(1)} <span style={{ fontSize: "1rem", color: "#475569" }}>/ 100</span>
                    </div>
                    <div style={{ display: "inline-block", padding: "0.2rem 0.6rem", background: "#1e1035", border: "1px solid #4c1d95", borderRadius: "20px", fontSize: "0.72rem", color: "#c4b5fd", marginTop: "0.3rem" }}>
                      {psychoResult.conscientiousness_band} Conscientiousness
                    </div>
                  </div>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    {psychoResult.flags.map((f, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "0.4rem", marginBottom: "0.4rem" }}>
                        <span style={{ color: "#6d28d9", fontSize: "0.9rem", lineHeight: 1.4 }}>›</span>
                        <span style={{ fontSize: "0.8rem", color: "#94a3b8", lineHeight: 1.4 }}>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Credit score card */}
            {scoreLoading && (
              <div style={{ background: "#080f1e", border: "1px solid #0f172a", borderRadius: "12px", padding: "2rem", textAlign: "center" }}>
                <Loader2 size={28} style={{ animation: "spin 1s linear infinite", color: "#3b82f6", margin: "0 auto 1rem" }} />
                <p style={{ color: "#475569", fontSize: "0.85rem" }}>Computing credit score…</p>
              </div>
            )}

            {scoreError && (
              <div style={{ background: "#1e0a0a", border: "1px solid #7f1d1d", borderRadius: "8px", padding: "1rem", color: "#fca5a5", fontSize: "0.85rem" }}>
                ⚠ {scoreError}
              </div>
            )}

            {scoreResult && !scoreLoading && (() => {
              const { bg, ring, text } = bandColor(scoreResult.band);
              return (
                <div style={{
                  background: bg,
                  border: `1px solid ${ring}33`,
                  borderRadius: "16px",
                  padding: "1.75rem",
                  marginBottom: "1rem",
                }}>
                  <div style={{ display: "flex", gap: "1.5rem", alignItems: "center", flexWrap: "wrap" }}>
                    <ScoreRing score={scoreResult.credit_score} band={scoreResult.band} />
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.5rem" }}>
                        <BandIcon band={scoreResult.band} size={22} />
                        <span style={{ fontSize: "1.5rem", fontWeight: 800, color: text, letterSpacing: "-0.03em" }}>
                          {scoreResult.band}
                        </span>
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "#475569", marginBottom: "1rem" }}>
                        Confidence: {(scoreResult.probability * 100).toFixed(1)}% · {scoreResult.model_version}
                      </div>
                      <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#64748b", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.5rem" }}>
                        Reason Codes
                      </div>
                      {scoreResult.reason_codes.map((r, i) => (
                        <div key={i} style={{
                          display: "flex", alignItems: "center", gap: "0.5rem",
                          padding: "0.35rem 0.6rem",
                          background: "rgba(0,0,0,0.2)", borderRadius: "6px", marginBottom: "0.3rem",
                        }}>
                          <span style={{ fontSize: "0.75rem", fontFamily: "'DM Mono', monospace", color: text }}>{i + 1}.</span>
                          <span style={{ fontSize: "0.8rem", color: "#cbd5e1" }}>{r}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {scoreResult.band === "Approve" && (
                    <div style={{ marginTop: "1.25rem", padding: "0.8rem 1rem", background: "rgba(0,0,0,0.25)", borderRadius: "8px", borderLeft: `3px solid ${ring}` }}>
                      <p style={{ margin: 0, fontSize: "0.82rem", color: "#86efac" }}>
                        ✓ Borrower meets the criteria for a micro-loan. Proceed with loan documentation under BSP Circular 1105 disclosure requirements.
                      </p>
                    </div>
                  )}
                  {scoreResult.band === "Conditional Approve" && (
                    <div style={{ marginTop: "1.25rem", padding: "0.8rem 1rem", background: "rgba(0,0,0,0.25)", borderRadius: "8px", borderLeft: `3px solid ${ring}` }}>
                      <p style={{ margin: 0, fontSize: "0.82rem", color: "#fde68a" }}>
                        ⚠ Conditional approval — additional verification or reduced loan amount recommended. Provide reason codes to borrower per BSP Circular 1105.
                      </p>
                    </div>
                  )}
                  {scoreResult.band === "Decline" && (
                    <div style={{ marginTop: "1.25rem", padding: "0.8rem 1rem", background: "rgba(0,0,0,0.25)", borderRadius: "8px", borderLeft: `3px solid ${ring}` }}>
                      <p style={{ margin: 0, fontSize: "0.82rem", color: "#fca5a5" }}>
                        ✕ Loan declined. You are required to provide the reason codes above to the borrower in writing per BSP Circular 1105.
                      </p>
                    </div>
                  )}
                </div>
              );
            })()}

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "1rem" }}>
              <Btn variant="ghost" onClick={() => setStep(1)}><ChevronLeft size={15} /> Back</Btn>
              <Btn onClick={reset}><RotateCcw size={14} /> New Assessment</Btn>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500;700&display=swap');
        * { box-sizing: border-box; }
        @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
        select option { background: #0f172a; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #0f172a; }
        ::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 3px; }
      `}</style>
    </div>
  );
}
