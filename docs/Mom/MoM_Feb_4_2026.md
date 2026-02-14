# Meeting Minutes - February 4, 2026

## Meeting Information
- **Date**: February 4, 2026
- **Time**: 8 am
- **Location**: Zoom
- **Meeting Type**: 
- **Facilitator**: 
- **Note-taker**: Logan Sutton

## Attendees
- Logan Sutton
- Gil Rezin
- Andrew Nelson

## Absentees

## Agenda Items

### 1. Prescription Module Rework
**Discussion**: 
- Gil reworked prescription module R script
- Main issue: overall gradient would produce a singular large cluster or no cluster at all
- Each cell rounded up to increment of 0.2 currently
- Pix4D uses bucketed approach: put each cell into a bucket based on NDVI range, then smooths everything
- Hardware cannot handle too many vertices
- Possibility of using a vertex counter to make sure we are below the limit

**Outcome**: 

### 2. Path Module Integration
**Discussion**: 
- Logan integrated the Path module into repo
- Created unit tests to ensure refactor was smooth
- Next steps: API endpoints and frontend utility
- Need to make sure farmer can see path and whether it will work for them, then go back and adjust heading

**Outcome**: 

### 3. Engineering Team Work
**Discussion**: 
- Engineering team is working on the [topic - notes incomplete]

**Outcome**: 

## Action Items
| Task | Owner | Due Date | Status |
|------|-------|----------|---------|
| Path API endpoints | Logan | | |
| Path frontend utility | Logan | | |
| Vertex counter for limit | | | |
| Farmer path visibility and heading adjustment | | | |

## Decisions Made

## Key Discussion Points
- Prescription module gradient and clustering issues
- Pix4D bucketed approach for NDVI
- Hardware vertex limit constraints
- Path module integration and unit tests
- API and frontend next steps

## Issues/Risks Identified

## Next Steps

## Next Meeting

## Additional Notes

---
*Meeting minutes prepared by: Logan Sutton*
