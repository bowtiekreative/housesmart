/**
 * Bundled sample posts — used only when WordPress is unreachable or empty,
 * so local dev and first deploys render a working site.
 */
import type { JtbdPost } from './wp';

export const SAMPLE_POSTS: JtbdPost[] = [
  {
    id: 'sample-1',
    slug: 'stop-rim-joist-air-leaks-before-drywall',
    title: 'Stop Rim Joist Air Leaks Before the Drywall Crew Shows Up',
    date: '2026-08-01T08:00:00',
    meta_title: 'Rim Joist Air Sealing: The 2-Hour Fix That Saves 15% on Heating | HomeSmart.ca',
    meta_description:
      'Rim joists leak more air than most windows. Here is the two-hour spray foam and caulk sequence we use before insulation inspection, with the exact materials list.',
    content_markdown: `Rim joists leak more conditioned air than every window in the house combined. We measured it with a blower door on three builds last winter: 30 to 40 percent of total leakage traced back to that one band of framing.

The fix takes two hours per floor if you do it before insulation inspection. After drywall, it becomes a crawl-around nightmare that nobody prices honestly.

## What we actually do

Cut 2-inch XPS foam blocks a half inch smaller than each joist bay. Press them against the rim, then seal the perimeter of every block with one-component spray foam. The foam is the air seal; the board is just backing that keeps you from burning a full can per bay.

Skip the fiberglass batts alone. Air moves straight through them, and in a cold climate the warm interior air hits the cold rim and condenses. We have pulled out ten-year-old batts black with mold in Barrie and Ottawa basements.

## Watch for

- Keep foam a quarter inch back from any B-vent or flue penetration. Use fire-rated caulk there instead.
- Bays with plumbing or wiring penetrations: seal the penetration first, then the block.
- If the house has a HRV, tell the mechanical contractor the leakage rate changed. They may need to rebalance.`,
    pre_conditions: [
      'Framing complete, before insulation inspection',
      'Rim joist bays accessible (no mechanical runs blocking)',
      'Interior temperature above 5°C for foam cure',
    ],
    post_conditions: [
      'Continuous air barrier at rim assembly',
      'Blower door leakage reduced 25–40% at the band',
      'Ready for insulation inspection sign-off',
    ],
    tools_resources: ['2" XPS or polyiso board', 'One-component gun foam', 'Fire-rated caulk', 'Utility knife and straightedge', 'Blower door (verification, optional)'],
    action: 'Air-seal',
    object: 'Rim joist bays',
    outcome: 'Measurably tighter envelope before drywall closes access',
    morphological_node: {
      interrogative: 'How',
      relational: 'Direct',
      scale: 'All',
      solution_concept: 'Cut-and-cobble foam board with sprayed perimeter seal across every accessible bay',
    },
    solution_status: 'Existing',
    source_name: 'HomeSmart field notes',
  },
  {
    id: 'sample-2',
    slug: 'schedule-concrete-pours-around-heat-waves',
    title: 'Scheduling Concrete Pours Around Heat Waves Without Losing the Week',
    date: '2026-07-28T08:00:00',
    meta_title: 'Hot Weather Concrete: Pour Scheduling That Beats 30°C Days | HomeSmart.ca',
    meta_description:
      'Above 27°C, concrete sets fast enough to wreck a finish. Here is how we re-sequence pours, order ice, and keep the crew productive when the forecast turns.',
    content_markdown: `Above 27°C, a standard mix can hit initial set before your finishers get across a 40-square slab. You either pour smarter or you grind out cold joints.

We re-sequence the week instead of fighting the thermometer.

## The playbook

First call is the batch plant, not the crew. Ask for chilled water or ice substitution and a retarder dosed for the forecast high. Most plants in southern Ontario carry both from June through September; they just don't add them unless you ask.

Move pours to a 6 a.m. start. The slab you pour at dawn cures through the cool part of the day. The one you pour at 11 has its hottest hydration hours in peak sun.

If the forecast shows three days over 30, flip the schedule: put framing, backfill, or interior work in the heat window and stack the pours on the shoulder days. A lost pour day only costs you if the crew stands idle.

## Numbers that matter

- Concrete temperature at placement: keep it under 27°C, full stop.
- Evaporation rate over 1 kg/m²/h means fog sprayers or an evaporation retarder on the surface.
- Every 10°C rise cuts set time roughly in half. Plan finisher coverage accordingly.`,
    pre_conditions: [
      'Forecast high above 27°C during pour window',
      'Batch plant confirmed for ice/chilled water and retarder',
      'Finishing crew available for early start',
    ],
    post_conditions: [
      'Placement temperature under 27°C',
      'No cold joints or crazing on finished surface',
      'Week schedule intact with re-sequenced trades',
    ],
    tools_resources: ['Concrete thermometer', 'Evaporation retarder', 'Fog sprayer', 'Set-retarding admixture', 'Hourly weather forecast'],
    action: 'Re-sequence',
    object: 'Pour schedule',
    outcome: 'Spec-quality slabs poured through a heat wave without idle crew days',
    morphological_node: {
      interrogative: 'When',
      relational: 'Inverse',
      scale: 'Partial',
      solution_concept: 'Invert the trade schedule so pours land in cool windows and heat-tolerant work fills the hot ones',
    },
    solution_status: 'Existing',
    source_name: 'HomeSmart field notes',
  },
  {
    id: 'sample-3',
    slug: 'prefab-wall-panels-small-builder-math',
    title: 'Prefab Wall Panels: The Real Math for a Small Builder',
    date: '2026-07-21T08:00:00',
    meta_title: 'Are Prefab Wall Panels Worth It for Small Builders? Real Cost Breakdown | HomeSmart.ca',
    meta_description:
      'Panelized walls cost 8-12% more on paper. We ran the numbers across three builds and the cycle-time savings flipped the math. Full breakdown inside.',
    content_markdown: `Panelized walls quote 8 to 12 percent above stick-frame material-and-labour on every estimate we have seen. Small builders look at that line and walk away. We almost did.

Then we tracked cycle time across three comparable builds — two stick-framed, one panelized — and the panel job closed in nine fewer days.

## Where the nine days come from

Framing a 2,200 sq ft two-storey took our four-man crew eleven working days, weather included. Panels went up in three, with a crane day at $1,800. Roof trusses landed on day four instead of day twelve.

Nine days of site overhead — supervision, temporary power, fencing, financing carry — ran about $650 a day on that build. That is $5,850 against a $4,100 panel premium. The math flipped before we counted the earlier drywall start.

## Where it goes wrong

Panels punish sloppy foundations. Our tolerance was plus or minus 6 mm on the sill plate; the panel plant assumes you hit it. Survey the foundation before you release panels for fabrication, not after they show up on a truck.

Change orders after release are brutal. A moved window that costs an hour in stick framing is a re-fabricated panel with a two-week lead. Lock the openings before the plant cuts.`,
    pre_conditions: [
      'Foundation within ±6 mm level tolerance',
      'Window/door openings locked before fabrication release',
      'Crane access confirmed on site plan',
    ],
    post_conditions: [
      'Structure weather-tight 8–10 days earlier',
      'Site overhead savings exceed panel premium',
      'Drywall and mechanical start pulled forward',
    ],
    tools_resources: ['Panel plant with 3-week lead time', 'Mobile crane (1 day)', 'Laser level for sill survey', 'Cycle-time tracking sheet'],
    action: 'Substitute',
    object: 'Stick framing with panelized walls',
    outcome: 'Faster dry-in that beats the sticker premium on total build cost',
    morphological_node: {
      interrogative: 'Why',
      relational: 'Cross',
      scale: 'Many',
      solution_concept: 'Cross factory fabrication with site-overhead accounting to justify the unit-price premium',
    },
    solution_status: 'Existing',
    source_name: 'HomeSmart field notes',
  },
];
