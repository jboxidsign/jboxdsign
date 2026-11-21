"use client";

import { useState } from "react";

export function PasswordField({ error }: { error?: string }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className={`field gate__field${error ? " has-error" : ""}`}>
      <label className="mono" htmlFor="gate-password">
        Password
      </label>
      <div className="field__control">
        <input
          id="gate-password"
          name="password"
          type={visible ? "text" : "password"}
          autoComplete="current-password"
          placeholder="Enter password"
          required
          autoFocus
          aria-invalid={!!error}
          aria-describedby={error ? "gate-error" : undefined}
        />
        <button type="button" className="gate__toggle mono" onClick={() => setVisible((v) => !v)} aria-pressed={visible}>
          {visible ? "Hide" : "Show"}
        </button>
        <span className="field__line" aria-hidden="true" />
      </div>
      <p className="field__error" id="gate-error" role={error ? "alert" : undefined}>
        {error ?? ""}
      </p>
    </div>
  );
}
