# Task 6 Review Lessons Learned

## Why This Exists

Task 6's first implementation checkpoint passed package verification but failed a serious review pass. This note records what went wrong so we can look for the same patterns elsewhere in the repo.

The point is not to preserve reviewer comments verbatim. The point is to capture the failure modes that allowed misleading product content to ship behind green tests.

## What Went Wrong

### 1. We treated green package checks as proof of product correctness

The dashboard package passed:

- `bun run --filter @fiction-map/dashboard test`
- `bun run --filter @fiction-map/dashboard typecheck`
- `bun run --filter @fiction-map/dashboard build`

That was necessary, but not sufficient. The failing review showed the implementation could still be misleading while all local gates were green.

Lesson:

- package verification proves the code compiles, runs, and satisfies the tests we wrote
- it does not prove the tests cover the right product truths

## 2. We let implementation-status text drift inside the feature that was actively changing it

The first Task 6 slice shipped context-pack strings that still said context-pack generation was not implemented and existed only in planning docs. That was already false in the same commit.

Lesson:

- any feature that generates milestone-state copy must treat that copy as executable product logic, not as harmless prose
- milestone-state text needs the same review rigor as API behavior

## 3. We collapsed "metadata unavailable" into "zero counts"

The pack layer used zero values when metadata was absent. That made the copied context imply a real empty project state instead of an unavailable snapshot.

Lesson:

- absence and zero are different states
- if a system has an "unknown" or "not loaded" state, the view-model must preserve it explicitly instead of normalizing it away

## 4. We implemented the curated source registry without checking it back against the approved design source sets

The registry was directionally correct but incomplete. Several canonical files from the approved source-set rules were missing, so the packs could not actually point to the full intended architecture boundary.

Lesson:

- when a design doc defines an explicit source set, implementation should reconcile against it mechanically before review
- "close enough" source registries drift fast because they still look plausible

## 5. We tested the pure layer and the component in isolation, but not the product seam

We had:

- pure generation tests
- component copy-action tests

What we did not have was an App-level test for the exact state the product promised to handle honestly:

- metadata unavailable
- refresh error present
- packs rendered from real app state

Lesson:

- for UI work, the highest-risk bugs often live at the seam between derived state and visible rendering
- isolated unit tests are not enough when the main risk is truthfulness of the rendered product state

## Pattern To Watch Elsewhere

The repeated mistake pattern is:

1. approved plan exists
2. implementation follows the shape of the plan
3. tests cover happy-path mechanics
4. stateful product copy and boundary conditions drift anyway

This is the same family of failure as:

- stale milestone wording in docs
- UI claiming a capability is implemented when only scaffolding exists
- empty-state handling that silently substitutes zeros or defaults for unknown state
- curated inputs that look representative but omit canonical references

## Preventive Checks For Future Work

Before calling a slice "ready", explicitly check:

1. Does any user-visible generated text describe implementation status?
If yes, review it like logic, not like copy.

2. Does the view-model distinguish:
- unavailable
- empty
- failed
- loaded

If not, it is likely flattening states that should stay distinct.

3. Does the implementation reproduce the exact curated source list or contract from the design doc?
If not, reconcile that before review.

4. Is there at least one test at the product seam?
For dashboard work, that usually means App-level or panel-level rendering from realistic state, not only pure-function or leaf-component tests.

5. Are we claiming "green" based on build/typecheck/unit tests alone?
If yes, stop and ask what truth those tests are not asserting.

## Immediate Follow-Up For Task 6

The correction pass should:

- fix stale implementation-status copy
- preserve "metadata unavailable" as its own state in pack generation
- align curated source sets with the approved design doc
- add App-level honesty tests for unavailable metadata and refresh-error states
- rerun review after the fixes instead of treating the first green run as sufficient
