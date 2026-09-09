import math
import os

import bpy
from mathutils import Vector


ROOT = "/Users/xuli/workspace/yexLing.github.io"
OUT = os.path.join(ROOT, "public/images/news/ai-wrist-rest")
DL = os.path.join(ROOT, "public/downloads/ai-wrist-rest")


def reset_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 1800
    scene.render.resolution_y = 1100
    scene.eevee.taa_render_samples = 96
    scene.view_settings.view_transform = "Filmic"
    scene.view_settings.look = "Medium High Contrast"
    scene.world = bpy.data.worlds.new("warm studio world")
    scene.world.color = (0.55, 0.53, 0.5)


def material(name, color, roughness=0.82):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    mat.diffuse_color = color
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = color
        bsdf.inputs["Roughness"].default_value = roughness
    return mat


def import_stl(path, name, mat, offset=(0, 0, 0)):
    bpy.ops.wm.stl_import(filepath=path)
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(mat)
    obj.location.x += offset[0]
    obj.location.y += offset[1]
    obj.location.z += offset[2]
    for poly in obj.data.polygons:
        poly.use_smooth = True
    mod = obj.modifiers.new("weighted render normals", "WEIGHTED_NORMAL")
    mod.keep_sharp = True
    return obj


def look_at(obj, target):
    direction = Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def add_camera(objects, name, output, angle="hero"):
    mins = Vector((9999, 9999, 9999))
    maxs = Vector((-9999, -9999, -9999))
    for obj in objects:
        for corner in obj.bound_box:
            world = obj.matrix_world @ Vector(corner)
            mins.x = min(mins.x, world.x)
            mins.y = min(mins.y, world.y)
            mins.z = min(mins.z, world.z)
            maxs.x = max(maxs.x, world.x)
            maxs.y = max(maxs.y, world.y)
            maxs.z = max(maxs.z, world.z)
    center = (mins + maxs) * 0.5

    bpy.ops.object.light_add(type="AREA", location=(center.x - 80, center.y - 210, center.z + 170))
    key = bpy.context.object
    key.name = "softbox key"
    key.data.energy = 1200
    key.data.size = 170

    bpy.ops.object.light_add(type="AREA", location=(center.x + 180, center.y + 100, center.z + 90))
    fill = bpy.context.object
    fill.name = "thin rim fill"
    fill.data.energy = 420
    fill.data.size = 120

    if angle == "split":
        cam_loc = (center.x, center.y - 310, center.z + 155)
        ortho = max(maxs.x - mins.x, maxs.y - mins.y) * 1.28
    else:
        cam_loc = (center.x + 55, center.y - 285, center.z + 135)
        ortho = max(maxs.x - mins.x, maxs.y - mins.y) * 1.12

    bpy.ops.object.camera_add(location=cam_loc)
    cam = bpy.context.object
    cam.name = name
    cam.data.type = "ORTHO"
    cam.data.ortho_scale = ortho
    look_at(cam, (center.x, center.y, center.z + 6))
    bpy.context.scene.camera = cam
    bpy.context.scene.render.filepath = output
    bpy.ops.render.render(write_still=True)


def render_full():
    reset_scene()
    graphite = material("matte graphite PLA", (0.16, 0.15, 0.135, 1.0))
    obj = import_stl(
        os.path.join(DL, "ajazz-aks075-ai-wrist-rest-full.stl"),
        "one-piece reference wrist rest",
        graphite,
    )
    add_camera([obj], "full render camera", os.path.join(OUT, "wrist-rest-full-render.png"))


def render_split():
    reset_scene()
    graphite = material("matte graphite PLA", (0.16, 0.15, 0.135, 1.0))
    accent = material("connector edge graphite", (0.22, 0.205, 0.18, 1.0))
    left = import_stl(
        os.path.join(DL, "ajazz-aks075-ai-wrist-rest-left-fused.stl"),
        "left split fused tenons",
        graphite,
        offset=(0, -38, 0),
    )
    right = import_stl(
        os.path.join(DL, "ajazz-aks075-ai-wrist-rest-right.stl"),
        "right split mortises",
        accent,
        offset=(0, 48, 0),
    )
    add_camera([left, right], "split render camera", os.path.join(OUT, "wrist-rest-split-render.png"), angle="split")


os.makedirs(OUT, exist_ok=True)
render_full()
render_split()
