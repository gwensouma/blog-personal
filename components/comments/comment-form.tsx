"use client";

import { useActionState, useEffect, useId, useOptimistic, useRef, useState, useSyncExternalStore } from "react";
import * as m from "motion/react-m";
import { CheckIcon } from "lucide-react";
import { CommentEntry } from "@/components/comments/comment-list";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { addCommentAction } from "@/lib/actions/comments";
import { COMMENT_BODY_MAX_LENGTH, COMMENT_NAME_MAX_LENGTH, validateCommentInput } from "@/lib/comment-input";
import { spring } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { CommentFormState } from "@/types/comment";

const initialState: CommentFormState = { status: "idle", message: "" };

type PendingComment = { key: string; name: string; body: string };

const noopSubscribe = () => () => {};

// Client leaf: the comment form, plus any comment still being posted (shown at the top of this
// component, right under the server-rendered list, so it reads as the list's last item).
//
// Progressive enhancement: until hydration the form's action is the Server Action itself (through
// useActionState), so without JS the browser posts it and the page comes back rendered with the new
// comment, the count and the result message. After hydration the action is a small client wrapper
// that adds the optimistic comment and then dispatches the same Server Action, inside the form's
// transition, so the preview lasts until the response (and its revalidated RSC payload) lands.
//
// Announcements: one always-present role="alert" region holds the error or the confirmation. It is
// emptied while pending, so a repeated identical message is announced again. After a JS submit,
// focus goes to the offending field on a field error, otherwise to the message.
export function CommentForm({ slug }: { slug: string }) {
  const [state, formAction, pending] = useActionState(addCommentAction, initialState);
  const [pendingComments, addPendingComment] = useOptimistic<PendingComment[], PendingComment>([], (list, item) => [...list, item]);
  // False on the server and during hydration, true afterwards.
  const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false);
  // True once this visitor submitted with JS: only then does focus move.
  const [submitted, setSubmitted] = useState(false);
  const counter = useRef(0);
  const nameRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const messageRef = useRef<HTMLDivElement>(null);
  const id = useId();

  function submitWithPreview(formData: FormData) {
    setSubmitted(true);
    const name = formData.get("name");
    const body = formData.get("body");
    // Preview only what the server would accept; the server still decides.
    if (typeof name === "string" && typeof body === "string" && !formData.get("website")) {
      const input = validateCommentInput(name, body);
      if (input.ok) {
        counter.current += 1;
        addPendingComment({ key: `pending-${counter.current}`, name: input.name, body: input.body });
      }
    }
    formAction(formData);
  }

  const failed = state.status === "error";
  const succeeded = state.status === "success";
  const nameInvalid = failed && state.field === "name";
  const bodyInvalid = failed && state.field === "body";
  const message = pending ? "" : state.message;

  // `state` is a new object after every submission, so a repeated result refocuses too.
  useEffect(() => {
    if (!submitted || state.status === "idle") return;
    if (state.field === "name") nameRef.current?.focus();
    else if (state.field === "body") bodyRef.current?.focus();
    else messageRef.current?.focus();
  }, [state, submitted]);

  const nameId = `${id}-name`;
  const bodyId = `${id}-body`;
  const bodyHintId = `${id}-body-hint`;
  const websiteId = `${id}-website`;
  const messageId = `${id}-message`;

  return (
    <div className="flex flex-col">
      {pendingComments.map((comment) => (
        <m.div
          key={comment.key}
          data-comment-pending=""
          aria-busy="true"
          className="border-b border-border"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring.reveal}
        >
          <CommentEntry
            name={comment.name}
            body={comment.body}
            meta={
              <span className="inline-flex items-center gap-2 text-primary">
                <span aria-hidden="true" className="size-1.5 rounded-full bg-primary motion-safe:animate-pulse" />
                Posting…
              </span>
            }
          />
        </m.div>
      ))}

      <form action={hydrated ? submitWithPreview : formAction} className="relative mt-8">
        <input type="hidden" name="slug" value={slug} />
        <FieldGroup>
          <Field data-invalid={nameInvalid || undefined} className="sm:max-w-sm">
            <FieldLabel htmlFor={nameId}>Name</FieldLabel>
            <Input
              ref={nameRef}
              id={nameId}
              name="name"
              type="text"
              autoComplete="name"
              required
              maxLength={COMMENT_NAME_MAX_LENGTH}
              // Keep what they typed after an error (React resets the form to default values after each action).
              defaultValue={failed ? state.name : undefined}
              aria-invalid={nameInvalid || undefined}
              aria-describedby={nameInvalid ? messageId : undefined}
              className="h-9"
            />
          </Field>
          <Field data-invalid={bodyInvalid || undefined}>
            <FieldLabel htmlFor={bodyId}>Comment</FieldLabel>
            <Textarea
              ref={bodyRef}
              id={bodyId}
              name="body"
              required
              maxLength={COMMENT_BODY_MAX_LENGTH}
              defaultValue={failed ? state.body : undefined}
              aria-invalid={bodyInvalid || undefined}
              aria-describedby={bodyInvalid ? `${messageId} ${bodyHintId}` : bodyHintId}
              className="min-h-32"
            />
            <FieldDescription id={bodyHintId}>
              Plain text, up to {COMMENT_BODY_MAX_LENGTH.toLocaleString("en-US")} characters. Line breaks are kept; links
              and HTML show as typed. Your comment appears right away.
            </FieldDescription>
          </Field>

          {/* Honeypot: invisible and unreachable for people, tempting for form-filling bots. */}
          <div aria-hidden="true" className="absolute top-0 -left-[9999px] size-px overflow-hidden">
            <label htmlFor={websiteId}>Website</label>
            <input id={websiteId} name="website" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
          </div>

          <div className="flex flex-col items-start gap-4">
            <Button type="submit" size="lg" disabled={pending}>
              {pending ? <Spinner data-icon="inline-start" aria-hidden="true" role={undefined} /> : null}
              {pending ? "Posting" : "Post comment"}
            </Button>
            {/* Always in the DOM so assistive tech tracks it; empty when there's nothing to say. */}
            <div
              ref={messageRef}
              id={messageId}
              role="alert"
              tabIndex={-1}
              className={cn(
                "flex items-start gap-2 text-sm outline-none [overflow-wrap:anywhere]",
                succeeded ? "text-primary" : "text-destructive",
              )}
            >
              {message && succeeded ? (
                <m.span
                  aria-hidden="true"
                  className="mt-0.5 inline-flex"
                  initial={submitted ? { scale: 0.3, opacity: 0 } : false}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={spring.pop}
                >
                  <CheckIcon className="size-4" />
                </m.span>
              ) : null}
              {message}
            </div>
          </div>
        </FieldGroup>
      </form>
    </div>
  );
}
