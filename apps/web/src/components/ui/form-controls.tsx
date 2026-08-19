import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from "react";

import { classNames } from "@/lib/class-names";

import styles from "./ui.module.css";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ "aria-invalid": ariaInvalid, className, ...props }, ref) {
    return (
      <input
        ref={ref}
        aria-invalid={ariaInvalid}
        className={classNames(styles.input, ariaInvalid === true && styles.inputError, className)}
        {...props}
      />
    );
  },
);

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ "aria-invalid": ariaInvalid, className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      aria-invalid={ariaInvalid}
      className={classNames(styles.textarea, ariaInvalid === true && styles.textareaError, className)}
      {...props}
    />
  );
});

type FieldProps = {
  children: (controlProps: {
    id: string;
    "aria-describedby"?: string;
    "aria-invalid"?: true;
  }) => ReactNode;
  error?: string;
  hint?: string;
  label: string;
  required?: boolean;
};

export function Field({ children, error, hint, label, required }: FieldProps) {
  const id = useId();
  const descriptionId = error || hint ? `${id}-description` : undefined;

  return (
    <div className={styles.field}>
      <label className={styles.fieldLabel} htmlFor={id}>
        {label}
        {required ? " *" : null}
      </label>
      {children({
        id,
        "aria-describedby": descriptionId,
        ...(error ? { "aria-invalid": true as const } : {}),
      })}
      {error ? (
        <p className={styles.fieldError} id={descriptionId} role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className={styles.fieldHint} id={descriptionId}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}
