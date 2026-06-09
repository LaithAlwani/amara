"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { SpinnerGap } from "@phosphor-icons/react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const fieldClass =
  "w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

type Content = {
  heroEyebrow: string;
  heroTitle: string;
  heroSubtitle: string;
  heroCtaLabel: string;
  heroCtaHref: string;
  ctaTitle: string;
  ctaBody: string;
  accentHex: string;
  primaryHex: string;
  backgroundHex: string;
  foregroundHex: string;
};

export function AdminContent() {
  const content = useQuery(api.content.getSiteContent);
  if (content === undefined) {
    return (
      <div className="flex justify-center py-20 text-muted-foreground">
        <SpinnerGap className="size-6 animate-spin" />
      </div>
    );
  }
  return <Editor initial={content} />;
}

function Editor({ initial }: { initial: Content }) {
  const save = useMutation(api.content.updateSiteContent);
  const [f, setF] = useState<Content>(initial);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof Content, v: string) =>
    setF((prev) => ({ ...prev, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await save(f);
      toast.success("Homepage updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-heading text-2xl font-semibold tracking-tight">
        Homepage content
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Edit the storefront hero, closing call-to-action, and brand accent — no
        redeploy needed.
      </p>

      <form onSubmit={submit} className="mt-8 space-y-5">
        <Section title="Hero">
          <FieldRow label="Eyebrow">
            <Input value={f.heroEyebrow} onChange={(e) => set("heroEyebrow", e.target.value)} />
          </FieldRow>
          <FieldRow label="Title">
            <Input value={f.heroTitle} required onChange={(e) => set("heroTitle", e.target.value)} />
          </FieldRow>
          <FieldRow label="Subtitle">
            <textarea
              value={f.heroSubtitle}
              rows={3}
              className={fieldClass}
              onChange={(e) => set("heroSubtitle", e.target.value)}
            />
          </FieldRow>
          <div className="grid gap-4 sm:grid-cols-2">
            <FieldRow label="CTA label">
              <Input value={f.heroCtaLabel} onChange={(e) => set("heroCtaLabel", e.target.value)} />
            </FieldRow>
            <FieldRow label="CTA link">
              <Input value={f.heroCtaHref} onChange={(e) => set("heroCtaHref", e.target.value)} />
            </FieldRow>
          </div>
        </Section>

        <Section title="Closing call-to-action">
          <FieldRow label="Title">
            <Input value={f.ctaTitle} onChange={(e) => set("ctaTitle", e.target.value)} />
          </FieldRow>
          <FieldRow label="Body">
            <textarea
              value={f.ctaBody}
              rows={2}
              className={fieldClass}
              onChange={(e) => set("ctaBody", e.target.value)}
            />
          </FieldRow>
        </Section>

        <Section title="Brand colours">
          <div className="grid gap-4 sm:grid-cols-2">
            <ColorField
              label="Accent (clay)"
              value={f.accentHex}
              onChange={(v) => set("accentHex", v)}
            />
            <ColorField
              label="Primary (green)"
              value={f.primaryHex}
              onChange={(v) => set("primaryHex", v)}
            />
            <ColorField
              label="Background"
              value={f.backgroundHex}
              onChange={(v) => set("backgroundHex", v)}
            />
            <ColorField
              label="Text"
              value={f.foregroundHex}
              onChange={(v) => set("foregroundHex", v)}
            />
          </div>
        </Section>

        <Button type="submit" disabled={busy}>
          {busy ? <SpinnerGap className="size-4 animate-spin" /> : "Save changes"}
        </Button>
      </form>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-5">
      <p className="text-sm font-medium">{title}</p>
      {children}
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <FieldRow label={label}>
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-12 cursor-pointer rounded border border-input bg-transparent"
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-32"
        />
      </div>
    </FieldRow>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
