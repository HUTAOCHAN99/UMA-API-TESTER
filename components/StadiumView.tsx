"use client";
import Img from "@/components/Img";
import FactorChip from "@/components/FactorChip";
import type { Names } from "@/components/TrainerCard";
import { charaImg, splitCharaId, supportImg } from "@/lib/images";
import { DISTANCE, STYLE, apt, splitSupport, type StadiumMember } from "@/lib/stadium";

function Member({ m, names }: { m: StadiumMember; names: Names }) {
  const ref = splitCharaId(m.card_id);
  const card = names.card[String(m.card_id)];
  const stats: [string, number][] = [["Spd", m.speed], ["Sta", m.stamina], ["Pow", m.power], ["Gut", m.guts], ["Wit", m.wiz]];
  const apts: [string, number][] = [
    ["Turf", m.proper_ground_turf], ["Dirt", m.proper_ground_dirt],
    ["Sprint", m.proper_distance_short], ["Mile", m.proper_distance_mile],
    ["Medium", m.proper_distance_middle], ["Long", m.proper_distance_long],
    ["Front", m.proper_running_style_nige], ["Pace", m.proper_running_style_senko],
    ["Late", m.proper_running_style_sashi], ["End", m.proper_running_style_oikomi],
  ];
  return (
    <div className="member">
      {ref && <Img src={charaImg(ref)} alt={`Card ${m.card_id}`} className="chara" />}
      <div className="mname">
        <b>{card?.name ?? `Card ${m.card_id}`}</b>
        {card?.title && <span>{card.title}</span>}
        <code>card {m.card_id} · {m.rarity}★ · rank score {m.rank_score}</code>
      </div>
      <div className="mbadge">{STYLE[m.running_style] ?? `Style ${m.running_style}`}</div>
      <div className="mstats">{stats.map(([k, v]) => <span key={k}>{k} <b>{v}</b></span>)}</div>
      <div className="apts">{apts.map(([k, v]) => <span key={k} className={v >= 7 ? "hi" : ""}>{k} <b>{apt(v)}</b></span>)}</div>
      <div className="sparks">{m.factors.map((f, i) => <FactorChip key={i} id={f} names={names} />)}</div>
      <div className="sups">
        {m.support_cards.map((raw, i) => {
          const s = splitSupport(raw);
          return (
            <figure key={i} title={names.support[s.id]?.name ?? `Support ${s.id}`}>
              <Img src={supportImg(s.id)} alt={`Support ${s.id}`} className="supthumb" />
              <figcaption>{s.lb != null ? `LB${s.lb}` : s.id}</figcaption>
            </figure>
          );
        })}
      </div>
      <details>
        <summary>Skill ({m.skills.length})</summary>
        <code style={{ wordBreak: "break-word" }}>{m.skills.join(", ")}</code>
      </details>
    </div>
  );
}

export default function StadiumView({ members, names }: { members: StadiumMember[]; names: Names }) {
  if (!members.length) return <p className="empty">Trainer ini tidak punya data Team Stadium.</p>;
  const groups = [...new Set(members.map((m) => m.distance_type))].sort((a, b) => a - b);
  return (
    <div>
      {groups.map((d) => (
        <section key={d}>
          <h3>{DISTANCE[d] ?? `Tipe ${d}`}</h3>
          <div className="tiles">
            {members.filter((m) => m.distance_type === d).sort((a, b) => a.member_id - b.member_id)
              .map((m) => <Member key={m.id} m={m} names={names} />)}
          </div>
        </section>
      ))}
    </div>
  );
}
