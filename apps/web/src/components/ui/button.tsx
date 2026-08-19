import { forwardRef, type ButtonHTMLAttributes } from "react";

import { classNames } from "@/lib/class-names";

import styles from "./ui.module.css";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "small" | "medium" | "large" | "icon";
};

const variantClasses = {
  primary: styles.buttonPrimary,
  secondary: styles.buttonSecondary,
  ghost: styles.buttonGhost,
  danger: styles.buttonDanger,
};

const sizeClasses = {
  small: styles.buttonSmall,
  medium: styles.buttonMedium,
  large: styles.buttonLarge,
  icon: styles.buttonIcon,
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, type = "button", variant = "primary", size = "medium", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={classNames(styles.button, variantClasses[variant], sizeClasses[size], className)}
      {...props}
    />
  );
});
