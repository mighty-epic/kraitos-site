from __future__ import annotations

import math
from pathlib import Path

import bpy


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "assets" / "models" / "kraitos-open-desk.v2.glb"


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
    accent_mat: bpy.types.Material | None = None,
    stand_height: float = 1.0,
    vertical: bool = False,
) -> None:
    width, height = screen_size
    x, y, z = center
    add_cube(f"{name}_rear_shell", (x, y + 0.02, z), (width + 0.24, 0.16, height + 0.24), frame_mat, bevel=0.035, segments=8)
    add_cube(f"{name}_screen_recess", (x, y - 0.115, z), (width, 0.032, height), screen_mat, bevel=0.018, segments=6)
    add_cube(f"{name}_top_bezel", (x, y - 0.15, z + height / 2 + 0.075), (width + 0.2, 0.075, 0.11), frame_mat, bevel=0.025, segments=6)
    add_cube(f"{name}_bottom_bezel", (x, y - 0.15, z - height / 2 - 0.075), (width + 0.2, 0.075, 0.11), frame_mat, bevel=0.025, segments=6)
    add_cube(f"{name}_left_bezel", (x - width / 2 - 0.075, y - 0.15, z), (0.11, 0.075, height), frame_mat, bevel=0.025, segments=6)
    add_cube(f"{name}_right_bezel", (x + width / 2 + 0.075, y - 0.15, z), (0.11, 0.075, height), frame_mat, bevel=0.025, segments=6)

    if accent_mat:
        add_cube(f"{name}_bottom_status_light", (x, y - 0.195, z - height / 2 - 0.018), (width * 0.34, 0.018, 0.015), accent_mat, bevel=0.004, segments=3)
        add_cube(f"{name}_camera_dot", (x, y - 0.198, z + height / 2 + 0.076), (0.04, 0.012, 0.018), accent_mat, bevel=0.006, segments=4)

    if not vertical:
        add_cube(f"{name}_stand_neck", (x, y + 0.1, z - height / 2 - stand_height * 0.46), (0.18, 0.18, stand_height), stand_mat, bevel=0.028, segments=6)
        add_cube(f"{name}_stand_foot", (x, y + 0.02, z - height / 2 - stand_height - 0.03), (1.35, 0.72, 0.08), stand_mat, bevel=0.04, segments=8)
    else:
        add_cube(f"{name}_stand_neck", (x, y + 0.1, z - height / 2 - stand_height * 0.42), (0.16, 0.18, stand_height * 0.82), stand_mat, bevel=0.025, segments=6)
        add_cube(f"{name}_stand_foot", (x, y + 0.02, z - height / 2 - stand_height * 0.84), (0.86, 0.62, 0.075), stand_mat, bevel=0.035, segments=8)


def add_wood_desk(wood_mat: bpy.types.Material, edge_mat: bpy.types.Material, grain_mat: bpy.types.Material) -> None:
    add_cube("solid_wood_desktop", (0, -1.58, 0.96), (8.45, 2.55, 0.22), wood_mat, bevel=0.045, segments=8)
    add_cube("wood_front_apron", (0, -2.9, 0.73), (8.5, 0.16, 0.46), edge_mat, bevel=0.028, segments=6)
    add_cube("wood_rear_apron", (0, -0.26, 0.74), (8.25, 0.13, 0.34), edge_mat, bevel=0.024, segments=5)
    add_cube("wood_left_apron", (-4.18, -1.58, 0.74), (0.14, 2.32, 0.36), edge_mat, bevel=0.024, segments=5)
    add_cube("wood_right_apron", (4.18, -1.58, 0.74), (0.14, 2.32, 0.36), edge_mat, bevel=0.024, segments=5)

    for x in (-3.86, 3.86):
        for y in (-2.62, -0.54):
            add_cube(f"wood_leg_{x}_{y}", (x, y, 0.43), (0.36, 0.36, 0.92), edge_mat, bevel=0.035, segments=7)

    for index, y in enumerate([-2.62, -2.34, -2.08, -1.82, -1.55, -1.3, -1.02, -0.74, -0.52]):
        width = 7.35 + math.sin(index * 1.7) * 0.52
        x = math.sin(index * 0.93) * 0.18
        add_cube(f"desktop_long_grain_{index}", (x, y, 1.078), (width, 0.016, 0.006), grain_mat, bevel=0.002, segments=2)

    for index, z in enumerate([0.57, 0.68, 0.79, 0.9]):
        add_cube(f"front_apron_grain_{index}", (0.08 * math.sin(index), -2.985, z), (7.9, 0.012, 0.012), grain_mat, bevel=0.002, segments=2)

    add_cylinder("desk_cable_port", (3.15, -0.74, 1.087), 0.16, 0.014, grain_mat, vertices=64, rotation=(0, 0, 0))


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

    mat_floor = material("infinite white matte floor", (0.94, 0.96, 0.94, 1), roughness=0.42)
    mat_wood = material("warm walnut desktop", (0.46, 0.255, 0.125, 1), metallic=0.0, roughness=0.34)
    mat_wood_edge = material("dark walnut desk edge", (0.27, 0.135, 0.062, 1), metallic=0.0, roughness=0.38)
    mat_wood_grain = material("subtle walnut grain", (0.13, 0.07, 0.032, 1), metallic=0.0, roughness=0.52)
    mat_frame = material("deep graphite monitor frame", (0.009, 0.012, 0.013, 1), metallic=0.72, roughness=0.16)
    mat_frame_edge = material("brushed graphite stand metal", (0.018, 0.024, 0.026, 1), metallic=0.72, roughness=0.18)
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

    add_cube("infinite_white_floor", (0, -0.1, -0.065), (34, 28, 0.1), mat_floor, bevel=0, segments=0)
    add_wood_desk(mat_wood, mat_wood_edge, mat_wood_grain)

    add_monitor(
        "main_monitor",
        center=(0, -1.38, 2.48),
        screen_size=(4.75, 2.55),
        frame_mat=mat_frame,
        screen_mat=mat_screen,
        stand_mat=mat_frame_edge,
        accent_mat=mat_cyan,
        stand_height=0.92,
    )
    add_monitor(
        "vertical_monitor",
        center=(-3.22, -1.43, 2.36),
        screen_size=(1.18, 2.64),
        frame_mat=mat_frame,
        screen_mat=mat_screen,
        stand_mat=mat_frame_edge,
        accent_mat=mat_cyan,
        stand_height=0.82,
        vertical=True,
    )

    add_laptop(mat_frame, mat_screen, mat_key)
    add_keyboard(mat_key, mat_frame_edge)
    add_cylinder("mouse_body", (3.82, -2.34, 1.16), 0.26, 0.11, mat_frame, rotation=(math.radians(90), 0, 0))

    add_cube("monitor_cable_shadow", (0, -0.5, 1.08), (0.92, 0.022, 0.012), mat_wood_grain, bevel=0.003, segments=2)

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
