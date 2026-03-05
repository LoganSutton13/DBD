"""
Fill tangentOfBInA (linearVelocity, angularVelocity) in a Farm-ng track JSON
so the Amiga can follow the track. Velocities are in the robot (body) frame:
linearVelocity in m/s (x=forward, y=left, z=up), angularVelocity in rad/s (z=yaw).
"""
from __future__ import annotations

import json
import math
from pathlib import Path


def _yaw_from_quat(unit_quaternion: dict) -> float:
    """Extract yaw (rotation about z) from farm-ng unitQuaternion { real, imag: {x,y,z} }."""
    real = unit_quaternion.get("real", 1.0)
    imag = unit_quaternion.get("imag") or {}
    iz = imag.get("z", 0.0)
    return 2.0 * math.atan2(iz, real)


def _translation_xy(a_from_b: dict) -> tuple[float, float]:
    """Return (x, y) from aFromB.translation."""
    t = a_from_b.get("translation") or {}
    return (float(t.get("x", 0)), float(t.get("y", 0)))


def _normalize_angle(rad: float) -> float:
    """Normalize angle to [-pi, pi]."""
    while rad > math.pi:
        rad -= 2 * math.pi
    while rad < -math.pi:
        rad += 2 * math.pi
    return rad


def fill_track_velocities(
    track_json_path: Path | str,
    linear_speed_mps: float = 0.5,
    *,
    in_place: bool = True,
) -> None:
    """
    Fill tangentOfBInA.linearVelocity and angularVelocity for each waypoint
    so the robot can drive the track.

    - linearVelocity: (linear_speed_mps, 0, 0) in body frame (forward).
    - angularVelocity: (0, 0, wz) with wz from heading change to next waypoint.

    :param track_json_path: Path to track.json.
    :param linear_speed_mps: Forward speed in m/s.
    :param in_place: If True, overwrite the file; if False, write to <path>.with_velocity.json.
    """
    path = Path(track_json_path)
    data = json.loads(path.read_text(encoding="utf-8"))

    waypoints = data.get("waypoints")
    if not waypoints:
        return

    n = len(waypoints)
    for i in range(n):
        wp = waypoints[i]
        a_from_b = wp.get("aFromB") or {}
        rot = a_from_b.get("rotation") or {}
        quat = rot.get("unitQuaternion") or {}

        tx, ty = _translation_xy(a_from_b)
        yaw = _yaw_from_quat(quat)

        # Next waypoint for direction and angular rate
        if i + 1 < n:
            next_wp = waypoints[i + 1]
            next_ab = next_wp.get("aFromB") or {}
            next_quat = (next_ab.get("rotation") or {}).get("unitQuaternion") or {}
            nx, ny = _translation_xy(next_ab)
            next_yaw = _yaw_from_quat(next_quat)

            dist = math.hypot(nx - tx, ny - ty)
            dt = dist / linear_speed_mps if dist > 1e-6 else 0.01
            delta_heading = _normalize_angle(next_yaw - yaw)
            wz = delta_heading / dt if dt > 1e-6 else 0.0

            linear = {"x": linear_speed_mps, "y": 0.0, "z": 0.0}
        else:
            # Last waypoint: stop or keep same speed; no turn
            linear = {"x": 0.0, "y": 0.0, "z": 0.0}
            wz = 0.0

        tangent = wp.setdefault("tangentOfBInA", {})
        tangent["linearVelocity"] = linear
        tangent["angularVelocity"] = {"x": 0.0, "y": 0.0, "z": wz}

    out_path = path if in_place else path.parent / (path.stem + ".with_velocity.json")
    out_path.write_text(json.dumps(data, indent=2), encoding="utf-8")
    if not in_place:
        print(f"Wrote {out_path}")
