"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import * as m from "motion/react-m";
import { DrawnCheck } from "@/components/motion/drawn-check";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { subscribeAction } from "@/lib/actions/newsletter";
import { spring } from "@/lib/motion";
import type { NewsletterState } from "@/types/engagement";

const initialState: NewsletterState = { status: "idle" };

// Client leaf: the sign-up form. The Server Action is passed straight to <form action>,
// so the form also works before hydration or with JS off: the browser posts it, the
// action runs, and the page comes back rendered with the result state.
// With JS, useActionState keeps the page in place and exposes the pending state.
// Announcements:
// - error: an always-present role="alert" region. It's emptied while the action is
//   pending and refilled with the result, so an Enter-submit (focus never leaves the
//   input, so no focus event fires) and a repeated identical error are both announced.
//   Focus also returns to the input. Only an address error (`field: "email"`) marks the
//   input aria-invalid and describes it; a form-level error (e.g. sign-ups paused) only
//   shows in the alert;
// - success: the form is swapped for a confirmation (a check that pops in and draws
//   itself), and focus moves to it, so keyboard users aren't left on a removed button.
export function NewsletterForm() {
  const [state, formAction, pending] = useActionState(subscribeAction, initialState);
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const successRef = useRef<HTMLDivElement>(null);
  // True once this visitor submitted in this session (with JS). Only then does focus
  // move and the success state animate in; a no-JS response renders the final state.
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (pending) setSubmitted(true);
  }, [pending]);

  const succeeded = state.status === "success";
  const failed = state.status === "error";
  // Only an error about the address itself invalidates the field.
  const invalid = failed && state.field === "email";
  // Cleared while pending, so the next result is a fresh insertion the alert announces.
  const alertText = failed && !pending ? state.message : "";

  // `state` is a new object after every submission, so a repeated error refocuses too.
  useEffect(() => {
    if (!submitted) return;
    if (state.status === "success") successRef.current?.focus();
    else if (state.status === "error") inputRef.current?.focus();
  }, [state, submitted]);

  const inputId = `${id}-email`;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const messageId = `${id}-message`;

  if (succeeded) {
    return (
      <div ref={successRef} tabIndex={-1} aria-labelledby={messageId} className="outline-none">
        <m.div
          className="flex items-start gap-4"
          initial={submitted ? { opacity: 0, y: 12 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={spring.reveal}
        >
          <m.span
            className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10"
            initial={submitted ? { scale: 0.3 } : false}
            animate={{ scale: 1 }}
            transition={spring.pop}
          >
            {submitted ? (
              <DrawnCheck delay={0.12} className="size-5" />
            ) : (
              // Static tick for the no-JS render (DrawnCheck starts undrawn).
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-5 text-primary">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            )}
          </m.span>
          <p id={messageId} className="pt-2 text-base text-foreground">
            {state.message}
          </p>
        </m.div>
      </div>
    );
  }

  return (
    <form action={formAction}>
      <FieldGroup>
        <Field data-invalid={invalid || undefined}>
          <FieldLabel htmlFor={inputId}>Email address</FieldLabel>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              ref={inputRef}
              id={inputId}
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              required
              maxLength={254}
              placeholder="you@example.com"
              // Keep what they typed after an error (React resets the form after each action
              // to the inputs' default values).
              defaultValue={failed ? state.email : undefined}
              aria-invalid={invalid || undefined}
              aria-describedby={invalid ? `${errorId} ${hintId}` : hintId}
              className="h-9 sm:flex-1"
            />
            <Button type="submit" size="lg" disabled={pending} className="sm:w-32">
              {pending ? <Spinner data-icon="inline-start" aria-hidden="true" role={undefined} /> : null}
              {pending ? "Subscribing" : "Subscribe"}
            </Button>
          </div>
          {/* Always in the DOM so assistive tech tracks it; empty when there's nothing to say. */}
          <p id={errorId} role="alert" className="text-sm text-destructive">
            {alertText}
          </p>
          <FieldDescription id={hintId}>One email when a new post is published. Nothing else.</FieldDescription>
        </Field>
      </FieldGroup>
    </form>
  );
}
