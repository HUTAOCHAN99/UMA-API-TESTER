"use client";
import { useState } from "react";
import type { SearchItem } from "@/lib/uma-types";
import { charaImg, splitCharaId, supportImg } from "@/lib/images";

export type Names = {
  chara: Record<string, string>;
  support: Record<string, { name: string; rarity: string; type: string }>;
};

function Img({ src, alt, className }: { src: string; alt: string; className: string }) {
  const [bad, setBad] = useState(false);
  if (bad) return <div className={`${className} noimg`}>tidak ada gambar</div>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className={className} loading="lazy" referrerPolicy="no-referrer" onError={() => setBad(true)} />;
}

function CharaTile({ label, id, names }: { label: string; id: unknown; names: Names }) {
  const ref = splitCharaId(id);
  return (
    <figure className="tile">
      {ref ? <Img src={charaImg(ref)} alt={`${label} ${ref.card}`} className="chara" /> : <div className="chara noimg">kosong</div>}
      <figcaption>
        <b>{label}</b>
        <span>{ref ? names.chara[ref.chara] ?? "—" : "—"}</span>
        <code>{String(id ?? "-")}</code>
      </figcaption>
    </figure>
  );
}

const SPARKS = [
  ["Blue", "blue_sparks", "#3b82f6"],
  ["Pink", "pink_sparks", "#ec4899"],
  ["Green", "green_sparks", "#22a559"],
  ["White", "white_sparks", "#8892a6"],
] as const;

function Stat({ k, v }: { k: string; v: unknown }) {
  if (v === undefined || v === null) return null;
  return <div className="stat"><span>{k}</span><b>{Array.isArray(v) ? (v.length ? v.join(", ") : "-") : String(v)}</b></div>;
}

export default function TrainerCard({ item, names }: { item: SearchItem; names: Names }) {
  const inh = item.inheritance;
  const sc = item.support_card;
  const sup = sc?.support_card_id != null ? names.support[String(sc.support_card_id)] : undefined;
  const updated = item.last_updated ? new Date(item.last_updated).toLocaleString("id-ID") : "-";

  return (
    <article className="card tcard">
      <header className="thead">
        <div>
          <h2>{item.trainer_name || "(tanpa nama)"}</h2>
          <code>{item.account_id}</code>
        </div>
        <div className="tmeta">
          <span>Follower <b>{item.follower_num ?? "-"}</b></span>
          <span>Dilihat <b>{item.borrow_view_count ?? 0}</b></span>
          <span>Dipinjam <b>{item.borrow_copy_count ?? 0}</b></span>
          <span>Update <b>{updated}</b></span>
        </div>
      </header>

      {inh && (
        <section>
          <h3>Inheritance</h3>
          <div className="tiles">
            <CharaTile label="Main parent" id={inh.main_parent_id} names={names} />
            <CharaTile label="Parent kiri" id={inh.parent_left_id} names={names} />
            <CharaTile label="Parent kanan" id={inh.parent_right_id} names={names} />
          </div>
          <div className="stats">
            <Stat k="Parent rank" v={inh.parent_rank} />
            <Stat k="Parent rarity" v={inh.parent_rarity} />
            <Stat k="Win count" v={inh.win_count} />
            <Stat k="White count" v={inh.white_count} />
            <Stat k="Main blue factors" v={inh.main_blue_factors} />
            <Stat k="Main pink factors" v={inh.main_pink_factors} />
            <Stat k="Main green factors" v={inh.main_green_factors} />
            <Stat k="Main white count" v={inh.main_white_count} />
            <Stat k="Affinity score" v={inh.affinity_score} />
            <Stat k="Inheritance ID" v={inh.inheritance_id} />
          </div>
          {inh.main_white_factors && inh.main_white_factors.length > 0 && (
            <Stat k="Main white factors" v={inh.main_white_factors} />
          )}
          <div className="sparks">
            {SPARKS.map(([label, key, color]) => {
              const list = inh[key] ?? [];
              return (
                <div key={key} className="sparkrow">
                  <span className="sparklabel" style={{ background: color }}>{label}</span>
                  {list.length ? list.map((n, i) => <code key={i} className="chip">{n}</code>) : <em className="empty">-</em>}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {sc && (
        <section>
          <h3>Support card</h3>
          <div className="supp">
            {sc.support_card_id != null && <Img src={supportImg(sc.support_card_id)} alt={`Support ${sc.support_card_id}`} className="support" />}
            <div className="stats one">
              <Stat k="Support card ID" v={sc.support_card_id} />
              {sup && <Stat k="Nama" v={`${sup.name} (${sup.rarity}, ${sup.type})`} />}
              <Stat k="Limit break" v={sc.limit_break_count} />
              <Stat k="Experience" v={sc.experience} />
            </div>
          </div>
        </section>
      )}

      {!inh && !sc && <p className="empty">Tidak ada data inheritance atau support card pada hasil ini.</p>}

      <details>
        <summary>JSON mentah</summary>
        <pre>{JSON.stringify(item, null, 2)}</pre>
      </details>
    </article>
  );
}
