import { SOURCES } from './sources.js';
import { v1ToV2Projects } from './v1-to-v2.js';

/** Единый проект в общем фиде (по требованию приёмки). */
export const UNIFIED_PROJECT = Object.freeze({
  id: 13,
  title: 'ЖК Зеленые Аллеи',
});

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`Feed ${url} → HTTP ${res.status}`);
  }
  return res.json();
}

function projectHouses(project) {
  if (Array.isArray(project?.houses_without_stage)) return project.houses_without_stage;
  if (Array.isArray(project?.houses)) return project.houses;
  return [];
}

function collectDecorations(houses, fromRoot = []) {
  const byId = new Map();
  for (const d of fromRoot || []) {
    if (d?.id != null) byId.set(d.id, d);
  }
  for (const house of houses) {
    for (const section of house.sections || []) {
      for (const floor of section.floors || []) {
        for (const flat of floor.flats || []) {
          if (flat.decoration_id == null) continue;
          if (byId.has(flat.decoration_id)) continue;
          byId.set(flat.decoration_id, {
            id: flat.decoration_id,
            title: flat.decoration_name ?? String(flat.decoration_id),
            primary: 0,
            images: [],
          });
        }
      }
    }
  }
  return [...byId.values()];
}

/**
 * Собирает общий фид v:2:
 * один project (id 13, «ЖК Зеленые Аллеи»),
 * houses_without_stage: квартиры → кладовые → коммерция.
 */
export async function buildMergedFeed() {
  const loaded = await Promise.all(
    SOURCES.map(async (src) => ({ src, json: await fetchJson(src.url) }))
  );

  const housesWithoutStage = [];
  let discounts = [];
  let decorations = [];

  for (const { src, json } of loaded) {
    let chunkProjects = [];

    if (src.format === 'v2') {
      if (!Array.isArray(json.projects)) {
        throw new Error(`Источник ${src.id}: нет projects[]`);
      }
      chunkProjects = json.projects;
      if (Array.isArray(json.discounts)) discounts = json.discounts;
      if (Array.isArray(json.decorations)) decorations = json.decorations;
    } else {
      chunkProjects = v1ToV2Projects(json);
    }

    for (const project of chunkProjects) {
      housesWithoutStage.push(...projectHouses(project));
    }
  }

  const projects = [
    {
      id: UNIFIED_PROJECT.id,
      title: UNIFIED_PROJECT.title,
      stages: [],
      houses_without_stage: housesWithoutStage,
    },
  ];

  return {
    v: 2,
    projects,
    discounts,
    decorations: collectDecorations(housesWithoutStage, decorations),
  };
}
