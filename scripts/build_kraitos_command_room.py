from __future__ import annotations

import math
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "assets" / "models" / "kraitos-command-room.glb"


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
    alpha: float | None = None,
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
        if alpha is not None:
            bsdf.inputs["Alpha"].default_value = alpha
            mat.blend_method = "BLEND"
            mat.use_screen_refraction = True
            mat.show_transparent_back = True
    return mat


def add_cube(
    name: str,
    location: tuple[float, float, float],
    scale: tuple[float, float, float],
    mat: bpy.types.Material,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    bevel = obj.modifiers.new("soft bevel", "BEVEL")
    bevel.width = 0.035
    bevel.segments = 3
    obj.modifiers.new("weighted normals", "WEIGHTED_NORMAL")
    return obj


def add_cylinder(
    name: str,
    location: tuple[float, float, float],
    radius: float,
    depth: float,
    mat: bpy.types.Material,
    *,
    vertices: int = 48,
    rotation: tuple[float, float, float] = (0, 0, 0),
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(mat)
    obj.modifiers.new("weighted normals", "WEIGHTED_NORMAL")
    return obj


def add_text(
    name: str,
    text: str,
    location: tuple[float, float, float],
    rotation: tuple[float, float, float],
    size: float,
    mat: bpy.types.Material,
    *,
    align: str = "CENTER",
    extrude: float = 0.006,
) -> bpy.types.Object:
    bpy.ops.object.text_add(location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.data.body = text
    obj.data.align_x = align
    obj.data.align_y = "CENTER"
    obj.data.size = size
    obj.data.extrude = extrude
    obj.data.resolution_u = 8
    obj.data.materials.append(mat)
    bpy.ops.object.convert(target="MESH")
    bpy.context.object.name = name
    return bpy.context.object


def add_panel(
    name: str,
    center: tuple[float, float, float],
    rotation: tuple[float, float, float],
    width: float,
    height: float,
    title: str,
    body: str,
    panel_mat: bpy.types.Material,
    title_mat: bpy.types.Material,
    body_mat: bpy.types.Material,
) -> None:
    panel = add_cube(f"{name}_glass", center, (width, 0.028, height), panel_mat)
    panel.rotation_euler = rotation

    local_z = Vector((0, 0, 1))
    normal = Vector((0, -1, 0))
    panel_matrix = panel.matrix_world.to_3x3()
    right = panel_matrix @ Vector((1, 0, 0))
    up = panel_matrix @ local_z
    forward = panel_matrix @ normal

    title_pos = Vector(center) + up * (height * 0.28) + forward * 0.035
    body_pos = Vector(center) - up * (height * 0.06) + forward * 0.035

    add_text(
        f"{name}_title",
        title,
        tuple(title_pos),
        rotation,
        0.16,
        title_mat,
        align="CENTER",
        extrude=0.004,
    )
    add_text(
        f"{name}_body",
        body,
        tuple(body_pos),
        rotation,
        0.065,
        body_mat,
        align="CENTER",
        extrude=0.002,
    )

    for i in range(4):
        line_pos = Vector(center) - up * (height * (0.24 + i * 0.1)) - right * (width * 0.18) + forward * 0.04
        bar = add_cube(f"{name}_signal_{i}", tuple(line_pos), (width * (0.25 + i * 0.07), 0.018, 0.018), title_mat)
        bar.rotation_euler = rotation


def create_room() -> None:
    clear_scene()
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)

    mat_floor = material("black graphite floor", (0.015, 0.022, 0.024, 1), metallic=0.45, roughness=0.28)
    mat_wall = material("deep obsidian walls", (0.012, 0.016, 0.018, 1), metallic=0.2, roughness=0.54)
    mat_desk = material("gunmetal desk", (0.035, 0.047, 0.049, 1), metallic=0.62, roughness=0.24)
    mat_glass = material(
        "hologram glass cyan",
        (0.05, 0.45, 0.42, 0.34),
        metallic=0.0,
        roughness=0.08,
        emission=(0.05, 0.95, 0.84),
        emission_strength=0.35,
        alpha=0.34,
    )
    mat_screen = material(
        "monitor emissive screen",
        (0.02, 0.12, 0.12, 1),
        metallic=0.1,
        roughness=0.18,
        emission=(0.02, 0.58, 0.5),
        emission_strength=1.1,
    )
    mat_backplate = material(
        "dark readable backplate",
        (0.006, 0.018, 0.019, 0.82),
        metallic=0.15,
        roughness=0.18,
        emission=(0.0, 0.16, 0.14),
        emission_strength=0.35,
        alpha=0.82,
    )
    mat_cyan = material(
        "kraitos cyan emission",
        (0.22, 1.0, 0.9, 1),
        metallic=0.25,
        roughness=0.2,
        emission=(0.18, 0.98, 0.86),
        emission_strength=2.5,
    )
    mat_dim_cyan = material(
        "dim cyan linework",
        (0.08, 0.63, 0.58, 1),
        metallic=0.1,
        roughness=0.3,
        emission=(0.03, 0.66, 0.58),
        emission_strength=1.3,
    )
    mat_amber = material(
        "amber warning emission",
        (1.0, 0.58, 0.18, 1),
        metallic=0.1,
        roughness=0.24,
        emission=(1.0, 0.46, 0.08),
        emission_strength=1.7,
    )
    mat_white = material(
        "soft white type",
        (0.88, 0.96, 0.94, 1),
        roughness=0.32,
        emission=(0.6, 0.92, 0.88),
        emission_strength=0.6,
    )
    mat_key = material("matte black keys", (0.012, 0.018, 0.02, 1), metallic=0.18, roughness=0.65)

    add_cube("floor_reflective_grid", (0, 0, -0.08), (14, 15, 0.12), mat_floor)
    add_cube("back_wall", (0, 6.15, 2.35), (14, 0.2, 4.9), mat_wall)
    add_cube("left_wall", (-7.05, 0.3, 2.25), (0.2, 12.2, 4.7), mat_wall)
    add_cube("right_wall", (7.05, 0.3, 2.25), (0.2, 12.2, 4.7), mat_wall)
    add_cube("ceiling_shadow", (0, 0.3, 4.78), (14, 12.3, 0.12), mat_wall)

    for x in [-5.2, -2.6, 0, 2.6, 5.2]:
        add_cube(f"floor_cyan_trace_{x}", (x, 0.1, 0.003), (0.018, 10.5, 0.012), mat_dim_cyan)
    for y in [-3.6, -1.2, 1.2, 3.6]:
        add_cube(f"floor_cross_trace_{y}", (0, y, 0.008), (11.5, 0.016, 0.012), mat_dim_cyan)

    add_cube("main_desk_slab", (0, -0.78, 1.0), (7.8, 2.7, 0.28), mat_desk)
    add_cube("desk_left_support", (-3.4, -0.78, 0.46), (0.34, 2.2, 0.86), mat_desk)
    add_cube("desk_right_support", (3.4, -0.78, 0.46), (0.34, 2.2, 0.86), mat_desk)
    add_cube("desk_glass_top", (0, -0.78, 1.18), (8.05, 2.9, 0.04), mat_glass)

    add_cube("primary_monitor_shell", (0, 1.18, 2.4), (4.9, 0.22, 2.55), mat_desk)
    add_cube("primary_monitor_screen", (0, 1.045, 2.4), (4.55, 0.035, 2.22), mat_screen)
    add_cube("monitor_stem", (0, 0.64, 1.45), (0.28, 0.32, 1.25), mat_desk)
    add_cube("monitor_base", (0, 0.22, 1.02), (1.8, 0.9, 0.14), mat_desk)

    add_text(
        "monitor_kraitos_title",
        "KRAITOS",
        (-1.52, 0.995, 2.94),
        (math.radians(90), 0, 0),
        0.34,
        mat_cyan,
        align="LEFT",
        extrude=0.005,
    )
    add_text(
        "monitor_operator_subtitle",
        "DESKTOP OPERATOR ONLINE",
        (-1.52, 0.99, 2.66),
        (math.radians(90), 0, 0),
        0.105,
        mat_white,
        align="LEFT",
        extrude=0.002,
    )
    for i, label in enumerate(["BROWSER STATE", "DESKTOP INPUT", "SHELL ACTIONS", "OCR FALLBACK", "LOGGED MEMORY"]):
        y = 2.38 - i * 0.24
        add_text(
            f"monitor_stack_{i}",
            label,
            (-1.52, 0.985, y),
            (math.radians(90), 0, 0),
            0.075,
            mat_dim_cyan if i % 2 == 0 else mat_amber,
            align="LEFT",
            extrude=0.002,
        )

    keyboard_base = add_cube("keyboard_base", (0, -1.48, 1.32), (4.6, 1.15, 0.13), mat_key)
    keyboard_base.rotation_euler[2] = math.radians(-2)
    for row in range(4):
        for col in range(14):
            key = add_cube(
                f"keyboard_key_{row}_{col}",
                (-1.95 + col * 0.3 + (row % 2) * 0.07, -1.83 + row * 0.25, 1.45),
                (0.21, 0.16, 0.045),
                mat_key,
            )
            key.rotation_euler[2] = math.radians(-2)

    add_cylinder("mouse_body", (3.05, -1.55, 1.44), 0.38, 0.18, mat_key, vertices=48, rotation=(math.radians(90), 0, 0))

    bpy.ops.mesh.primitive_uv_sphere_add(segments=48, ring_count=24, radius=0.38, location=(0, -0.6, 2.0))
    core = bpy.context.object
    core.name = "agent_core"
    core.scale = (1, 1, 1.12)
    core.data.materials.append(mat_cyan)

    for i, angle in enumerate([0, 42, 87, 128]):
        bpy.ops.mesh.primitive_torus_add(
            major_radius=0.78 + i * 0.16,
            minor_radius=0.01,
            major_segments=96,
            minor_segments=8,
            location=(0, -0.6, 2.0),
            rotation=(math.radians(90 + i * 18), math.radians(angle), math.radians(i * 12)),
        )
        ring = bpy.context.object
        ring.name = f"agent_orbit_{i}"
        ring.data.materials.append(mat_dim_cyan)

    hero_rotation = (math.radians(76), 0, math.radians(-13))
    hero_backplate = add_cube("hero_room_backplate", (-3.7, -2.48, 2.62), (3.55, 0.055, 1.28), mat_backplate)
    hero_backplate.rotation_euler = hero_rotation
    add_text(
        "hero_room_title",
        "KRAITOS",
        (-4.52, -2.57, 3.02),
        hero_rotation,
        0.48,
        mat_cyan,
        align="LEFT",
        extrude=0.01,
    )
    add_text(
        "hero_room_body",
        "AI DESKTOP AGENT\\nCONTROLLED COMPUTER ACTIONS\\nOBSERVE  ACT  VERIFY",
        (-4.48, -2.58, 2.52),
        hero_rotation,
        0.105,
        mat_white,
        align="LEFT",
        extrude=0.003,
    )
    add_cube("hero_room_rule_cyan", (-3.62, -2.62, 2.14), (2.55, 0.025, 0.035), mat_cyan).rotation_euler = hero_rotation

    add_panel(
        "hero_spatial_panel",
        (-3.15, -0.15, 2.55),
        (math.radians(82), 0, math.radians(-13)),
        2.5,
        1.18,
        "KRAITOS",
        "AI DESKTOP AGENT\\nCONTROLLED COMPUTER ACTIONS",
        mat_glass,
        mat_cyan,
        mat_white,
    )
    add_panel(
        "observe_panel",
        (2.95, 0.1, 2.65),
        (math.radians(82), 0, math.radians(15)),
        2.15,
        1.04,
        "OBSERVE",
        "SCREENSHOTS + OCR\\nBROWSER STATE + MEMORY",
        mat_glass,
        mat_cyan,
        mat_white,
    )
    add_panel(
        "act_panel",
        (-2.85, -2.6, 2.16),
        (math.radians(72), 0, math.radians(-30)),
        2.1,
        0.96,
        "ACT",
        "CHROME BRIDGE\\nFILES + TERMINAL + DESKTOP",
        mat_glass,
        mat_amber,
        mat_white,
    )
    add_panel(
        "verify_panel",
        (3.05, -2.35, 2.12),
        (math.radians(72), 0, math.radians(30)),
        2.1,
        0.96,
        "VERIFY",
        "LOGS + SCREENSHOTS\\nRECOVER OR STOP CLEANLY",
        mat_glass,
        mat_cyan,
        mat_white,
    )
    add_panel(
        "download_panel",
        (0, -4.1, 2.3),
        (math.radians(66), 0, 0),
        2.8,
        1.02,
        "WINDOWS MSI",
        "CURRENT BUILD READY\\n585 MiB INSTALLER",
        mat_glass,
        mat_amber,
        mat_white,
    )

    for i, x in enumerate([-4.2, -2.1, 2.1, 4.2]):
        add_cylinder(f"ceiling_light_{i}", (x, -1.2 + i * 0.55, 4.65), 0.08, 1.3, mat_cyan if i % 2 == 0 else mat_amber, rotation=(0, math.radians(90), 0))

    bpy.ops.object.light_add(type="AREA", location=(0, -2.4, 4.25))
    key_light = bpy.context.object
    key_light.name = "wide_cyan_softbox"
    key_light.data.energy = 650
    key_light.data.size = 5.8
    key_light.data.color = (0.45, 1.0, 0.92)

    bpy.ops.object.light_add(type="POINT", location=(0, -0.6, 2.1))
    core_light = bpy.context.object
    core_light.name = "agent_core_light"
    core_light.data.energy = 900
    core_light.data.color = (0.2, 1.0, 0.88)
    core_light.data.shadow_soft_size = 4.0

    bpy.ops.object.light_add(type="AREA", location=(-4.2, 3.2, 3.8))
    amber_light = bpy.context.object
    amber_light.name = "amber_rim_light"
    amber_light.data.energy = 280
    amber_light.data.size = 3.5
    amber_light.data.color = (1.0, 0.55, 0.18)

    bpy.ops.object.camera_add(location=(-5.4, -5.2, 3.0), rotation=(math.radians(64), 0, math.radians(-42)))
    camera = bpy.context.object
    bpy.context.scene.camera = camera
    camera.name = "preview_camera"
    camera.data.lens = 24

    empty = bpy.data.objects.new("scene_focus", None)
    empty.location = (0, -0.75, 2.0)
    bpy.context.collection.objects.link(empty)
    constraint = camera.constraints.new(type="TRACK_TO")
    constraint.track_axis = "TRACK_NEGATIVE_Z"
    constraint.up_axis = "UP_Y"
    constraint.target = empty

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
    create_room()
