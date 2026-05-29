const FIT_RANK: Record<string, number> = { strong: 0, moderate: 1, skip: 2 };
export const LEADERSHIP_ENRICH_CAP = 8;

function entityNameKey(name: string): string {
  return name.trim().toLowerCase();
}

export function selectEntitiesForLeadership(
  entities: Array<Record<string, unknown>>,
  cap = LEADERSHIP_ENRICH_CAP,
): Array<Record<string, unknown>> {
  return [...entities]
    .sort((a, b) => {
      const tierA = FIT_RANK[String(a.fitTier)] ?? 1;
      const tierB = FIT_RANK[String(b.fitTier)] ?? 1;
      if (tierA !== tierB) return tierA - tierB;
      return String(a.name).localeCompare(String(b.name));
    })
    .slice(0, cap);
}

export function mergeLeadershipOntoStructure(
  structure: Record<string, unknown>,
  peopleRaw: Record<string, unknown>,
): Record<string, unknown> {
  const structureEntities = Array.isArray(structure.entities)
    ? structure.entities as Array<Record<string, unknown>>
    : [];

  const peopleEntities = Array.isArray(peopleRaw.entities)
    ? peopleRaw.entities as Array<Record<string, unknown>>
    : [];

  const peopleByName = new Map<string, Record<string, unknown>>();
  for (const pe of peopleEntities) {
    const name = typeof pe.name === "string" ? pe.name.trim() : "";
    if (name) peopleByName.set(entityNameKey(name), pe);
  }

  const mergedEntities = structureEntities.map(entity => {
    const key = entityNameKey(String(entity.name ?? ""));
    const people = peopleByName.get(key);
    if (!people) return entity;

    const extraSources = Array.isArray(people.sources)
      ? people.sources.filter((s): s is string => typeof s === "string")
      : [];
    const existingSources = Array.isArray(entity.sources)
      ? entity.sources.filter((s): s is string => typeof s === "string")
      : [];

    return {
      ...entity,
      buyers: people.buyers ?? entity.buyers ?? [],
      ...(typeof people.leadershipNote === "string" && people.leadershipNote.trim()
        ? { leadershipNote: people.leadershipNote }
        : {}),
      sources: [...new Set([...existingSources, ...extraSources])],
    };
  });

  return {
    ...structure,
    entities: mergedEntities,
  };
}
