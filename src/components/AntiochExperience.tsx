"use client";

import { EventPanel } from "@/components/EventPanel";
import { HistoricalMap } from "@/components/HistoricalMap";
import { Timeline } from "@/components/Timeline";

export function AntiochExperience() {
  return (
    <main className="experience">
      <header className="masthead">
        <div>
          <span className="eyebrow">First Crusade · Proof of concept</span>
          <h1>The Siege of Antioch</h1>
        </div>
        <span>1097–1098</span>
      </header>
      <HistoricalMap />
      <EventPanel />
      <Timeline />
    </main>
  );
}
