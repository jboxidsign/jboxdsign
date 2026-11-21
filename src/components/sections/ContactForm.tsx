"use client";

import { useEffect, useId, useRef, useState } from "react";
import { company, primaryCta, projectTypes } from "@/content/site";
import { LIMITS, validateContact, type ContactInput, type FieldErrors } from "@/lib/contact";
import { TURNSTILE_SITE_KEY, TurnstileWidget, type TurnstileHandle } from "./Turnstile";

type Status = "idle" | "sending" | "sent" | "error";
const EMPTY: ContactInput = { name: "", email: "", phone: "", projectType: "", message: "" };

export function ContactForm() {
  const uid = useId();
  const [values, setValues] = useState<ContactInput>(EMPTY);
  const [touched, setTouched] = useState<Partial<Record<keyof ContactInput, boolean>>>({});
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<Status>("idle");
  const [serverError, setServerError] = useState("");
  const [flash, setFlash] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaError, setCaptchaError] = useState("");
  const captcha = useRef<TurnstileHandle>(null);
  const needsCaptcha = TURNSTILE_SITE_KEY !== "";
  const formRef = useRef<HTMLFormElement>(null);
  const successRef = useRef<HTMLDivElement>(null);

  // "Discuss a kitchen project" etc. preselect the project type.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const link = (e.target as HTMLElement | null)?.closest<HTMLElement>("[data-project-type]");
      const type = link?.dataset.projectType;
      if (!type || !(projectTypes as readonly string[]).includes(type)) return;
      setValues((v) => ({ ...v, projectType: type as ContactInput["projectType"] }));
      setStatus((s) => (s === "sent" ? "idle" : s));
      setFlash(true);
      window.setTimeout(() => setFlash(false), 1600);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  useEffect(() => {
    if (status === "sent") successRef.current?.focus();
  }, [status]);

  const fieldError = (k: keyof ContactInput) => (touched[k] ? errors[k] : undefined);

  const update = (k: keyof ContactInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const next = { ...values, [k]: e.target.value };
    setValues(next);
    if (touched[k]) {
      const r = validateContact(next);
      setErrors(r.ok ? {} : r.errors);
    }
  };

  const blur = (k: keyof ContactInput) => () => {
    setTouched((t) => ({ ...t, [k]: true }));
    const r = validateContact(values);
    setErrors(r.ok ? {} : r.errors);
  };

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "sending") return;
    setServerError("");
    const r = validateContact(values);
    setTouched({ name: true, email: true, phone: true, projectType: true, message: true });
    if (!r.ok) {
      setErrors(r.errors);
      const first = (Object.keys(r.errors) as (keyof ContactInput)[])[0];
      formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      return;
    }
    setErrors({});
    if (needsCaptcha && !captchaToken) {
      setCaptchaError("Please complete the verification before sending.");
      formRef.current?.querySelector<HTMLElement>(".turnstile")?.scrollIntoView({ block: "center", behavior: "smooth" });
      return;
    }
    setCaptchaError("");
    setStatus("sending");
    try {
      const honeypot = (formRef.current?.elements.namedItem("company") as HTMLInputElement | null)?.value ?? "";
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...r.data, company: honeypot, turnstileToken: captchaToken ?? "" }),
      });
      const body = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; fieldErrors?: FieldErrors; verification?: string };
      if (!res.ok || !body.ok) {
        // Turnstile tokens are single-use: get a fresh one before the next attempt.
        captcha.current?.reset();
        if (body.fieldErrors) setErrors(body.fieldErrors);
        if (body.verification === "failed") {
          setCaptchaError(body.error || "Please complete the verification again.");
          setStatus("idle");
          return;
        }
        setServerError(body.error || "Something went wrong. Please try again.");
        setStatus("error");
        return;
      }
      setStatus("sent");
      setValues(EMPTY);
      setTouched({});
      setCaptchaToken(null);
    } catch {
      captcha.current?.reset();
      setServerError(`We couldn't reach the server. Please call ${company.phone} or email ${company.email}.`);
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <div className="form-success" ref={successRef} tabIndex={-1} role="status">
        <svg className="form-success__icon" viewBox="0 0 52 52" aria-hidden="true">
          <circle cx="26" cy="26" r="24" pathLength={1} />
          <path d="M15 27l7 7 15-16" pathLength={1} />
        </svg>
        <h3 className="h-item">Thank you. Your message is on its way.</h3>
        <p>We&apos;ll review your project details and get back to you soon. For anything urgent, call <a href={company.phoneHref}>{company.phone}</a>.</p>
        <button type="button" className="arrow-link arrow-link--dark" onClick={() => setStatus("idle")}>
          <span>Send another message</span>
        </button>
      </div>
    );
  }

  const id = (k: string) => `${uid}-${k}`;
  const describe = (k: keyof ContactInput) => (fieldError(k) ? id(`${k}-err`) : undefined);

  return (
    <form ref={formRef} className="form" noValidate onSubmit={onSubmit} aria-describedby={id("req")}>
      <div className="form__grid">
        <Field label="Full name" required htmlFor={id("name")} error={fieldError("name")} errorId={id("name-err")}>
          <input
            id={id("name")}
            name="name"
            type="text"
            autoComplete="name"
            placeholder="Enter your name"
            maxLength={LIMITS.name}
            value={values.name}
            onChange={update("name")}
            onBlur={blur("name")}
            aria-invalid={!!fieldError("name")}
            aria-describedby={describe("name")}
            required
          />
        </Field>
        <Field label="Email address" required htmlFor={id("email")} error={fieldError("email")} errorId={id("email-err")}>
          <input
            id={id("email")}
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="Enter your email"
            maxLength={LIMITS.email}
            value={values.email}
            onChange={update("email")}
            onBlur={blur("email")}
            aria-invalid={!!fieldError("email")}
            aria-describedby={describe("email")}
            required
          />
        </Field>
        <Field label="Phone number (optional)" htmlFor={id("phone")} error={fieldError("phone")} errorId={id("phone-err")}>
          <input
            id={id("phone")}
            name="phone"
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            placeholder="Enter your phone number"
            maxLength={LIMITS.phone}
            value={values.phone}
            onChange={update("phone")}
            onBlur={blur("phone")}
            aria-invalid={!!fieldError("phone")}
            aria-describedby={describe("phone")}
          />
        </Field>
        <Field label="Project type" htmlFor={id("type")} error={fieldError("projectType")} errorId={id("projectType-err")} className={`field--select${flash ? " is-flash" : ""}`}>
          <select
            id={id("type")}
            name="projectType"
            value={values.projectType}
            onChange={update("projectType")}
            onBlur={blur("projectType")}
            className={values.projectType ? "" : "is-empty"}
            aria-describedby={describe("projectType")}
          >
            <option value="">Select a project type</option>
            {projectTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <svg className="field__chevron" width="12" height="8" viewBox="0 0 12 8" aria-hidden="true">
            <path d="M1 1.5l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.6" />
          </svg>
        </Field>
        <Field label="Message" required htmlFor={id("message")} error={fieldError("message")} errorId={id("message-err")} className="field--full">
          <textarea
            id={id("message")}
            name="message"
            rows={4}
            placeholder="Tell us about your project..."
            maxLength={LIMITS.message}
            value={values.message}
            onChange={update("message")}
            onBlur={blur("message")}
            aria-invalid={!!fieldError("message")}
            aria-describedby={describe("message")}
            required
          />
        </Field>
      </div>

      {/* Honeypot for bots; hidden from people and assistive tech. */}
      <div className="hp" aria-hidden="true">
        <label>
          Company
          <input type="text" name="company" tabIndex={-1} autoComplete="off" defaultValue="" />
        </label>
      </div>

      {needsCaptcha ? (
        <div className={`field field--captcha${captchaError ? " has-error" : ""}`}>
          <span className="mono field__label">
            Verification<span aria-hidden="true"> *</span>
          </span>
          <TurnstileWidget
            ref={captcha}
            siteKey={TURNSTILE_SITE_KEY}
            onToken={(t) => {
              setCaptchaToken(t);
              if (t) setCaptchaError("");
            }}
          />
          <p className="field__error" aria-live="polite">
            {captchaError}
          </p>
        </div>
      ) : null}

      {serverError ? (
        <p className="form__error" role="alert">
          {serverError}
        </p>
      ) : null}

      <div className="form__foot">
        <button type="submit" className={`btn btn--dark${status === "sending" ? " is-loading" : ""}`} disabled={status === "sending"} aria-busy={status === "sending"}>
          <span className="btn__label">
            <span className="btn__roll" data-text={status === "sending" ? undefined : primaryCta}>
              {status === "sending" ? "Sending…" : primaryCta}
            </span>
          </span>
          <span className="btn__spinner" aria-hidden="true" />
        </button>
        <span className="mono" id={id("req")}>
          * Required fields
        </span>
      </div>
    </form>
  );
}

function Field({
  label,
  required,
  htmlFor,
  error,
  errorId,
  className = "",
  children,
}: {
  label: string;
  required?: boolean;
  htmlFor: string;
  error?: string;
  errorId: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`field ${className}${error ? " has-error" : ""}`}>
      <label className="mono" htmlFor={htmlFor}>
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </label>
      <div className="field__control">
        {children}
        <span className="field__line" aria-hidden="true" />
      </div>
      <p className="field__error" id={errorId} aria-live="polite">
        {error ?? ""}
      </p>
    </div>
  );
}
