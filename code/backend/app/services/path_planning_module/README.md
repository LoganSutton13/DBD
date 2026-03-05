# Amiga Brain Track Plot example

URL: https://amiga.farm-ng.com/docs/examples/track_planner/

## Populating `tangentOfBInA` so the robot can drive

Each waypoint in `track.json` has a **`tangentOfBInA`** (velocity of frame B in frame A) with:

- **`linearVelocity`** – `{ "x", "y", "z" }` in **meters per second**, in the **robot (body) frame**:  
  - **x** = forward, **y** = left, **z** = up.  
  For straight driving use a constant forward speed, e.g. `{ "x": 0.5, "y": 0, "z": 0 }`.
- **`angularVelocity`** – `{ "x", "y", "z" }` in **radians per second**, in the same frame.  
  For a ground robot only yaw matters: `{ "x": 0, "y": 0, "z": wz }` where `wz` is turn rate.

**How to determine values from your waypoints:**

1. **Linear velocity**  
   Use a fixed forward speed in body frame (e.g. `0.3–0.5` m/s):  
   `linearVelocity = { "x": speed_mps, "y": 0, "z": 0 }`.  
   The track follower will drive the robot forward along the path at that speed.

2. **Angular velocity**  
   For each waypoint, estimate turn rate from the path:
   - Heading at this waypoint: yaw from `aFromB.rotation.unitQuaternion` (e.g. `yaw = 2*atan2(imag.z, real)`).
   - Heading at the next waypoint: same from the next pose.
   - `wz = (next_heading - current_heading) / dt`, with `dt = distance_to_next_waypoint / linear_speed` so the robot reaches the next point in that time.  
   For straight segments use `"z": 0`.

Use the helper in this package to fill velocities from pose geometry:

```python
from app.services.path_planning_module.track_velocity import fill_track_velocities

fill_track_velocities(Path("path/to/track.json"), linear_speed_mps=0.5)
```

Or when generating a path, pass `linear_speed_mps` to have velocities filled automatically after the track is saved.
