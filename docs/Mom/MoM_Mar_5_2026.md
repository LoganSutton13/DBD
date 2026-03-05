# Meeting Minutes - March 5, 2026

## Meeting Information
- **Date**: March 5, 2026
- **Time**: 8 am
- **Location**: Zoom
- **Meeting Type**:
- **Facilitator**:
- **Note-taker**: Logan Sutton

## Attendees
- Logan Sutton
- Gil Rezin
- Andrew Nelson
- Collin Rovey

## Absentees

## Agenda Items

### 1. Prescription Module – Command-Line & Polygon Output
**Discussion**:
- Gil set up prescription module to be callable from the command line (no need to go into R)
- Parameters (orthophotos, boundary, etc.) can be called from command line with default values; example run ~3 min for a field
- Output is now polygons so you can see which group/cluster each area belongs to
- As the robot moves across the field it checks which polygon it is in and applies the corresponding spray level
- Integration: once input/output locations are specified, integration should be clean; then API to ship to frontend so farmer can view and adjust spray
- Variable sprayer status: still in progress—Collin talking with Raven and John Deere dealers; brackets etc. are made, will go on as soon as hardware is decided

**Outcome**:
- Prescription module ready for integration path (storage → API → frontend). Variable sprayer timeline depends on dealers.

### 2. Path Module & Shapefile / Parking Lot Test
**Discussion**:
- Logan’s path module works with Collin’s shapefile; Collin to provide a format Logan can use
- Parking lot has a hole in the middle (drain / concrete lights); Collin may create a shapefile with a hole as a test case—one shapefile is sufficient
- Path output is currently lat/long; Logan has a converter to relative coordinates; Amiga uses northing/easting relative to its base station
- Collin will get the track from the robot when he runs it (after calibrating with satellites at IKEA); they can use that to get base station reference and convert (subtract from known position)
- Linear velocity for path will likely be a constant
- **Saturday test**: pathing test in the parking lot, Saturday 9 AM; Gil free all day; Collin will get tractors out of the way; meet at parking lot by soccer field / marching band practice
- Rain: not a problem for equipment; Collin may cover touchscreen if wet; SSH is an option if needed
- WiFi: Collin will hotspot (WSU network conflicts with Tailscale/SSH); Logan to have everything downloaded; may be at edge of lot away from building WiFi

**Outcome**:
- Saturday 9 AM parking lot test confirmed. Collin to provide path format today; Collin to capture track from robot; Logan to handle conversions and linear velocity.

### 3. File Transfer to Robot (Paths / Output)
**Discussion**:
- Robot uses Tailscale/Tailnet; app could SSH into robot and dump output file onto robot for drive pathing
- USB is also an option—onboard file manager looks at USBs
- Collin will test dump-to-robot as soon as he has a unit

**Outcome**:
- Both SSH (Tailscale) and USB are viable for getting path/output files onto the robot.

### 4. Drone Maps & Andrew Updates
**Discussion**:
- Andrew sent drone maps (folder link); larger fields, smallest ~70 acres; can use half the images if a smaller area is needed (stitching still works)
- Download: use wired connection—files are very large (gigs)
- Andrew double-booked and left early; will try to expose his NTRIP base station via public IP so robot can connect directly instead of through NTRIP service (robot currently not connecting to Andrew’s End Trip; on a different NTRIP with 100.x IP)
- Similar RTK connection issues had occurred with Raven/Patriot sprayer; DJI is more permissive than some equipment

**Outcome**:
- Team can pull drone maps via wired connection. Andrew to look into exposing base station via public IP for robot RTK.

### 5. Frontend / Dev Environment
**Discussion**:
- Gil couldn’t get the frontend running; will keep trying
- Logan recalled a possible fix related to a WSL setting (UNC paths)

**Outcome**:
- Gil to retry frontend; check WSL/UNC path setting if needed.

## Action Items
| Task | Owner | Due Date | Status |
|------|-------|----------|--------|
| Provide path format for Logan to use | Collin | Today | |
| Get track from robot when calibrating (IKEA) | Collin | Before/around Saturday | |
| Try exposing NTRIP/base station via public IP for robot | Andrew | | |
| Get frontend running (try WSL/UNC path setting) | Gil | Before Saturday | |
| Have prescription ready for Saturday | Gil | Saturday | |
| Have all needed files downloaded for Saturday; handle conversions, linear velocity | Logan | Saturday | |

## Decisions Made
1. **Parking lot path test**: Saturday 9 AM at parking lot (by soccer field / marching band).
2. **Path input**: One shapefile is sufficient; shapefile with hole in middle is a valid test case.
3. **Prescription integration**: Proceed with specified input/output, then API to frontend for farmer to view and adjust spray.
4. **Robot file transfer**: Support both Tailscale/SSH and USB for putting path/output files on robot.

## Key Discussion Points
- Prescription module: CLI, polygon output, cluster-based spray levels; variable sprayer still with dealers
- Path module: shapefile with optional hole; lat/long → relative coords via base station/track from robot
- Saturday 9 AM parking lot test; WiFi via hotspot; rain OK
- Robot RTK: Andrew to try public IP for base station; Tailscale and USB for file transfer
- Drone maps available; wired download recommended

## Issues/Risks Identified
- **Robot not connecting to Andrew’s End Trip**: Using alternate NTRIP; Andrew to try public IP workaround.
- **WSU network vs. Tailscale**: Can’t SSH over Tailscale on WSU network; use hotspot at parking lot test.

## Next Steps
- Collin: provide path format; get track from robot; prep for Saturday
- Gil: get frontend running; prescription ready for Saturday
- Logan: prep files and conversions for Saturday test
- Andrew: explore base station exposure via public IP

## Next Meeting
- **Date**: [Next meeting date]
- **Time**: [Next meeting time]
- **Location**: [Next meeting location]
- **Agenda Preview**: Follow-up from Saturday parking lot path test; prescription integration; frontend.

## Additional Notes
- Andrew left early due to double-booking; offered to help with NTRIP/base station access.
- Collin heading to IKEA after meeting to calibrate robot with satellites.

---
*Meeting minutes prepared by: Logan Sutton*
*Date prepared: March 5, 2026*
*Distribution: Logan Sutton, Gil Rezin, Andrew Nelson, Collin Rovey*
