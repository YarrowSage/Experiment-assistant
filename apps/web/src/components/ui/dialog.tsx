"use client";

import { X } from "lucide-react";
import {
  useEffect,
  useId,
  useRef,
  type MouseEvent,
  type ReactNode,
} from "react";

import { classNames } from "@/lib/class-names";

import styles from "./ui.module.css";

export type DialogProps = {
  children: ReactNode;
  description?: string;
  footer?: ReactNode;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  presentation?: "modal" | "drawer" | "bottom-sheet";
  title: string;
};

export function Dialog({
  children,
  description,
  footer,
  onOpenChange,
  open,
  presentation = "modal",
  title,
}: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const priorFocusRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      priorFocusRef.current = document.activeElement as HTMLElement | null;
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
      priorFocusRef.current?.focus();
    }
  }, [open]);

  function handleBackdropClick(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) onOpenChange(false);
  }

  const isDrawer = presentation === "drawer";
  const isBottomSheet = presentation === "bottom-sheet";

  return (
    <dialog
      ref={dialogRef}
      aria-describedby={description ? descriptionId : undefined}
      aria-labelledby={titleId}
      className={styles.dialog}
      onCancel={(event) => {
        event.preventDefault();
        onOpenChange(false);
      }}
      onClose={() => {
        if (open) onOpenChange(false);
        priorFocusRef.current?.focus();
      }}
    >
      <div
        className={classNames(
          styles.dialogPositioner,
          isDrawer && styles.drawerPositioner,
          isBottomSheet && styles.bottomSheetPositioner,
        )}
        onMouseDown={handleBackdropClick}
      >
        <section
          className={classNames(
            styles.dialogSurface,
            isDrawer && styles.drawerSurface,
            isBottomSheet && styles.bottomSheetSurface,
          )}
        >
          <header className={styles.dialogHeader}>
            <div>
              <h2 className={styles.dialogTitle} id={titleId}>
                {title}
              </h2>
              {description ? (
                <p className={styles.dialogDescription} id={descriptionId}>
                  {description}
                </p>
              ) : null}
            </div>
            <button
              aria-label="Close dialog"
              className={styles.dialogClose}
              type="button"
              onClick={() => onOpenChange(false)}
            >
              <X aria-hidden="true" size={20} />
            </button>
          </header>
          <div className={styles.dialogBody}>{children}</div>
          {footer ? <footer className={styles.dialogFooter}>{footer}</footer> : null}
        </section>
      </div>
    </dialog>
  );
}
