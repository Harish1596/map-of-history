"use client";

import { HISTORY_YEARS } from "@/data/country-history";
import changes from "../../public/data/world/history/changes.json";

type Props = {
  year: number | null;
  requestedYear: number | null;
  state: "idle" | "loading" | "error";
  disabled: boolean;
  physical: boolean;
  onSelect: (year: number | null) => void;
};

export function CountryTimeline({ year, requestedYear, state, disabled, physical, onSelect }: Props) {
  const events = changes.filter((event) => event.year === year);
  return (
    <section className="country-timeline" aria-label="Country timeline" aria-busy={state === "loading"}>
      <div className="country-timeline__heading">
        <p><strong>{year ?? "Present day"}</strong>{year !== null && <span>31 December</span>}</p>
        <button type="button" disabled={disabled} aria-pressed={year === null} onClick={() => onSelect(null)}>Present day</button>
      </div>
      <fieldset className="country-timeline__years" disabled={disabled}>
        <legend className="visually-hidden">Country map year, 2000 to 2006</legend>
        {HISTORY_YEARS.map((value) => (
          <label key={value}>
            <input type="radio" name="country-year" value={value} checked={(state === "loading" ? requestedYear : year) === value} onChange={() => onSelect(value)} />
            <span>{value}</span>
          </label>
        ))}
      </fieldset>
      <div className="country-timeline__status" role="status" aria-live="polite">
        {state === "loading" ? `Loading ${requestedYear ?? "present-day"} countries…` : state === "error" ? <><span>Couldn’t load {requestedYear}. View unchanged.</span><button type="button" onClick={() => onSelect(requestedYear)}>Retry year</button></> : physical ? "Year applies to Standard; physical layers are modern." : "Historical coverage · 2000–2006"}
      </div>
      <details className="country-timeline__notes" name="map-tools">
        <summary>Year notes &amp; sources</summary>
        <div>
          <h2>{year === null ? "Country timeline" : `${year} · year-end countries`}</h2>
          <p>Selected country changes for 2000–2006. Boundaries are generalized; several small border settlements are documented below but have no separate historical outlines.</p>
          {year === null ? <p>Choose a year to explore historical countries. Present day uses the existing Natural Earth reference map. Historical years after 2006 are not included in this first step.</p> : <>
            <ul>{events.map((event) => <li key={event.id}>
              <h3>{event.title}</h3>
              <p>{event.description}</p>
              <p className="country-timeline__coverage">{event.date} · {event.geometry === "encoded" ? "Shown on the map" : event.geometry === "source-baseline" ? "Included in the starting snapshot" : "Documented; boundary change not drawn"}</p>
              {event.sources.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.name}</a>)}
            </li>)}</ul>
            <p>Historical outlines: <a href="https://icr.ethz.ch/data/cshapes/" target="_blank" rel="noreferrer">CShapes 2.0 · Schvitz et al. (2022)</a>, adapted under <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/" target="_blank" rel="noreferrer">CC BY-NC-SA 4.0</a>. Small countries and territories missing from that source use modern Natural Earth reference outlines; their historical status is not fully reconstructed.</p>
            <p>East Timor is shown under UN administration before 2002. Source conventions differ from the present-day map. Physical surfaces, coastlines, marine names and island labels remain modern references.</p>
          </>}
          <a href="/data/world/history/metadata.json" target="_blank" rel="noreferrer">Preparation, corrections &amp; coverage</a>
        </div>
      </details>
    </section>
  );
}
