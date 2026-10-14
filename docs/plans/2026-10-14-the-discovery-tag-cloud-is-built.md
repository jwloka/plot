# The Discovery tag cloud is built from stories and tickets and filters both

> The Discovery tag cloud takes its topics from story content and ticket titles, each topic names the stories and tickets it matches, and selecting one narrows the story lanes and the ticket lanes together.

## Status

- **State:** Draft
- **Type:** feature
- **Issue:** #1690
- **Review:** pr
- **Impl:** own branches

## Changelog

- The Discovery tag cloud draws its topics from story titles, story file text, plan titles and ticket titles. A subject that only a ticket carries can become a topic.
- Selecting a topic narrows the story lanes (Draft, Active, Done) and the ticket lanes (Open, In progress, Done) together. Clearing the topic shows both in full.
- A lane with no row under a selection says that the topic hides its rows.

Board impact: changes `packages/board` only. No change to the plan format, the template, the helper scripts, `plot-host.sh`, or the issue index and its schema.

## Motivation

`extractTopics` (`packages/board/src/server/topics.ts`, called at `packages/board/src/server/board.ts:2466`) reads story slugs, story titles and plan titles. Each topic maps to story slugs. In `StoriesTab.tsx`, `topicToSlugs` filters the story lanes only. The ticket lanes ignore the selection, and no ticket text contributes a topic. A reader who selects a topic sees the matching stories beside every ticket, and a subject that exists only in tickets never appears in the cloud.

## Design

### Approach

One pure domain function computes the topic set and the matches. The server calls it and sends the result. `.tsx` renders it and decides nothing (*Every rendered state is a domain property*).

- **Input.** Stories (title, story file text, plan titles) and tickets (title). Ticket content is what the issue index already holds. The ticket body is not in the index and stays out.
- **Output.** Each topic carries `storySlugs` and `ticketKeys`. The cloud stays bounded by `maxTopics` and keeps the domain-term filtering `extractTopics` applies today (stop words, noise terms, topics present in every row).
- **Selection.** A pure function takes a topic and the lane groups and returns the rows each lane keeps, plus per lane whether the topic hid rows. The component renders that result. The empty-lane message *the topic hides its rows* follows from this flag.
- **Count.** A topic's `count` sums the stories and tickets it matches. The chip title names both numbers.
- **Constraints.** No change to `plot-host.sh`, the index or its schema, and no restart.

### Open Questions

- [ ] Where does the story file text come from? `extractTopics` receives `StoryDocument` with a title and plan titles only. Does the board already read the story file body, or does the slice add that read?
- [ ] How does ticket text weigh against story text in `count`, and does a topic present in every story but only some tickets still qualify? The "all rows" rule has to name its denominator.
- [ ] Does a ticket title yield compound terms and bigrams the way a plan title does, or single words only?

## Slices

### Topics

- `feature/the-topics-name-their-tickets` — a pure domain function builds topics from stories and tickets, each naming its stories and tickets, and `board.ts` sends it <!-- builds: extractTopics over stories and tickets, topics naming ticketKeys -->

### Lanes

- `feature/the-lanes-filter-by-topic` — a pure function narrows story and ticket lanes by the selected topic, `StoriesTab.tsx` renders it with the empty-lane message, and a browser test selects a topic matching a ticket and a story and sees both lanes narrow <!-- builds: lanesForTopic, a pure lane filter --> <!-- waits: feature/the-topics-name-their-tickets -->

## Notes

- Created from tracker issue #1690. Nothing was written to the tracker.
