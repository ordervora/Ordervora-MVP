"use client";

import { useState } from "react";
import { Check, RotateCw, Sparkles } from "lucide-react";
import { Button, Card } from "@/components/ui";

interface Concept {
  id: string;
  name: string;
  description: string;
  colorSeed: string;
}

const CONCEPTS: Concept[] = [
  { id: "modern-minimal", name: "Modern Minimal", description: "Clean lines, generous whitespace, and a calm neutral palette that lets your menu photography lead.", colorSeed: "#171512" },
  { id: "warm-craft", name: "Warm Craft", description: "Cream and bronze tones with hand-crafted typography — built for a business that feels personal.", colorSeed: "#B97824" },
  { id: "bold-contemporary", name: "Bold Contemporary", description: "High-contrast layouts and confident type for a brand that wants to stand out immediately.", colorSeed: "#2A5C4B" },
];

function PhonePreview({ colorSeed }: { colorSeed: string }) {
  return (
    <div className="mx-auto flex h-56 w-32 flex-col overflow-hidden rounded-[24px] border-[6px] border-[#171512] bg-white shadow-[0_12px_30px_rgba(48,39,27,0.18)]">
      <div className="h-6 w-full shrink-0" style={{ backgroundColor: colorSeed }} />
      <div className="flex-1 space-y-2 p-2.5">
        <div className="h-14 w-full animate-pulse rounded-lg bg-[#F0E9DD]" />
        <div className="h-2 w-3/4 animate-pulse rounded-full bg-[#F0E9DD]" />
        <div className="h-2 w-1/2 animate-pulse rounded-full bg-[#F0E9DD]" />
        <div className="mt-3 grid grid-cols-2 gap-1.5">
          <div className="h-10 animate-pulse rounded-lg bg-[#F0E9DD]" />
          <div className="h-10 animate-pulse rounded-lg bg-[#F0E9DD]" />
        </div>
      </div>
    </div>
  );
}

export function AiBrandConcepts() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#9A6A2F]">AI BRAND CONCEPTS</p>
          <h2 className="mt-1 text-lg font-bold text-[#171512]">Choose a direction for your site</h2>
        </div>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F7EBDD] text-[#A9681F]">
          <Sparkles className="h-[18px] w-[18px]" aria-hidden="true" />
        </span>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        {CONCEPTS.map((concept) => {
          const selected = selectedId === concept.id;
          return (
            <div
              key={concept.id}
              className={`flex flex-col gap-4 rounded-2xl border p-4 transition ${
                selected ? "border-[#171512] bg-[#FBF7F1] shadow-[0_12px_30px_rgba(48,39,27,0.08)]" : "border-[#E7DDCF] bg-white"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#9A6A2F]">AI Brand Concept</p>
                {selected && (
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#171512] text-white">
                    <Check className="h-3 w-3" aria-hidden="true" />
                  </span>
                )}
              </div>

              <PhonePreview colorSeed={concept.colorSeed} />

              <div>
                <h3 className="font-bold text-[#171512]">{concept.name}</h3>
                <p className="mt-1 text-xs leading-5 text-[#756B5D]">{concept.description}</p>
              </div>

              <div className="mt-auto flex flex-col gap-2">
                <Button variant="secondary" size="sm" className="w-full">Preview</Button>
                <Button
                  variant={selected ? "primary" : "secondary"}
                  size="sm"
                  className="w-full"
                  onClick={() => setSelectedId(concept.id)}
                >
                  {selected ? "Selected" : "Select"}
                </Button>
                <button
                  type="button"
                  className="flex min-h-9 w-full items-center justify-center gap-1.5 rounded-full text-xs font-bold text-[#756B5D] transition active:scale-[0.99]"
                >
                  <RotateCw className="h-3.5 w-3.5" aria-hidden="true" />
                  Regenerate
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
