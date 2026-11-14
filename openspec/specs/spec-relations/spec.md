## Purpose

Defines how relationships between specs are derived from a repository's own content — which prose counts as one spec referring to another, and how often two specs change together — so that every surface that shows them agrees.

## Requirements

### Requirement: A spec references another when its prose names the other's topic
A spec SHALL be considered to reference another spec when its content contains the other spec's full topic path as a whole token. The relation SHALL be directed from the spec whose prose holds the name to the spec named. A spec SHALL NOT reference itself.

#### Scenario: A topic named in prose is a reference
- **WHEN** the content of `live-reload` contains the text `worktree-aggregation`
- **AND** both are specs of the repository
- **THEN** the relations include a reference from `live-reload` to `worktree-aggregation`

#### Scenario: A spec naming itself is not a reference
- **WHEN** the content of `search-ui` contains the text `search-ui`
- **THEN** no reference from `search-ui` to `search-ui` is derived

#### Scenario: A reference is directed
- **WHEN** `ui-package` names `core-module` and `core-module` never names `ui-package`
- **THEN** the relations hold a reference from `ui-package` to `core-module` and none in the other direction

### Requirement: A topic matches only at topic boundaries
A topic SHALL match only where it is not directly preceded or followed by a character that can be part of a name (letters, digits, `-`, `_`). A match inside a longer name SHALL NOT count. A path separator is not such a character, so a topic inside a link target such as `../spec-diff/spec.md` matches.

#### Scenario: A prefix of a longer topic does not match
- **WHEN** the specs include `search` and `search-semantics`, and the content of a third spec contains only `search-semantics`
- **THEN** a reference to `search-semantics` is derived
- **AND** no reference to `search` is derived

#### Scenario: Surrounding punctuation does not hide a topic
- **WHEN** content contains `` `spec-diff` ``, `(spec-diff)`, `spec-diff.` or `../spec-diff/spec.md`
- **THEN** each is a mention of `spec-diff`

### Requirement: Nested topics are matched by their full path
For a nested topic, only the full `/`-joined path SHALL match; its final segment alone SHALL NOT. Where a parent's path and a child's path begin at the same place, the longer SHALL win, so a parent is not matched inside its child's path.

#### Scenario: Only the full path of a nested topic matches
- **WHEN** the specs include `contracts/pagination/streaming-search` and content contains `streaming-search` without its parent path
- **THEN** no reference to `contracts/pagination/streaming-search` is derived

#### Scenario: A parent is not matched inside its child
- **WHEN** the specs include `contracts/pagination` and `contracts/pagination/streaming-search`, and content contains only the child's full path
- **THEN** a reference to the child is derived and none to the parent

### Requirement: Two specs change together when a change modifies both
Two specs SHALL be related as changed together when at least one change has a delta spec for each. The relation SHALL be undirected and SHALL carry a weight equal to the number of distinct changes that touch both. Active and archived changes SHALL both count, and a change SHALL count once per pair however many files its deltas contain.

#### Scenario: Weight counts shared changes
- **WHEN** three changes each modify both `change-browsing` and `openspec-scanner`
- **THEN** the relations hold one changed-together relation between them with weight 3

#### Scenario: A change touching a spec that is not in the list is ignored for that spec
- **WHEN** a change has a delta for a topic that is not among the supplied specs
- **THEN** that topic takes part in no relation

#### Scenario: A change touching one spec relates nothing
- **WHEN** a change modifies only one spec
- **THEN** it contributes to no changed-together relation

#### Scenario: A change touching three specs relates every pair
- **WHEN** one change modifies specs A, B and C
- **THEN** each of the pairs A–B, A–C and B–C gains weight 1

#### Scenario: The relation has no direction
- **WHEN** a changed-together relation between A and B is read
- **THEN** it is the same relation whichever of the two is named first

### Requirement: The relations are derived by one rule from content the hosts already serve
The derivation SHALL take only the spec topics and contents and the existing graph data (change-to-spec edges), and SHALL NOT read the filesystem, call the OpenSpec CLI, or need any data a host does not already provide. The same inputs SHALL produce the same relations on every surface, in a deterministic order independent of the input order.

#### Scenario: The static demo derives the same relations
- **WHEN** the relations are derived from the demo's embedded payload
- **THEN** they equal those derived from the same repository by the Web app

#### Scenario: Order of input does not change the result
- **WHEN** the same specs and edges are supplied in a different order
- **THEN** the derived relations are identical, in the same order

#### Scenario: A repository with no relationships
- **WHEN** no spec names another and no change touches more than one spec
- **THEN** the derivation returns no relations and does not fail

### Requirement: Aggregated change nodes do not duplicate a change
When the graph data comes from aggregated worktrees, a change SHALL count once however many worktrees hold a copy, and a node id's worktree namespace SHALL NOT make two copies of one slug count as two changes.

#### Scenario: One change in two worktrees counts once
- **WHEN** the aggregated graph holds one node for the change `add-foo`, which modifies specs A and B
- **THEN** the changed-together weight of A–B from `add-foo` is 1
