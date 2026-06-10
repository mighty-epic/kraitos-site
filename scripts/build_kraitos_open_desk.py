from __future__ import annotations

import math
from pathlib import Path

import bpy


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "assets" / "models" / "kraitos-open-desk.v4.glb"


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
    add_cube(f"{name}_rear_shell", (x, y + 0.02, z), (width + 0.24, 0.14, height + 0.24), frame_mat, bevel=0.008, segments=2)
    add_cube(f"{name}_screen_recess", (x, y - 0.105, z), (width, 0.026, height), screen_mat, bevel=0.003, segments=1)
    add_cube(f"{name}_top_bezel", (x, y - 0.14, z + height / 2 + 0.075), (width + 0.2, 0.062, 0.105), frame_mat, bevel=0.006, segments=2)
    add_cube(f"{name}_bottom_bezel", (x, y - 0.14, z - height / 2 - 0.075), (width + 0.2, 0.062, 0.105), frame_mat, bevel=0.006, segments=2)
    add_cube(f"{name}_left_bezel", (x - width / 2 - 0.075, y - 0.14, z), (0.105, 0.062, height), frame_mat, bevel=0.006, segments=2)
    add_cube(f"{name}_right_bezel", (x + width / 2 + 0.075, y - 0.14, z), (0.105, 0.062, height), frame_mat, bevel=0.006, segments=2)
    add_cube(f"{name}_inner_top_edge", (x, y - 0.173, z + height / 2 + 0.012), (width + 0.012, 0.012, 0.018), accent_mat or frame_mat, bevel=0.001, segments=1)
    add_cube(f"{name}_inner_bottom_edge", (x, y - 0.173, z - height / 2 - 0.012), (width + 0.012, 0.012, 0.018), accent_mat or frame_mat, bevel=0.001, segments=1)
    add_cube(f"{name}_inner_left_edge", (x - width / 2 - 0.012, y - 0.173, z), (0.018, 0.012, height), accent_mat or frame_mat, bevel=0.001, segments=1)
    add_cube(f"{name}_inner_right_edge", (x + width / 2 + 0.012, y - 0.173, z), (0.018, 0.012, height), accent_mat or frame_mat, bevel=0.001, segments=1)

    if accent_mat:
        add_cube(f"{name}_bottom_status_light", (x, y - 0.18, z - height / 2 - 0.018), (width * 0.34, 0.014, 0.012), accent_mat, bevel=0.001, segments=1)
        add_cube(f"{name}_camera_dot", (x, y - 0.182, z + height / 2 + 0.076), (0.04, 0.01, 0.016), accent_mat, bevel=0.003, segments=2)

    if not vertical:
        add_cube(f"{name}_stand_neck", (x, y + 0.1, z - height / 2 - stand_height * 0.46), (0.16, 0.16, stand_height), stand_mat, bevel=0.006, segments=2)
        add_cube(f"{name}_stand_foot", (x, y + 0.02, z - height / 2 - stand_height - 0.03), (1.35, 0.68, 0.07), stand_mat, bevel=0.008, segments=2)
        add_cube(f"{name}_stand_foot_highlight", (x, y - 0.33, z - height / 2 - stand_height + 0.012), (1.18, 0.018, 0.011), accent_mat or stand_mat, bevel=0.001, segments=1)
    else:
        add_cube(f"{name}_stand_neck", (x, y + 0.1, z - height / 2 - stand_height * 0.42), (0.15, 0.16, stand_height * 0.82), stand_mat, bevel=0.006, segments=2)
        add_cube(f"{name}_stand_foot", (x, y + 0.02, z - height / 2 - stand_height * 0.84), (0.86, 0.6, 0.07), stand_mat, bevel=0.008, segments=2)


