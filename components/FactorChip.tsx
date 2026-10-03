import { decodeFactor } from "@/lib/stadium";
import type { Names } from "@/components/TrainerCard";

const COLOR = { blue: "#3b82f6", pink: "#ec4899", green: "#22a559", white: "#8892a6" } as const;

export default function FactorChip({ id, names }: { id: number; names: Names }) {
  const f = decodeFactor(id);
  const label = f.kind === "green" ? names.card[String(f.base)]?.name ?? `#${f.base}` : f.label;
  return (
    <span className="fchip" style={{ borderColor: COLOR[f.kind] }} title={`ID ${id}`}>
      <i style={{ background: COLOR[f.kind] }} />{label} {f.stars}★
    </span>
  );
}
