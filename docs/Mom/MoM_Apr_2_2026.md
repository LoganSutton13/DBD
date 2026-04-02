# Meeting Minutes - April 2, 2026

### Meeting Information
- **Date**: April 2, 2026
- **Time**: 8:00 am - 8:38 am
- **Location**: Zoom
- **Meeting Type**: Weekly project sync
- **Facilitator**: Andrew Nelson
- **Note-taker**: Logan Sutton

### Attendees
- Logan Sutton
- Andrew Nelson
- Gil Rezin
- Dattatray Bhalekar

### Absentees
- Collin Rovey (not present on call)

### Agenda Items

#### 1. Demo Readiness and Field Validation Approach
**Discussion**:
- Team discussed realistic near-term demo goals for capstone and the Pharmobotics competition, including autonomous driving and variable-rate spraying with water if needed.
- Andrew emphasized preference for real field validation at his shop, first proving variable-rate water application and then progressing toward practical foliar-feed use cases.
- Dattatray proposed using water-sensitive paper cards as a fast visual validation method across low/high zones, with optional lightweight analysis.

**Outcome**:
- Team aligned on prioritizing a practical, reliable field demonstration over waiting for a perfect final-state setup.
- Water-sensitive paper testing is accepted as a practical validation step for spray coverage and rate differences.

#### 2. UI/Workflow Demo and Prescription Pipeline Updates
**Discussion**:
- Logan presented a revamped three-step UI flow: create field, upload boundary + drone imagery, then generate path/prescription outputs.
- Current implementation supports chunked uploads, run status tracking, and result overlays, but includes known gaps (e.g., missing mismatch error messaging when boundary and stitched imagery do not align).
- Team reviewed prescription controls and identified a missing capability to set spray amounts per field/zone.

**Outcome**:
- UI direction and end-to-end workflow were validated by the group.
- Per-field spray-rate controls were confirmed as required and prioritized.
- Better user-facing error messaging for boundary/stitch mismatch was identified as a needed improvement.

#### 3. Application Rate Configuration and Chemical Volume Estimation
**Discussion**:
- Team agreed application rates should be configurable in **gallons per acre (GPA)**, with awareness that hardware limits vary by sprayer/nozzle system.
- Gil reviewed existing cluster-based NDVI logic and how rates are currently auto-assigned.
- Dattatray and Andrew emphasized calculating total tank-mix volume in advance so growers know how much chemical to mix before spraying.

**Outcome**:
- Team agreed to expose configurable spray rates per zone/field in GPA.
- Team agreed to add pre-run chemical volume calculations based on zone acres and selected rates.

#### 4. Start Point, Resume Behavior, and Robot Control Scope
**Discussion**:
- Discussion covered whether the software should handle navigation from shop/base to field and resume points after refills.
- Andrew clarified operationally the robot is expected to be transported to the field, so route-to-field planning is lower priority.
- Start-point support remains useful, but deeper resume behavior depends on Amiga/robot control software and is not fully in Logan/Gil scope.

**Outcome**:
- Team deprioritized full "navigate to field" functionality for now.
- Start-point configurability remains a desired feature and should be added when feasible.
- Resume/return logic remains tied to robot platform behavior and external control constraints.

#### 5. RTK Reliability and Dev Tooling/Privacy Notes
**Discussion**:
- Team shared updates on RTK/GPS correction reliability and cost; Andrew reported strong performance with a new dongle-based correction approach and lower recurring cost.
- Group briefly discussed AI coding tooling trade-offs, including token usage, vendor bias, and privacy/security concerns in agent-like tools.

**Outcome**:
- RTK update is positive and supports near-term confidence in field testing.
- Team will remain cautious about AI tooling choices, especially around privacy/security and cost.

### Action Items
| Task | Owner | Due Date | Status |
|------|-------|----------|--------|
| Add per-field/per-zone spray amount configuration in UI (GPA) | Logan | Before next meeting | In progress |
| Add clear error handling/message when boundary and stitched imagery do not align | Logan | Before next meeting | In progress |
| Add chemical volume calculation output (tank-mix estimate) from zone rates and acres | Logan | Before next meeting | Planned |
| Validate water-sensitive paper test setup and provide cards/method guidance | Dattatray, Andrew | Before next field test | Planned |
| Investigate/implement configurable path start point where feasible | Logan | Backlog / next iteration | Planned |

### Decisions Made
1. **Prioritize a practical field-capable demo path**: Autonomous operation plus variable-rate behavior is acceptable as the near-term milestone.
2. **Use GPA-based configurable rates per field/zone**: Fixed presets alone are not sufficient for grower workflows.
3. **Include pre-run tank-mix volume estimates**: Knowing required chemical volume ahead of time is mandatory for practical use.
4. **Deprioritize route-to-field automation**: Transport-to-field is the assumed operation model for now.

### Key Discussion Points
- Strong progress on the front-end workflow for field creation, imagery upload, path generation, and prescription visualization.
- Importance of actionable agronomic outputs (rate controls + total volume estimates), not just map generation.
- Operational constraints from hardware/platform boundaries (Amiga control behavior) and real farm logistics.
- Positive momentum on RTK correction reliability and lower-cost correction options.

### Issues/Risks Identified
- **Workflow robustness**: Boundary/stitch mismatch handling still needs clear user feedback.
- **Hardware variability**: Different sprayer systems have different lower/upper usable rate limits.
- **Platform integration scope**: Some desired behaviors (resume/return control) depend on robot-side software outside core app logic.
- **Security/cost risk in tooling**: AI-assisted development tools can introduce privacy exposure and unpredictable usage cost.

### Next Steps
- Logan to implement GPA configuration controls and mismatch error messaging in the UI.
- Logan to add chemical volume calculations to prescription outputs.
- Team to prepare water-sensitive paper validation workflow for next suitable test window.
- Continue coordination on RTK readiness and practical field test execution.

### Next Meeting
- **Date**: Next week (TBD)
- **Time**: 8:00 am
- **Location**: Zoom
- **Agenda Preview**: Review UI/rate-control updates, tank-mix calculations, and readiness for next robot/field test.

### Additional Notes
- Meeting included implementation-level UX and agronomy workflow details to keep the product aligned with real operator needs.

---
*Meeting minutes prepared by: Logan Sutton*  
*Date prepared: April 2, 2026*  
*Distribution: Logan Sutton, Andrew Nelson, Gil Rezin, Dattatray Bhalekar, Collin Rovey*

