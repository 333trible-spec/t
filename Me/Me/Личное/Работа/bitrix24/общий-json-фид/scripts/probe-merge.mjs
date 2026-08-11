import { buildMergedFeed } from '../lib/merge.js';

function housesOf(project) {
  return project.houses_without_stage || project.houses || [];
}

const feed = await buildMergedFeed();

let flats = 0;
for (const p of feed.projects) {
  const houses = housesOf(p);
  let n = 0;
  for (const h of houses) {
    for (const s of h.sections || []) {
      for (const f of s.floors || []) n += (f.flats || []).length;
    }
  }
  flats += n;
  console.log(
    `project ${p.id} «${p.title}» houses_without_stage=${houses.length} units=${n}`
  );
  console.log('keys', Object.keys(p).join(','));
}

console.log(
  JSON.stringify(
    {
      v: feed.v,
      projects: feed.projects.length,
      discounts: feed.discounts.length,
      decorations: feed.decorations.length,
      units: flats,
    },
    null,
    2
  )
);
