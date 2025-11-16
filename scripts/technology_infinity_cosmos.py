"""Interactive Three.js-style visualization rendered with pythreejs.

The scene is inspired by the prompt "Technology × Infinity × Cosmos" and
renders an animated infinity loop orbiting around a glowing core while a star
field drifts in the background.  The module exposes a helper function,
``create_visualization``, that returns a configured ``Renderer`` instance which
can be displayed inside Jupyter environments.
"""

from __future__ import annotations

import math
import random
from typing import Tuple

from IPython.display import display
from pythreejs import (
    AmbientLight,
    BufferAttribute,
    BufferGeometry,
    Color,
    Line,
    LineBasicMaterial,
    Mesh,
    MeshStandardMaterial,
    PerspectiveCamera,
    PointLight,
    Points,
    PointsMaterial,
    Renderer,
    Scene,
    SphereGeometry,
)


def _build_infinity_curve(points: int = 360) -> Line:
    """Create a luminous infinity-shaped line."""

    positions = []
    for degree in range(points):
        angle = math.radians(degree)
        x = math.sin(angle)
        y = math.sin(angle) * math.cos(angle)
        z = math.cos(angle)
        positions.append([x, y, z])

    geometry = BufferGeometry(attributes={"position": BufferAttribute(positions)})
    material = LineBasicMaterial(color="#00ffff", linewidth=3)
    return Line(geometry, material)


def _build_star_particles(count: int = 1500, spread: float = 5.0) -> Points:
    """Create a scattering of star-like particles."""

    positions = [
        [
            random.uniform(-spread, spread),
            random.uniform(-spread, spread),
            random.uniform(-spread, spread),
        ]
        for _ in range(count)
    ]

    geometry = BufferGeometry(attributes={"position": BufferAttribute(positions)})
    material = PointsMaterial(size=0.02, color="#ffffff")
    return Points(geometry, material)


def create_visualization(
    size: Tuple[int, int] = (960, 540),
    *,
    core_color: str = "#6b5bff",
) -> Renderer:
    """Create and return the configured pythreejs renderer.

    Parameters
    ----------
    size:
        Width and height of the viewport.
    core_color:
        Base color applied to the AI core mesh and its emissive glow.
    """

    scene = Scene(background=Color("#0a0f2d"))
    camera = PerspectiveCamera(position=[0, 0, 6], fov=75)
    renderer = Renderer(
        camera=camera,
        scene=scene,
        antialias=True,
        alpha=True,
        width=size[0],
        height=size[1],
    )

    # Lighting setup
    ambient = AmbientLight("#5555ff", 1.2)
    point = PointLight("#00ffff", 2, position=[2, 2, 2])
    scene.add(ambient, point)

    # Scene contents
    infinity = _build_infinity_curve()
    scene.add(infinity)

    core_geometry = SphereGeometry(0.3, 64, 64)
    core_material = MeshStandardMaterial(
        color=core_color,
        emissive=core_color,
        emissiveIntensity=2,
        roughness=0.2,
        metalness=0.8,
    )
    core = Mesh(core_geometry, core_material)
    scene.add(core)

    stars = _build_star_particles()
    scene.add(stars)

    def animate(*args) -> None:  # pragma: no cover - requires renderer loop
        frame = args[0] if args else 0
        infinity.rotation.y += 0.01
        infinity.rotation.x += 0.005
        core.rotation.y += 0.02
        core.material.emissiveIntensity = 1.5 + math.sin(frame / 10) * 0.5
        renderer.render(scene, camera)

    renderer.render(scene, camera)
    renderer.animate = animate
    return renderer


def display_visualization(**kwargs) -> Renderer:
    """Convenience helper that builds and displays the visualization."""

    renderer = create_visualization(**kwargs)
    display(renderer)
    return renderer


if __name__ == "__main__":  # pragma: no cover - manual invocation helper
    display_visualization()
