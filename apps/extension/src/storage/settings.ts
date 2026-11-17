export type Settings = {
  autoGenerate: boolean;
  model: string;
};

export const defaultSettings: Settings = { autoGenerate: false, model: 'demo-stream-v1' };
const key = 'settings';

export async function getSettings(): Promise<Settings> {
  const stored = await chrome.storage.local.get(key);
  const candidate = stored[key] as Partial<Settings> | undefined;
  return { ...defaultSettings, ...candidate };
}

export async function updateSettings(change: Partial<Settings>): Promise<Settings> {
  const updated = { ...(await getSettings()), ...change };
  await chrome.storage.local.set({ [key]: updated });
  return updated;
}

