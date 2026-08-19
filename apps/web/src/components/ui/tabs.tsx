"use client";

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

import styles from "./ui.module.css";

export type TabItem = {
  content: ReactNode;
  label: string;
  value: string;
};

type TabsProps = {
  ariaLabel: string;
  defaultValue?: string;
  items: TabItem[];
};

export function Tabs({ ariaLabel, defaultValue, items }: TabsProps) {
  const baseId = useId();
  const [selected, setSelected] = useState(defaultValue ?? items[0]?.value ?? "");
  const tabsRef = useRef<Array<HTMLButtonElement | null>>([]);

  function moveFocus(event: KeyboardEvent<HTMLButtonElement>, currentIndex: number) {
    let nextIndex: number | undefined;

    if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % items.length;
    if (event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + items.length) % items.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = items.length - 1;

    if (nextIndex === undefined) return;

    event.preventDefault();
    setSelected(items[nextIndex].value);
    tabsRef.current[nextIndex]?.focus();
  }

  return (
    <div className={styles.tabs}>
      <div aria-label={ariaLabel} className={styles.tabList} role="tablist">
        {items.map((item, index) => {
          const isSelected = item.value === selected;
          return (
            <button
              key={item.value}
              ref={(element) => {
                tabsRef.current[index] = element;
              }}
              aria-controls={`${baseId}-${item.value}-panel`}
              aria-selected={isSelected}
              className={styles.tab}
              id={`${baseId}-${item.value}-tab`}
              role="tab"
              tabIndex={isSelected ? 0 : -1}
              type="button"
              onClick={() => setSelected(item.value)}
              onKeyDown={(event) => moveFocus(event, index)}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      {items.map((item) => (
        <div
          key={item.value}
          aria-labelledby={`${baseId}-${item.value}-tab`}
          className={styles.tabPanel}
          hidden={item.value !== selected}
          id={`${baseId}-${item.value}-panel`}
          role="tabpanel"
          tabIndex={0}
        >
          {item.content}
        </div>
      ))}
    </div>
  );
}
