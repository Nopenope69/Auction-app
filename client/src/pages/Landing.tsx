import React, { useState } from 'react';
import { Gavel, Plus, Trash2, Copy, Check } from 'lucide-react';

// The organiser setup wizard - the PRD's "10-minute setup" requirement.
// Teams and rules are defined here instead of being hardcoded (the
// original prototype shipped with the ten real IPL franchise names/codes
// baked in as defaults, which is fine for a personal demo but is a
// trademark problem the moment this is sold to other clubs - teams are
// entirely organiser-defined now).

interface TeamRow {
  name: string;
  code: string;
  purse: number;
}

interface CreatedAuction {
  roomId: string;
  adminToken: string;
  teams: { id: string; name: string; code: string; token: string }[];
}

export const Landing: React.FC = () => {
  const [name, setName] = useState('');
  const [teams, setTeams] = useState<TeamRow[]>([
    { name: '', code: '', purse: 10000 },
    { name: '', code: '', purse: 10000 },
  ]);
  const [timerSeconds, setTimerSeconds] = useState(15);
  const [rtmEnabled, setRtmEnabled] = useState(false);
  const [playersCsv, setPlayersCsv] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedAuction | null>(null);

  const updateTeam = (idx: number, field: keyof TeamRow, value: string) => {
    setTeams((prev) =>
      prev.map((t, i) => (i === idx ? { ...t, [field]: field === 'purse' ? Number(value) || 0 : value } : t))
    );
  };

  const addTeam = () => setTeams((prev) => [...prev, { name: '', code: '', purse: 10000 }]);
  const removeTeam = (idx: number) => setTeams((prev) => prev.filter((_, i) => i !== idx));

  const canSubmit = name.trim().length > 0 && teams.filter((t) => t.name.trim()).length >= 2 && !submitting;

  const handleCreate = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/auctions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          teams: teams.filter((t) => t.name.trim()).map((t) => ({ name: t.name, code: t.code || t.name.slice(0, 3).toUpperCase(), purse: t.purse })),
          rules: { timerSeconds, rtmEnabled },
          playersCsv: playersCsv.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Something went wrong creating the auction.');
        return;
      }
      setCreated({ roomId: data.roomId, adminToken: data.adminToken, teams: data.teams });
    } catch (e: any) {
      setError(e.message || 'Network error.');
    } finally {
      setSubmitting(false);
    }
  };

  if (created) {
    const base = `${window.location.origin}${window.location.pathname}`;
    return (
      <div className="flex flex-col items-center min-h-screen p-8">
        <div className="max-w-2xl w-full">
          <h1 className="text-3xl text-neon font-bold mb-2">Auction created</h1>
          <p className="text-secondary mb-8">
            Save these links now - the admin link and team links won't be shown again. The spectator and broadcast links are safe to
            share publicly.
          </p>

          <div className="glass-panel mb-4">
            <h2 className="text-lg text-neon mb-3">Your admin link</h2>
            <LinkRow value={`${base}?room=${created.roomId}&token=${created.adminToken}&view=admin`} />
          </div>

          <div className="glass-panel mb-4">
            <h2 className="text-lg text-neon mb-3">Team join links</h2>
            <div className="flex flex-col gap-3">
              {created.teams.map((t) => (
                <div key={t.id}>
                  <div className="text-sm text-secondary mb-1">{t.name} ({t.code})</div>
                  <LinkRow value={`${base}?room=${created.roomId}&token=${t.token}&team=${t.id}&view=bidder`} />
                </div>
              ))}
            </div>
          </div>

          <div className="glass-panel mb-8">
            <h2 className="text-lg text-neon mb-3">Public links</h2>
            <div className="text-sm text-secondary mb-1">Spectator dashboard</div>
            <LinkRow value={`${base}?room=${created.roomId}&view=spectator`} />
            <div className="text-sm text-secondary mb-1 mt-3">Broadcast / OBS overlay</div>
            <LinkRow value={`${base}?room=${created.roomId}&view=broadcast`} />
          </div>

          <a
            className="btn btn-primary text-lg px-8 py-4 inline-block"
            href={`?room=${created.roomId}&token=${created.adminToken}&view=admin`}
          >
            Go to Admin Console
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center min-h-screen p-8">
      <div className="max-w-2xl w-full">
        <div className="flex items-center gap-3 mb-8">
          <Gavel size={36} className="text-accent-neon" />
          <h1 className="text-3xl text-neon font-bold">New Cricket Auction</h1>
        </div>

        <div className="glass-panel mb-4">
          <label className="block text-sm text-secondary mb-2">Auction / tournament name</label>
          <input className="w-full" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sunday League Season 4" />
        </div>

        <div className="glass-panel mb-4">
          <div className="flex justify-between items-center mb-3">
            <label className="text-sm text-secondary">Teams (at least 2)</label>
            <button className="btn text-xs" onClick={addTeam}><Plus size={14} /> Add team</button>
          </div>
          <div className="flex flex-col gap-2">
            {teams.map((t, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <input className="flex-1" placeholder="Team name" value={t.name} onChange={(e) => updateTeam(idx, 'name', e.target.value)} />
                <input className="w-20" placeholder="Code" maxLength={4} value={t.code} onChange={(e) => updateTeam(idx, 'code', e.target.value.toUpperCase())} />
                <input className="w-28" type="number" placeholder="Purse (L)" value={t.purse} onChange={(e) => updateTeam(idx, 'purse', e.target.value)} />
                {teams.length > 2 && (
                  <button className="btn text-xs" onClick={() => removeTeam(idx)}><Trash2 size={14} /></button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="glass-panel mb-4">
          <label className="block text-sm text-secondary mb-2">Rules</label>
          <div className="flex gap-6 items-center flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-sm">Bid timer</span>
              <input className="w-20" type="number" value={timerSeconds} onChange={(e) => setTimerSeconds(Number(e.target.value) || 15)} />
              <span className="text-sm text-secondary">seconds</span>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={rtmEnabled} onChange={(e) => setRtmEnabled(e.target.checked)} />
              Enable Right-to-Match (IPL-style retention)
            </label>
          </div>
        </div>

        <div className="glass-panel mb-6">
          <label className="block text-sm text-secondary mb-2">
            Players (optional - paste CSV now, or add later from the Admin Console)
          </label>
          <textarea
            className="w-full min-h-[100px]"
            placeholder={'name,role,basePrice,cricheroesUrl\nVirat Kohli,Batsman,200,https://cricheroes.com/player-profile/12345/virat-kohli/matches\nJasprit Bumrah,Bowler,200,'}
            value={playersCsv}
            onChange={(e) => setPlayersCsv(e.target.value)}
          />
          <p className="text-xs text-secondary mt-2">
            Columns: name (required), role (Batsman/Bowler/All-Rounder/Wicketkeeper), basePrice, cricheroesUrl (optional -
            link to the player's public CricHeroes profile; photo and stats sync automatically in the background,
            never during live bidding).
          </p>
        </div>

        {error && <div className="text-danger mb-4">{error}</div>}

        <button className="btn btn-primary text-lg px-8 py-4" disabled={!canSubmit} onClick={handleCreate}>
          {submitting ? 'Creating...' : 'Create Auction'}
        </button>
      </div>
    </div>
  );
};

const LinkRow: React.FC<{ value: string }> = ({ value }) => {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-2">
      <input readOnly value={value} className="flex-1 text-xs" onFocus={(e) => e.target.select()} />
      <button
        className="btn text-xs"
        onClick={() => {
          navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
      </button>
    </div>
  );
};
