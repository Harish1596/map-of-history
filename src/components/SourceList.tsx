import type { Citation, Source } from "@/types/history";

type SourceListProps = {
  citations: Citation[];
  sources: Source[];
};

export function SourceList({ citations, sources }: SourceListProps) {
  const sourceById = new Map(sources.map((source) => [source.id, source]));

  return (
    <ol>
      {citations.map((citation) => {
        const source = sourceById.get(citation.sourceId);
        return (
          <li key={citation.id}>
            {source?.title ?? "Unknown source"}
            {citation.locator ? `, ${citation.locator}` : ""}
          </li>
        );
      })}
    </ol>
  );
}
