"use client";

import { useSyncExternalStore } from "react";
const subscribe = () => () => {};
// Hydrate using the server's UTC text, then display the browser's own timezone.
export function LocalTime({ value }: { value: string }) {
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  const text = hydrated
    ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "medium" }).format(new Date(value))
    : value.replace("T", " ").replace(/\.\d+Z$/, " UTC");
  return <time dateTime={value} title={`${value} · exibido no fuso do navegador`}>{text}</time>;
}
