"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch, type FriendlyError } from "@/lib/friendly-errors";
import {
  BUSINESS_TYPES,
  buildAiInstructions,
  buildGreeting,
  getBusinessType,
  type BusinessTypeId,
  type OnboardingAnswers,
} from "@/lib/onboarding/business-types";
import { LOGIN_PATH, whatsappLink } from "@/lib/config";

/**
 * Three-step onboarding.
 *
 *   1. Connect Facebook   (choosing the page happens inside this step)
 *   2. Tell the AI about your business  (one question per screen)
 *   3. Ready
 *
 * Step 2 asks one thing at a time and every question is skippable. That trades
 * more taps for far less intimidation, which is the right trade for someone who
 * has never filled in a web form before.
 */

type PageConn = {
  id: string;
  pageId: string;
  pageName: string;
  status: string;
};

const STEP_COUNT = 3;

function Progress({ step }: { step: number }) {
  return (
    <>
      <div className="rp-stepper">
        <span className="rp-stepper__label">
          Step {step} of {STEP_COUNT}
        </span>
      </div>
      <div
        className="rp-progress"
        role="progressbar"
        aria-valuenow={step}
        aria-valuemin={1}
        aria-valuemax={STEP_COUNT}
        aria-label={`Step ${step} of ${STEP_COUNT}`}
        style={{ marginBottom: "var(--rp-space-5)" }}
      >
        <div
          className="rp-progress__fill"
          style={{ width: `${(step / STEP_COUNT) * 100}%` }}
        />
      </div>
    </>
  );
}

function ErrorBanner({ error }: { error: FriendlyError }) {
  return (
    <div className="rp-banner rp-banner--danger" role="alert">
      <span className="rp-banner__icon" aria-hidden="true">
        ❗
      </span>
      <span>{error.message}</span>
    </div>
  );
}

function HelpLink() {
  return (
    <p className="rp-hint" style={{ textAlign: "center" }}>
      Need help?{" "}
      <a href={whatsappLink("onboarding")} target="_blank" rel="noreferrer">
        Message us on WhatsApp
      </a>
    </p>
  );
}

/* ------------------------------------------------------------------ step 1 */

