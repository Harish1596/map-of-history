import type { Citation, Source } from "@/types/history";

type SourceListProps = {
  citations: Citation[];
  sources: Source[];
};

export function SourceList({ citations, sources }: SourceListProps) {
  const sourceById = new Map(sources.map((source) => [source.id, source]));

  return (
    <ol className="source-list">
      {citations.map((citation) => {
        const source = sourceById.get(citation.sourceId);
        return (
          <li key={citation.id}>
            {source?.url ? <a href={source.url} target="_blank" rel="noreferrer">{source.title} ↗</a> : source?.title ?? "Unknown source"}
            <span>{source?.author}</span>
            <span>{source?.sourceType} · {source?.publication}</span>
            {citation.locator && <span>{citation.locator}</span>}
            {citation.note && <span>{citation.note}</span>}
          </li>
        );
      })}
    </ol>
  );
}
