import { useEffect, useState } from 'react';
import { defaultSettings, getSettings, updateSettings } from '../storage/settings';

export function SettingsPanel() {
  const [settings, setSettings] = useState(defaultSettings);
  const [saved, setSaved] = useState(false);
  useEffect(() => { void getSettings().then(setSettings); }, []);
  const setAuto = async (autoGenerate: boolean) => { const next = await updateSettings({ autoGenerate }); setSettings(next); setSaved(true); };
  return <main className="settings-panel">
    <h1>AI Search Companion</h1>
    <p className="subtle">Third-party answers shown alongside Google Search. M0 is a local demo only.</p>
    <section><h2>Provider</h2><label>Selected provider<select value="mock" disabled><option>Demo streaming provider (M0)</option></select></label><p className="hint">No API keys are collected or used in this milestone. API-key providers are planned for M1.</p></section>
    <section><h2>Generation</h2><label className="switch"><input type="checkbox" checked={settings.autoGenerate} onChange={(event) => void setAuto(event.target.checked)} /> Generate automatically on Google searches</label><p className="hint">Off by default. When off, a page button must be clicked before any response is generated.</p></section>
    <section><h2>Privacy</h2><p className="hint">The demo does not send search queries anywhere. Future providers will show their billing mode and send only the search query to the provider you choose.</p></section>
    {saved && <p role="status" className="saved">Saved locally.</p>}
  </main>;
}

