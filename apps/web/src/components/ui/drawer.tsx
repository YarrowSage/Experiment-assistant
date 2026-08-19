"use client";

import type { ReactNode } from "react";

import { Dialog } from "./dialog";

type DrawerProps = {
  children: ReactNode;
  description?: string;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  position?: "side" | "bottom";
  title: string;
};

export function Drawer({
  children,
  description,
  onOpenChange,
  open,
  position = "side",
  title,
}: DrawerProps) {
  return (
    <Dialog
      description={description}
      open={open}
      presentation={position === "side" ? "drawer" : "bottom-sheet"}
      title={title}
      onOpenChange={onOpenChange}
    >
      {children}
    </Dialog>
  );
}
