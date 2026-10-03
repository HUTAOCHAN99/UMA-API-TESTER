import { decodeFactor } from "@/lib/stadium";
import { skillByWhiteBase, uniqueSkillId } from "@/lib/skills";
import SkillIcon from "@/components/SkillIcon";
import type { Names } from "@/components/TrainerCard";

const COLOR = { blue: "#3b82f6", pink: "#ec4899", green: "#22a559", white: "#8892a6" } as const;

export default function FactorChip({ id, names }: { id: number; names: Names }) {
  const f = decodeFactor(id);
  let label = f.label;
  let icon: string | null = null;
  if (f.kind === "green") {
    // green = unique skill karakter (base = card_id)
    const uid = uniqueSkillId(f.base);
    const sk = uid ? names.skill.byId[uid] : undefined;
    label = sk?.name ?? names.card[String(f.base)]?.name ?? `#${f.base}`;
    icon = sk?.icon ?? null;
  } else if (f.kind === "white") {
    const sk = skillByWhiteBase(names.skill, f.base);
    label = sk?.name ?? f.label;
    icon = sk?.icon ?? null;
  }
  return (
    <span className="fchip" style={{ borderColor: COLOR[f.kind] }} title={`ID ${id}`}>
      <i style={{ background: COLOR[f.kind] }} />
      <SkillIcon icon={icon} size={16} />{label} {f.stars}★
    </span>
  );
}
