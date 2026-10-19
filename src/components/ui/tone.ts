import type { Stage } from "@/lib/types"

/**
 * Color sets shared by chips, filter chips and step icons. Each tone sets three CSS variables:
 * --tone-mark (dot, border), --tone-subtle (background) and --tone-strong (text), so a
 * component styles itself once with bg-(--tone-subtle) etc. and works for every tone.
 * Class strings are written out in full so Tailwind can find them.
 */
export const tones = {
  applied: "[--tone-mark:var(--stage-applied)] [--tone-subtle:var(--stage-applied-subtle)] [--tone-strong:var(--stage-applied-strong)]",
  viewed: "[--tone-mark:var(--stage-viewed)] [--tone-subtle:var(--stage-viewed-subtle)] [--tone-strong:var(--stage-viewed-strong)]",
  assessment: "[--tone-mark:var(--stage-assessment)] [--tone-subtle:var(--stage-assessment-subtle)] [--tone-strong:var(--stage-assessment-strong)]",
  interview: "[--tone-mark:var(--stage-interview)] [--tone-subtle:var(--stage-interview-subtle)] [--tone-strong:var(--stage-interview-strong)]",
  offer: "[--tone-mark:var(--stage-offer)] [--tone-subtle:var(--stage-offer-subtle)] [--tone-strong:var(--stage-offer-strong)]",
  rejected: "[--tone-mark:var(--stage-rejected)] [--tone-subtle:var(--stage-rejected-subtle)] [--tone-strong:var(--stage-rejected-strong)]",
  success: "[--tone-mark:var(--success)] [--tone-subtle:var(--success-subtle)] [--tone-strong:var(--success-strong)]",
  warning: "[--tone-mark:var(--warning)] [--tone-subtle:var(--warning-subtle)] [--tone-strong:var(--warning-strong)]",
  danger: "[--tone-mark:var(--danger)] [--tone-subtle:var(--danger-subtle)] [--tone-strong:var(--danger-strong)]",
  info: "[--tone-mark:var(--info)] [--tone-subtle:var(--info-subtle)] [--tone-strong:var(--info-strong)]",
  neutral: "[--tone-mark:var(--fg-subtle)] [--tone-subtle:var(--surface-muted)] [--tone-strong:var(--fg-muted)]",
} as const

export type Tone = keyof typeof tones

export const STAGE_LABELS: Record<Stage, string> = {
  applied: "Applied",
  viewed: "Viewed",
  assessment: "Assessment",
  interview: "Interview",
  offer: "Offer",
  rejected: "Rejected",
}
