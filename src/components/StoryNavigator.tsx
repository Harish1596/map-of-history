import type { EventRelation } from "@/types/history";

type StoryNavigatorProps = {
  relations: EventRelation[];
  onSelect: (eventId: string) => void;
};

export function StoryNavigator({ relations, onSelect }: StoryNavigatorProps) {
  return (
    <nav aria-label="Continue the story">
      {relations.map((relation) => (
        <button
          key={relation.id}
          type="button"
          onClick={() => onSelect(relation.toEventId)}
        >
          {relation.label}
        </button>
      ))}
    </nav>
  );
}