def add_wood_desk(
    wood_mat: bpy.types.Material,
    edge_mat: bpy.types.Material,
    grain_mat: bpy.types.Material,
    metal_mat: bpy.types.Material,
) -> None:
    add_cube("solid_wood_desktop", (0, -1.58, 0.98), (9.35, 3.05, 0.2), wood_mat, bevel=0.01, segments=2)
    add_cube("wood_front_lip", (0, -3.12, 1.1), (9.42, 0.12, 0.08), edge_mat, bevel=0.006, segments=2)
    add_cube("wood_rear_lip", (0, -0.04, 1.1), (9.18, 0.08, 0.055), edge_mat, bevel=0.004, segments=1)
    add_cube("wood_left_lip", (-4.7, -1.58, 1.1), (0.08, 2.98, 0.055), edge_mat, bevel=0.004, segments=1)
    add_cube("wood_right_lip", (4.7, -1.58, 1.1), (0.08, 2.98, 0.055), edge_mat, bevel=0.004, segments=1)
    add_cube("wood_front_apron", (0, -3.12, 0.78), (9.38, 0.12, 0.34), edge_mat, bevel=0.008, segments=2)
    add_cube("wood_rear_apron", (0, -0.08, 0.8), (9.12, 0.1, 0.28), edge_mat, bevel=0.006, segments=2)
    add_cube("wood_left_apron", (-4.6, -1.58, 0.8), (0.11, 2.72, 0.28), edge_mat, bevel=0.006, segments=2)
    add_cube("wood_right_apron", (4.6, -1.58, 0.8), (0.11, 2.72, 0.28), edge_mat, bevel=0.006, segments=2)

    for x in (-4.35, 4.35):
        for y in (-2.82, -0.34):
            add_cube(f"desk_steel_leg_{x}_{y}", (x, y, 0.47), (0.18, 0.18, 0.98), metal_mat, bevel=0.006, segments=2)

    add_cube("desk_front_steel_rail", (0, -2.82, 0.94), (8.7, 0.12, 0.12), metal_mat, bevel=0.004, segments=2)
    add_cube("desk_rear_steel_rail", (0, -0.34, 0.94), (8.7, 0.12, 0.12), metal_mat, bevel=0.004, segments=2)
    add_cube("desk_left_steel_rail", (-4.35, -1.58, 0.94), (0.12, 2.48, 0.12), metal_mat, bevel=0.004, segments=2)
    add_cube("desk_right_steel_rail", (4.35, -1.58, 0.94), (0.12, 2.48, 0.12), metal_mat, bevel=0.004, segments=2)

    for index, y in enumerate([-2.86, -2.68, -2.5, -2.32, -2.14, -1.96, -1.78, -1.6, -1.42, -1.24, -1.06, -0.88, -0.7, -0.52, -0.34]):
        width = 8.45 + math.sin(index * 1.7) * 0.48
        x = math.sin(index * 0.93) * 0.18
        add_cube(f"desktop_long_grain_{index}", (x, y, 1.083), (width, 0.01, 0.004), grain_mat, bevel=0.001, segments=1)

    for index, x in enumerate([-3.85, -2.58, -1.24, 0.08, 1.52, 2.74, 3.9]):
        add_cube(f"desktop_plank_join_{index}", (x, -1.58, 1.086), (0.012, 2.84, 0.005), grain_mat, bevel=0.001, segments=1)

    for index, z in enumerate([0.57, 0.68, 0.79, 0.9]):
        add_cube(f"front_apron_grain_{index}", (0.08 * math.sin(index), -3.185, z), (8.72, 0.01, 0.01), grain_mat, bevel=0.001, segments=1)

    add_cylinder("desk_cable_port", (3.35, -0.58, 1.087), 0.14, 0.01, grain_mat, vertices=64, rotation=(0, 0, 0))


def add_keyboard(mat_key: bpy.types.Material, mat_deck: bpy.types.Material) -> None:
    add_cube("keyboard_deck", (-0.42, -2.18, 1.12), (3.75, 1.02, 0.075), mat_deck, bevel=0.006, segments=2)
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
            add_cube(f"keyboard_key_{row}_{col}", (x, y, z), (width, 0.115, 0.04), mat_key, bevel=0.003, segments=1)


def add_laptop(frame_mat: bpy.types.Material, screen_mat: bpy.types.Material, key_mat: bpy.types.Material) -> None:
    base_x = 3.48
    add_cube("laptop_base", (base_x, -2.05, 1.08), (1.5, 1.02, 0.065), frame_mat, bevel=0.006, segments=2)
    add_cube("laptop_trackpad", (base_x, -2.25, 1.13), (0.46, 0.28, 0.01), screen_mat, bevel=0.003, segments=1)
    for row in range(4):
        for col in range(8):
            add_cube(
                f"laptop_key_{row}_{col}",
                (base_x - 0.58 + col * 0.165, -2.03 + row * 0.12, 1.14),
                (0.1, 0.062, 0.016),
                key_mat,
                bevel=0.004,
                segments=2,
            )
    add_cube("laptop_screen_frame", (base_x, -1.78, 1.62), (1.52, 0.085, 0.88), frame_mat, bevel=0.006, segments=2)
    add_cube("laptop_screen_recess", (base_x, -1.84, 1.62), (1.34, 0.026, 0.72), screen_mat, bevel=0.003, segments=1)
    add_cylinder("laptop_hinge_left", (base_x - 0.66, -1.74, 1.16), 0.035, 0.2, frame_mat, rotation=(math.radians(90), 0, 0))
    add_cylinder("laptop_hinge_right", (base_x + 0.66, -1.74, 1.16), 0.035, 0.2, frame_mat, rotation=(math.radians(90), 0, 0))


def create_scene() -> None:
    clear_scene()
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)

    mat_floor = material("infinite white matte floor", (0.94, 0.96, 0.94, 1), roughness=0.42)
    mat_wood = material("warm walnut desktop", (0.34, 0.17, 0.072, 1), metallic=0.0, roughness=0.36)
    mat_wood_edge = material("dark walnut desk edge", (0.18, 0.08, 0.03, 1), metallic=0.0, roughness=0.42)
    mat_wood_grain = material("subtle walnut grain", (0.068, 0.032, 0.014, 1), metallic=0.0, roughness=0.56)
    mat_desk_metal = material("powder coated black desk frame", (0.014, 0.017, 0.017, 1), metallic=0.55, roughness=0.28)
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
    add_wood_desk(mat_wood, mat_wood_edge, mat_wood_grain, mat_desk_metal)

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
    add_cylinder("mouse_body", (4.02, -2.38, 1.15), 0.22, 0.1, mat_frame, rotation=(math.radians(90), 0, 0))

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