function StepConnect({ onDone }: { onDone: () => void }) {
  const search = useSearchParams();
  const [pages, setPages] = useState<PageConn[]>([]);
  const [loginUrl, setLoginUrl] = useState<string | null>(null);
  const [error, setError] = useState<FriendlyError | null>(null);
  const [loading, setLoading] = useState(true);

  // A failed Facebook redirect comes back as ?error=<oauth code>. The code
  // itself is never shown — it is read here and mapped to one plain sentence.
  const redirectFailed = search.get("error") !== null;

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await apiFetch<{
        pages?: PageConn[];
        loginUrl?: string | null;
      }>("/api/connect");
      if (cancelled) return;
      setLoading(false);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setPages(result.data.pages || []);
      setLoginUrl(result.data.loginUrl ?? null);
      if (redirectFailed) {
        setError({
          message: "We couldn't connect your Facebook page. Please try again.",
          action: "Try again",
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [redirectFailed]);

  if (loading) {
    return (
      <div className="rp-stack" aria-busy="true">
        <div className="rp-skeleton rp-skeleton--row" />
        <div className="rp-skeleton rp-skeleton--row" />
      </div>
    );
  }

  // Already connected — confirm and move on rather than asking again.
  if (pages.length > 0) {
    return (
      <div className="rp-stack rp-stack--lg">
        <div className="rp-banner rp-banner--success">
          <span className="rp-banner__icon" aria-hidden="true">
            ✅
          </span>
          <span>
            Connected to <strong>{pages[0].pageName}</strong>
          </span>
        </div>
        {pages.length > 1 ? (
          <p className="rp-hint">
            You can change which page your AI answers later in Settings.
          </p>
        ) : null}
        <button
          type="button"
          className="rp-btn rp-btn--primary rp-btn--block"
          onClick={onDone}
        >
          Continue
        </button>
      </div>
    );
  }

  return (
    <div className="rp-stack rp-stack--lg" style={{ textAlign: "center" }}>
      <div style={{ fontSize: 64 }} aria-hidden="true">
        👋
      </div>
      <h1 style={{ fontSize: "var(--rp-text-3xl)" }}>
        Let&rsquo;s connect your Facebook Page
      </h1>
      <p style={{ color: "var(--rp-muted)" }}>
        Your AI will start answering customers as soon as this is done.
      </p>

      {error ? <ErrorBanner error={error} /> : null}

      {loginUrl ? (
        <a className="rp-btn rp-btn--primary rp-btn--block" href={loginUrl}>
          Connect My Facebook Page
        </a>
      ) : (
        // No Meta credentials configured. The old screen told the user to set
        // META_APP_ID themselves; that is our problem, not theirs.
        <div className="rp-banner rp-banner--warning">
          <span className="rp-banner__icon" aria-hidden="true">
            ⚠️
          </span>
          <span>
            Facebook connection isn&rsquo;t available yet. You can set up your
            business first and connect later.
          </span>
        </div>
      )}

      <p className="rp-hint">
        🔒 We only read and reply to your messages. We never post anything.
      </p>

      <button type="button" className="rp-btn rp-btn--ghost" onClick={onDone}>
        I&rsquo;ll do this later
      </button>

      <HelpLink />
    </div>
  );
}

/* ------------------------------------------------------------------ step 2 */

type Question = {
  key: keyof OnboardingAnswers;
  title: string;
  hint?: string;
  placeholder?: string;
  multiline?: boolean;
  inputMode?: "tel" | "text";
};

const QUESTIONS: Question[] = [
  {
    key: "businessName",
    title: "What is your business name?",
    hint: "Customers will see this name in replies.",
    placeholder: "Rahim Store",
  },
  {
    key: "phone",
    title: "What is your phone number?",
    hint: "So the AI can share it when customers ask.",
    placeholder: "017XXXXXXXX",
    inputMode: "tel",
  },
  {
    key: "address",
    title: "Where are you located?",
    placeholder: "Mirpur 10, Dhaka",
  },
  {
    key: "hours",
    title: "When are you open?",
    placeholder: "Every day, 10am to 9pm",
  },
  {
    key: "delivery",
    title: "Do you deliver?",
    hint: "Tell customers where you deliver and what it costs.",
    placeholder: "Yes, all over Dhaka. Delivery is ৳60.",
  },
  {
    key: "sells",
    title: "What do you sell?",
    placeholder: "Shirts, pants, and belts for men",
    multiline: true,
  },
  {
    key: "rules",
    title: "Anything customers should know?",
    hint: "For example, returns or advance payment.",
    placeholder: "We accept returns within 3 days.",
    multiline: true,
  },
];

function StepBusiness({
  answers,
  setAnswers,
  onDone,
  onBack,
}: {
  answers: OnboardingAnswers;
  setAnswers: (a: OnboardingAnswers) => void;
  onDone: () => void;
  onBack: () => void;
}) {
  // -1 is the business-type card grid; 0..n are the text questions.
  const [index, setIndex] = useState(-1);

  function next() {
    if (index >= QUESTIONS.length - 1) {
      onDone();
      return;
    }
    setIndex(index + 1);
  }

  function back() {
    if (index <= -1) {
      onBack();
      return;
    }
    setIndex(index - 1);
  }

  if (index === -1) {
    return (
      <div className="rp-stack rp-stack--lg">
        <h1 style={{ fontSize: "var(--rp-text-2xl)" }}>
          What kind of business do you have?
        </h1>
        <div className="rp-grid-2">
          {BUSINESS_TYPES.map((type) => (
            <button
              key={type.id}
              type="button"
              className="rp-card"
              aria-pressed={answers.businessType === type.id}
              style={{
                textAlign: "center",
                minHeight: 140,
                borderColor:
                  answers.businessType === type.id
                    ? "var(--rp-primary)"
                    : undefined,
                background:
                  answers.businessType === type.id
                    ? "var(--rp-primary-soft)"
                    : undefined,
              }}
              onClick={() => {
                setAnswers({ ...answers, businessType: type.id });
                setIndex(0);
              }}
            >
              <span style={{ fontSize: 40, display: "block" }} aria-hidden="true">
                {type.icon}
              </span>
              <span
                style={{
                  display: "block",
                  marginTop: 8,
                  fontSize: "var(--rp-text-lg)",
                  fontWeight: 600,
                }}
              >
                {type.label}
              </span>
            </button>
          ))}
        </div>
        <button type="button" className="rp-btn rp-btn--ghost" onClick={back}>
          ← Back
        </button>
      </div>
    );
  }

  const question = QUESTIONS[index];
  const value = answers[question.key];

  return (
    <div className="rp-stack rp-stack--lg">
      <h1 style={{ fontSize: "var(--rp-text-2xl)" }}>{question.title}</h1>

      <div className="rp-field">
        <label className="rp-sr-only" htmlFor="rp-onboard-input">
          {question.title}
        </label>
        {question.multiline ? (
          <textarea
            id="rp-onboard-input"
            className="rp-input"
            placeholder={question.placeholder}
            value={value}
            autoFocus
            onChange={(e) =>
              setAnswers({ ...answers, [question.key]: e.target.value })
            }
          />
        ) : (
          <input
            id="rp-onboard-input"
            className="rp-input"
            placeholder={question.placeholder}
            inputMode={question.inputMode}
            value={value}
            autoFocus
            onChange={(e) =>
              setAnswers({ ...answers, [question.key]: e.target.value })
            }
          />
        )}
        {question.hint ? (
          <span className="rp-hint">{question.hint}</span>
        ) : null}
      </div>

      <button
        type="button"
        className="rp-btn rp-btn--primary rp-btn--block"
        onClick={next}
      >
        {index >= QUESTIONS.length - 1 ? "Finish" : "Next"}
      </button>

      <div className="rp-row" style={{ justifyContent: "space-between" }}>
        <button type="button" className="rp-btn rp-btn--ghost" onClick={back}>
          ← Back
        </button>
        <button type="button" className="rp-btn rp-btn--ghost" onClick={next}>
          Skip for now
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ step 3 */

function StepReady({ answers }: { answers: OnboardingAnswers }) {
  const router = useRouter();
  const type = getBusinessType(answers.businessType);

  return (
    <div className="rp-stack rp-stack--lg" style={{ textAlign: "center" }}>
      <div style={{ fontSize: 64 }} aria-hidden="true">
        🎉
      </div>
      <h1 style={{ fontSize: "var(--rp-text-3xl)" }}>
        Your AI is now answering your customers
      </h1>
      <p style={{ color: "var(--rp-muted)" }}>
        It replies day and night, even when you&rsquo;re asleep.
      </p>

      <div className="rp-card" style={{ textAlign: "left" }}>
        <p className="rp-card__title">It can already answer questions like:</p>
        <ul className="rp-stack" style={{ marginTop: "var(--rp-space-1)" }}>
          {type.starterQuestions.map((q) => (
            <li key={q} style={{ color: "var(--rp-muted)" }}>
              &ldquo;{q}&rdquo;
            </li>
          ))}
        </ul>
      </div>

      <button
        type="button"
        className="rp-btn rp-btn--primary rp-btn--block"
        onClick={() => router.push("/app/messages")}
      >
        Go To Messages
      </button>
      <button
        type="button"
        className="rp-btn rp-btn--ghost"
        onClick={() => router.push("/app/assistant")}
      >
        Send myself a test message
      </button>
    </div>
  );
}

/* -------------------------------------------------------------------- page */

const EMPTY: OnboardingAnswers = {
  businessType: "shop" as BusinessTypeId,
  businessName: "",
  phone: "",
  address: "",
  hours: "",
  delivery: "",
  sells: "",
  rules: "",
};

function WelcomeInner() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState<OnboardingAnswers>(EMPTY);
  const [saveError, setSaveError] = useState<FriendlyError | null>(null);
  const [saving, setSaving] = useState(false);
  const [authorised, setAuthorised] = useState(false);

  // Onboarding is behind sign-in. Without this the first thing a signed-out
  // visitor saw was "You've been signed out" stacked on top of step 1, which
  // reads as a broken app rather than a redirect.
  useEffect(() => {
    void (async () => {
      const me = await apiFetch("/api/auth/me");
      if (!me.ok) {
        router.replace(LOGIN_PATH);
        return;
      }
      setAuthorised(true);
    })();
  }, [router]);

  /**
   * Persist the answers as bot configuration. The generated instructions and
   * greeting are derived here and never shown to the user.
   */
  async function finish() {
    setSaving(true);
    setSaveError(null);
    const result = await apiFetch("/api/dashboard/knowledge", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "save_config",
        businessName: answers.businessName.trim() || "My Business",
        greeting: buildGreeting(answers),
        systemPrompt: buildAiInstructions(answers),
        productFaq: answers.sells.trim(),
        handoffEnabled: true,
      }),
    });
    setSaving(false);
    if (!result.ok) {
      setSaveError(result.error);
      return;
    }
    setStep(3);
  }

  if (!authorised) {
    return (
      <main className="rp-page" style={{ maxWidth: 560 }}>
        <div className="rp-stack" aria-busy="true" aria-label="Loading">
          <div className="rp-skeleton rp-skeleton--row" />
          <div className="rp-skeleton rp-skeleton--row" />
        </div>
      </main>
    );
  }

  return (
    <main className="rp-page" style={{ maxWidth: 560 }}>
      {step < 3 ? <Progress step={step} /> : <Progress step={3} />}

      {saveError ? (
        <div style={{ marginBottom: "var(--rp-space-3)" }}>
          <ErrorBanner error={saveError} />
        </div>
      ) : null}

      {step === 1 ? <StepConnect onDone={() => setStep(2)} /> : null}

      {step === 2 ? (
        <StepBusiness
          answers={answers}
          setAnswers={setAnswers}
          onBack={() => setStep(1)}
          onDone={() => void finish()}
        />
      ) : null}

      {step === 3 ? <StepReady answers={answers} /> : null}

      {saving ? (
        <p className="rp-hint" role="status" style={{ marginTop: 16 }}>
          Saving…
        </p>
      ) : null}
    </main>
  );
}

export default function WelcomePage() {
  return (
    <Suspense
      fallback={
        <main className="rp-page">
          <div className="rp-skeleton rp-skeleton--row" />
        </main>
      }
    >
      <WelcomeInner />
    </Suspense>
  );
}
