/**
 * Плоский Venus v:1 `{ v, data[] }` → проекты в схеме v:2
 * (projects → houses → sections → floors → flats).
 */

const FLAT_META = new Set([
  'project',
  'project_id',
  'house',
  'house_id',
  'section',
  'section_id',
  'floor',
  'floor_id',
]);

function toFlatUnit(item) {
  const flat = {};
  for (const [key, value] of Object.entries(item)) {
    if (FLAT_META.has(key)) continue;
    if (key === 'deadline') continue;
    flat[key] = value;
  }
  return flat;
}

function ensureProject(map, item) {
  const id = item.project_id;
  if (!map.has(id)) {
    map.set(id, {
      id,
      title: item.project ?? String(id),
      stages: [],
      houses: [],
      _houses: new Map(),
    });
  }
  return map.get(id);
}

function ensureHouse(project, item) {
  const id = item.house_id;
  if (!project._houses.has(id)) {
    const house = {
      id,
      title: item.house ?? String(id),
      deadline: item.deadline ?? null,
      building_state: '',
      lat: '',
      lng: '',
      address: '',
      sections: [],
      _sections: new Map(),
    };
    project._houses.set(id, house);
    project.houses.push(house);
  }
  return project._houses.get(id);
}

function ensureSection(house, item) {
  const id = item.section_id;
  if (!house._sections.has(id)) {
    const titleRaw = item.section;
    const numberShort =
      titleRaw === null || titleRaw === undefined || titleRaw === ''
        ? id
        : Number.isNaN(Number(titleRaw))
          ? titleRaw
          : Number(titleRaw);
    const section = {
      id,
      title: numberShort,
      number_short: numberShort,
      floors: [],
      _floors: new Map(),
    };
    house._sections.set(id, section);
    house.sections.push(section);
  }
  return house._sections.get(id);
}

function ensureFloor(section, item) {
  const id = item.floor_id;
  if (!section._floors.has(id)) {
    const floor = {
      id,
      number: item.floor != null ? String(item.floor) : String(id),
      flats: [],
    };
    section._floors.set(id, floor);
    section.floors.push(floor);
  }
  return section._floors.get(id);
}

function stripInternals(projects) {
  return projects.map((project) => {
    const { _houses, ...rest } = project;
    return {
      ...rest,
      houses: project.houses.map((house) => {
        const { _sections, ...h } = house;
        return {
          ...h,
          sections: house.sections.map((section) => {
            const { _floors, ...s } = section;
            return s;
          }),
        };
      }),
    };
  });
}

/** @param {{ v?: number, data?: object[] }} feed */
export function v1ToV2Projects(feed) {
  const data = Array.isArray(feed?.data) ? feed.data : [];
  const projectsMap = new Map();

  for (const item of data) {
    if (!item || item.project_id == null || item.house_id == null) continue;
    if (item.section_id == null || item.floor_id == null) continue;

    const project = ensureProject(projectsMap, item);
    const house = ensureHouse(project, item);
    if (item.deadline != null && (house.deadline == null || house.deadline === '')) {
      house.deadline = item.deadline;
    }
    const section = ensureSection(house, item);
    const floor = ensureFloor(section, item);
    floor.flats.push(toFlatUnit(item));
  }

  return stripInternals([...projectsMap.values()]);
}
