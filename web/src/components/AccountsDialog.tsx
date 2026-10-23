'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useSync } from '@/hooks/useSync';
import { db } from '@/lib/db';
import { addAccounts, useSettings } from '@/lib/settings';
import { removeAccountData } from '@/lib/sync';

export const INVALID_HINT =
  'Use a Steam64 ID, Steam32 ID, or a steamcommunity.com/profiles/… / opendota.com/players/… link. Vanity URLs (/id/name) are not supported.';

export function AccountsDialog({ open, onOpenChange }: { open: boolean; onOpenChange(open: boolean): void }) {
  const { settings, update } = useSettings();
  const { syncAll } = useSync();
  const [text, setText] = useState('');
  const [invalid, setInvalid] = useState<string[]>([]);

  function onAdd() {
    const r = addAccounts(settings, text.split('\n'));
    setInvalid(r.invalid);
    setText(r.invalid.join('\n'));
    if (r.added.length) {
      update(r.settings);
      void syncAll(false);
    }
  }

  async function onRemove(id: string) {
    update({
      ...settings,
      accounts: settings.accounts.filter((a) => a !== id),
      selected: settings.selected.filter((a) => a !== id),
    });
    await removeAccountData(db, id);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => onOpenChange(o)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Manage accounts</DialogTitle>
          <DialogDescription>One Steam ID or profile link per line.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <label htmlFor="account-input" className="text-sm font-medium">
            Account IDs or links
          </label>
          <Textarea
            id="account-input"
            rows={4}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={'76561198000000000\nhttps://www.opendota.com/players/39734272'}
          />
          <Button onClick={onAdd} className="self-end">
            Add
          </Button>
          {invalid.length ? (
            <div className="text-sm text-destructive">
              {invalid.map((l) => (
                <p key={l}>Could not read: {l}</p>
              ))}
              <p className="mt-1 text-xs text-muted-foreground">{INVALID_HINT}</p>
            </div>
          ) : null}
        </div>
        <ul className="flex max-h-60 flex-col gap-1 overflow-y-auto">
          {settings.accounts.map((id) => (
            <li key={id} className="flex items-center justify-between rounded border px-3 py-1.5 text-sm">
              <span className="font-mono">{id}</span>
              <Button variant="ghost" size="sm" aria-label={`Remove ${id}`} onClick={() => void onRemove(id)}>
                Remove
              </Button>
            </li>
          ))}
        </ul>
        <div className="flex flex-col gap-2">
          <label htmlFor="api-key" className="text-sm font-medium">
            OpenDota API key (optional)
          </label>
          <Input
            id="api-key"
            type="password"
            autoComplete="off"
            value={settings.apiKey}
            onChange={(e) => update({ ...settings, apiKey: e.target.value })}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
