from __future__ import annotations

import math
from pathlib import Path

import bpy


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "assets" / "models" / "kraitos-open-desk.glb"


def clear_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()


def material(
    name: str,
    color: tuple[float, float, float, float],
    *,
    metallic: float = 0.0,
    roughness: float = 0.45,
    emission: tuple[float, float, float] | None = None,
    emission_strength: float = 0.0,
) -> bpy.types.Material:
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = color
        bsdf.inputs["Metallic"].default_value = metallic
        bsdf.inputs["Roughness"].default_value = roughness
        if emission:
            bsdf.inputs["Emission Color"].default_value = (*emission, 1.0)
            bsdf.inputs["Emission Strength"].default_value = emission_strength
    return mat


def add_cube(
    name: str,
    location: tuple[float, float, float],
    scale: tuple[float, float, float],
    mat: bpy.types.Material,
    *,
    bevel: float = 0.035,
    segments: int = 6,
    rotation: tuple[float, float, float] = (0, 0, 0),
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cube_add(size=1, location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    if bevel:
        bevel_mod = obj.modifiers.new("rounded bevel", "BEVEL")
        bevel_mod.width = bevel
        bevel_mod.segments = segments
        bevel_mod.affect = "EDGES"
    obj.modifiers.new("weighted normals", "WEIGHTED_NORMAL")
    return obj


def add_cylinder(
    name: str,
    location: tuple[float, float, float],
    radius: float,
    depth: float,
    mat: bpy.types.Material,
    *,
    vertices: int = 96,
    rotation: tuple[float, float, float] = (0, 0, 0),
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(mat)
    obj.modifiers.new("weighted normals", "WEIGHTED_NORMAL")
    return obj


def add_monitor(
    name: str,
    *,
    center: tuple[float, float, float],
    screen_size: tuple[float, float],
    frame_mat: bpy.types.Material,
    screen_mat: bpy.types.Material,
    stand_mat: bpy.types.Material,
    stand_height: float = 1.0,
    vertical: bool = False,
) -> None:
    width, height = screen_size
    x, y, z = center
    add_cube(f"{name}_outer_frame", center, (width + 0.26, 0.18, height + 0.26), frame_mat, bevel=0.07, segments=12)
    add_cube(f"{name}_screen_recess", (x, y - 0.102, z), (width, 0.04, height), screen_mat, bevel=0.035, segments=10)
    add_cube(f"{name}_inner_bezel", (x, y - 0.125, z), (width + 0.08, 0.028, height + 0.08), frame_mat, bevel=0.045, segments=10)

    if not vertical:
        add_cube(f"{name}_stand_neck", (x, y + 0.1, z - height / 2 - stand_height * 0.46), (0.22, 0.22, stand_height), stand_mat, bevel=0.045, segments=10)
        add_cube(f"{name}_stand_foot", (x, y + 0.02, z - height / 2 - stand_height - 0.03), (1.45, 0.82, 0.09), stand_mat, bevel=0.075, segments=12)
    else:
        add_cube(f"{name}_stand_neck", (x, y + 0.1, z - height / 2 - stand_height * 0.42), (0.18, 0.2, stand_height * 0.82), stand_mat, bevel=0.04, segments=10)
        add_cube(f"{name}_stand_foot", (x, y + 0.02, z - height / 2 - stand_height * 0.84), (0.92, 0.68, 0.08), stand_mat, bevel=0.065, segments=12)


def add_keyboard(mat_key: bpy.types.Material, mat_deck: bpy.types.Material) -> None:
    add_cube("keyboard_deck", (-0.42, -2.18, 1.12), (3.75, 1.02, 0.08), mat_deck, bevel=0.08, segments=12)
    for row in range(5):
        for col in range(15):
            width = 0.18
            if row == 4 and 3 <= col <= 8:
                width = 0.32
            if row == 4 and col in (0, 14):
                width = 0.24
            x = -2.05 + col * 0.235
            y = -2.55 + row * 0.18
            z = 1.19
            add_cube(f"keyboard_key_{row}_{col}", (x, y, z), (width, 0.115, 0.045), mat_key, bevel=0.026, segments=6)


def add_laptop(frame_mat: bpy.types.Material, screen_mat: bpy.types.Material, key_mat: bpy.types.Material) -> None:
    add_cube("laptop_base", (2.85, -2.0, 1.08), (2.18, 1.34, 0.08), frame_mat, bevel=0.06, segments=10)
    add_cube("laptop_trackpad", (2.85, -2.25, 1.135), (0.66, 0.36, 0.012), screen_mat, bevel=0.025, segments=6)
    for row in range(4):
        for col in range(10):
            add_cube(
                f"laptop_key_{row}_{col}",
                (1.98 + col * 0.19, -2.04 + row * 0.13, 1.145),
                (0.12, 0.07, 0.018),
                key_mat,
                bevel=0.015,
                segments=4,
            )
    add_cube("laptop_screen_frame", (2.85, -1.64, 1.78), (2.18, 0.11, 1.22), frame_mat, bevel=0.055, segments=10)
    add_cube("laptop_screen_recess", (2.85, -1.71, 1.78), (1.94, 0.035, 1.02), screen_mat, bevel=0.028, segments=8)
    add_cylinder("laptop_hinge_left", (1.88, -1.62, 1.22), 0.045, 0.24, frame_mat, rotation=(math.radians(90), 0, 0))
    add_cylinder("laptop_hinge_right", (3.82, -1.62, 1.22), 0.045, 0.24, frame_mat, rotation=(math.radians(90), 0, 0))


def create_scene() -> None:
    clear_scene()
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)

    mat_floor = material("warm white studio floor", (0.88, 0.91, 0.88, 1), roughness=0.36)
    mat_desk = material("matte white desk slab", (0.83, 0.86, 0.83, 1), metallic=0.05, roughness=0.28)
    mat_frame = material("deep graphite monitor frame", (0.018, 0.026, 0.028, 1), metallic=0.55, roughness=0.2)
    mat_frame_edge = material("soft graphite stand metal", (0.035, 0.047, 0.05, 1), metallic=0.65, roughness=0.22)
    mat_screen = material(
        "unlit glass screen base",
        (0.005, 0.018, 0.021, 1),
        metallic=0.15,
        roughness=0.08,
        emission=(0.015, 0.12, 0.13),
        emission_strength=0.45,
    )
    mat_key = material("low profile black keys", (0.014, 0.018, 0.02, 1), metallic=0.22, roughness=0.55)
    mat_cyan = material(
        "thin cyan accent",
        (0.16, 0.95, 0.88, 1),
        metallic=0.2,
        roughness=0.22,
        emission=(0.12, 0.9, 0.82),
        emission_strength=1.1,
    )

    add_cube("infinite_white_floor", (0, -0.65, -0.06), (18, 14, 0.1), mat_floor, bevel=0, segments=0)
    add_cube("open_desk_slab", (0, -1.55, 0.96), (7.65, 2.15, 0.16), mat_desk, bevel=0.12, segments=16)
    add_cube("desk_front_edge_graphite", (0, -2.62, 0.92), (7.72, 0.08, 0.2), mat_frame, bevel=0.04, segments=8)
    add_cube("desk_rear_shadow_edge", (0, -0.48, 0.91), (7.55, 0.06, 0.16), mat_frame_edge, bevel=0.035, segments=8)

    for x in (-3.34, 3.34):
        add_cube(f"desk_leg_{x}", (x, -1.48, 0.42), (0.28, 0.28, 0.86), mat_frame_edge, bevel=0.05, segments=10)

    add_monitor(
        "main_monitor",
        center=(0, -1.38, 2.48),
        screen_size=(4.75, 2.55),
        frame_mat=mat_frame,
        screen_mat=mat_screen,
        stand_mat=mat_frame_edge,
        stand_height=0.92,
    )
    add_monitor(
        "vertical_monitor",
        center=(-3.22, -1.43, 2.36),
        screen_size=(1.18, 2.64),
        frame_mat=mat_frame,
        screen_mat=mat_screen,
        stand_mat=mat_frame_edge,
        stand_height=0.82,
        vertical=True,
    )

    add_laptop(mat_frame, mat_screen, mat_key)
    add_keyboard(mat_key, mat_frame_edge)
    add_cylinder("mouse_body", (3.82, -2.34, 1.16), 0.26, 0.11, mat_frame, rotation=(math.radians(90), 0, 0))

    for x in (-2.05, -0.95, 0.15, 1.25):
        add_cube(f"desk_cyan_trace_{x}", (x, -0.62, 1.07), (0.72, 0.018, 0.014), mat_cyan, bevel=0.01, segments=4)

    bpy.ops.object.light_add(type="AREA", location=(0, -3.8, 5.0))
    key = bpy.context.object
    key.name = "large_soft_studio_key"
    key.data.energy = 900
    key.data.size = 6.5
    key.data.color = (0.86, 1.0, 0.97)

    bpy.ops.object.light_add(type="AREA", location=(-4.8, 0.6, 3.8))
    fill = bpy.context.object
    fill.name = "left_cyan_fill"
    fill.data.energy = 180
    fill.data.size = 4.0
    fill.data.color = (0.55, 1.0, 0.94)

    bpy.ops.object.light_add(type="POINT", location=(0, -1.8, 2.55))
    screen_glow = bpy.context.object
    screen_glow.name = "monitor_cyan_spill"
    screen_glow.data.energy = 180
    screen_glow.data.color = (0.2, 1.0, 0.9)
    screen_glow.data.shadow_soft_size = 4.5

    bpy.ops.object.camera_add(location=(0, -6.2, 2.45), rotation=(math.radians(73), 0, 0))
    camera = bpy.context.object
    bpy.context.scene.camera = camera
    camera.name = "preview_camera"
    camera.data.lens = 32

    for obj in bpy.context.scene.objects:
        obj.select_set(True)

    bpy.ops.export_scene.gltf(
        filepath=str(OUTPUT),
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_lights=True,
        export_cameras=False,
        export_yup=True,
        export_draco_mesh_compression_enable=False,
    )


if __name__ == "__main__":
    create_scene()
