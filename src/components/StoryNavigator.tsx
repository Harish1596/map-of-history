import type { Citation, EventRelation, Source } from "@/types/history";
import { SourceList } from "@/components/SourceList";

type StoryNavigatorProps = {
  relations: EventRelation[];
  onSelect: (eventId: string) => void;
  citations: Citation[];
  sources: Source[];
};

export function StoryNavigator({ relations, onSelect, citations, sources }: StoryNavigatorProps) {
  return (
    <nav className="story-nav" aria-label="Continue the story">
      <p className="eyebrow">What follows</p>
      {!relations.length && <p>End of this siege sequence. Explore earlier episodes on the timeline.</p>}
      {relations.map((relation) => (
        <div key={relation.id}>
          <a href={`?event=${encodeURIComponent(relation.toEventId)}`} onClick={(event) => {
            if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
            event.preventDefault();
            onSelect(relation.toEventId);
          }}>{relation.label} →</a>
          <p className="relation-description">{relation.type === "precedes" ? "Chronological link" : "Causal link"} · {relation.certainty} confidence</p>
          <details><summary>Why these events are connected</summary>
            <p>{relation.description}</p>
            <SourceList citations={citations.filter((citation) => relation.citationIds.includes(citation.id))} sources={sources} />
          </details>
        </div>
      ))}
    </nav>
  );
}
