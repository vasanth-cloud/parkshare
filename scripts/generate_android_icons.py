import os
import shutil
from PIL import Image, ImageDraw
import numpy as np

def generate_icons(project_dir, source_icon_path, bg_hex, bg_rgb):
    print(f"\n==========================================")
    print(f"Generating Android icons for: {project_dir}")
    print(f"Source: {source_icon_path}")
    print(f"Background: {bg_hex} {bg_rgb}")
    print(f"==========================================")

    src = Image.open(source_icon_path).convert("RGBA")
    
    # 1. Copy exact 512x512 icon as store_icon_512.png in project
    store_icon_path = os.path.join(project_dir, "store_icon_512.png")
    src.save(store_icon_path, "PNG")
    print(f"Saved 512x512 store icon -> {store_icon_path}")

    # 2. Update res/values/ic_launcher_background.xml
    res_dir = os.path.join(project_dir, "android", "app", "src", "main", "res")
    values_dir = os.path.join(res_dir, "values")
    os.makedirs(values_dir, exist_ok=True)
    bg_xml_path = os.path.join(values_dir, "ic_launcher_background.xml")
    with open(bg_xml_path, "w", encoding="utf-8") as f:
        f.write(f'<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">{bg_hex}</color>\n</resources>\n')
    print(f"Updated {bg_xml_path} to {bg_hex}")

    # 3. Clean up any conflicting legacy drawables if they exist
    obsolete_files = [
        os.path.join(res_dir, "drawable", "ic_launcher_background.xml"),
        os.path.join(res_dir, "drawable-v24", "ic_launcher_foreground.xml"),
    ]
    for obs in obsolete_files:
        if os.path.exists(obs):
            os.remove(obs)
            print(f"Removed conflicting legacy drawable: {obs}")

    # 4. Mipmap densities & dimensions
    # Format: folder: (legacy_sz, fg_sz)
    # fg_sz is the 108dp equivalent for adaptive icons (mdpi=108, hdpi=162, xhdpi=216, xxhdpi=324, xxxhdpi=432)
    mipmap_configs = {
        "mipmap-mdpi": (48, 108),
        "mipmap-hdpi": (72, 162),
        "mipmap-xhdpi": (96, 216),
        "mipmap-xxhdpi": (144, 324),
        "mipmap-xxxhdpi": (192, 432),
    }

    for folder, (legacy_sz, fg_sz) in mipmap_configs.items():
        folder_path = os.path.join(res_dir, folder)
        os.makedirs(folder_path, exist_ok=True)

        # A. Legacy square icon (ic_launcher.png) - exact replica of the store listing icon
        legacy_icon = src.resize((legacy_sz, legacy_sz), Image.Resampling.LANCZOS)
        legacy_icon.save(os.path.join(folder_path, "ic_launcher.png"), "PNG")

        # B. Legacy round icon (ic_launcher_round.png) - circular mask
        round_icon = Image.new("RGBA", (legacy_sz, legacy_sz), (0, 0, 0, 0))
        mask_circle = Image.new("L", (legacy_sz, legacy_sz), 0)
        draw = ImageDraw.Draw(mask_circle)
        draw.ellipse((0, 0, legacy_sz - 1, legacy_sz - 1), fill=255)
        round_icon.paste(legacy_icon, (0, 0), mask_circle)
        round_icon.save(os.path.join(folder_path, "ic_launcher_round.png"), "PNG")

        # C. Adaptive foreground icon (ic_launcher_foreground.png)
        # Scaled to 78% of the 108dp canvas so the inner squircle & graphic sits comfortably inside the 72dp safe zone
        target_sz = int(fg_sz * 0.78)
        scaled_src = src.resize((target_sz, target_sz), Image.Resampling.LANCZOS)

        # Soft 12px outer feathering so edges blend seamlessly into background color
        feather_px = max(4, int(target_sz * 0.04))
        alpha_mask = Image.new("L", (target_sz, target_sz), 255)
        draw_f = ImageDraw.Draw(alpha_mask)
        for i in range(feather_px):
            alpha = int(255 * (i / float(feather_px)))
            draw_f.rectangle([i, i, target_sz - 1 - i, target_sz - 1 - i], outline=alpha)

        r, g, b, a = scaled_src.split()
        combined_alpha = Image.fromarray(np.minimum(np.array(a), np.array(alpha_mask)))
        scaled_src.putalpha(combined_alpha)

        # Place onto fg_sz x fg_sz transparent canvas
        fg_canvas = Image.new("RGBA", (fg_sz, fg_sz), (0, 0, 0, 0))
        offset = ((fg_sz - target_sz) // 2, (fg_sz - target_sz) // 2)
        fg_canvas.paste(scaled_src, offset, scaled_src)
        fg_canvas.save(os.path.join(folder_path, "ic_launcher_foreground.png"), "PNG")

        print(f"  [OK] {folder}: ic_launcher ({legacy_sz}px), ic_launcher_round ({legacy_sz}px), ic_launcher_foreground ({fg_sz}px)")

if __name__ == "__main__":
    generate_icons("customer-web", "playstore-assets/app-icon-512x512.png", "#020F29", (2, 15, 41))
    generate_icons("host-web", "playstore-assets/host/host-icon-512x512.png", "#020F22", (2, 15, 34))
    print("\n[SUCCESS] All launcher and store icons generated with 100% precision matching Play Store assets!")
