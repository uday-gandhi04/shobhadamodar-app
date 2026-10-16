import os
import sys
from PIL import Image, ImageDraw

def generate_assets():
    source_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../assets/branding/web-app-manifest-512x512.png"))
    res_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../android/app/src/main/res"))
    public_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../public"))

    if not os.path.exists(source_path):
        print(f"Error: Source image not found at {source_path}")
        sys.exit(1)

    print(f"Loading source logo from {source_path}...")
    source_img = Image.open(source_path).convert("RGBA")

    # Densities for legacy launcher icons: (dir_suffix, size)
    legacy_sizes = {
        "mdpi": 48,
        "hdpi": 72,
        "xhdpi": 96,
        "xxhdpi": 144,
        "xxxhdpi": 192,
    }

    # Densities for adaptive icon foreground: (dir_suffix, total_size, safe_size)
    adaptive_sizes = {
        "mdpi": (108, 72),
        "hdpi": (162, 108),
        "xhdpi": (216, 144),
        "xxhdpi": (324, 216),
        "xxxhdpi": (432, 288),
    }

    # Splash screen dimensions: (folder, width, height, logo_scale_fraction)
    splash_sizes = {
        "drawable": (480, 800),
        "drawable-port-mdpi": (320, 480),
        "drawable-port-hdpi": (480, 800),
        "drawable-port-xhdpi": (720, 1280),
        "drawable-port-xxhdpi": (960, 1600),
        "drawable-port-xxxhdpi": (1280, 1920),
        "drawable-land-mdpi": (480, 320),
        "drawable-land-hdpi": (800, 480),
        "drawable-land-xhdpi": (1280, 720),
        "drawable-land-xxhdpi": (1600, 960),
        "drawable-land-xxxhdpi": (1920, 1280),
    }

    # 1. Generate Legacy Launcher Icons (Square & Round)
    for density, size in legacy_sizes.items():
        mipmap_dir = os.path.join(res_dir, f"mipmap-{density}")
        os.makedirs(mipmap_dir, exist_ok=True)

        # Square Icon with subtle rounded rect background
        sq_img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        draw_sq = ImageDraw.Draw(sq_img)
        corner_r = int(size * 0.22)
        draw_sq.rounded_rectangle([0, 0, size - 1, size - 1], radius=corner_r, fill=(255, 255, 255, 255))
        
        # Inset logo by 12%
        logo_size = int(size * 0.80)
        resized_logo = source_img.resize((logo_size, logo_size), Image.Resampling.LANCZOS)
        offset = (size - logo_size) // 2
        sq_img.paste(resized_logo, (offset, offset), resized_logo)
        sq_img.save(os.path.join(mipmap_dir, "ic_launcher.png"), "PNG")

        # Round Icon with circle background
        round_img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        draw_round = ImageDraw.Draw(round_img)
        draw_round.ellipse([0, 0, size - 1, size - 1], fill=(255, 255, 255, 255))
        round_img.paste(resized_logo, (offset, offset), resized_logo)
        round_img.save(os.path.join(mipmap_dir, "ic_launcher_round.png"), "PNG")

        print(f"Generated legacy icons for mipmap-{density} ({size}x{size})")

    # 2. Generate Adaptive Icon Foregrounds
    for density, (total_size, safe_size) in adaptive_sizes.items():
        mipmap_dir = os.path.join(res_dir, f"mipmap-{density}")
        os.makedirs(mipmap_dir, exist_ok=True)

        fg_img = Image.new("RGBA", (total_size, total_size), (0, 0, 0, 0))
        resized_logo = source_img.resize((safe_size, safe_size), Image.Resampling.LANCZOS)
        offset = (total_size - safe_size) // 2
        fg_img.paste(resized_logo, (offset, offset), resized_logo)
        fg_img.save(os.path.join(mipmap_dir, "ic_launcher_foreground.png"), "PNG")
        print(f"Generated adaptive foreground for mipmap-{density} ({total_size}x{total_size}, logo {safe_size}x{safe_size})")

    # 3. Generate Splash Screens
    bg_color = (255, 255, 255, 255) # Clean crisp white matching brand and app startup
    for folder, (width, height) in splash_sizes.items():
        draw_folder = os.path.join(res_dir, folder)
        os.makedirs(draw_folder, exist_ok=True)

        splash_img = Image.new("RGBA", (width, height), bg_color)
        min_dim = min(width, height)
        # Logo diameter is 40% of the shortest dimension
        logo_dim = int(min_dim * 0.40)
        resized_logo = source_img.resize((logo_dim, logo_dim), Image.Resampling.LANCZOS)
        pos = ((width - logo_dim) // 2, (height - logo_dim) // 2)
        splash_img.paste(resized_logo, pos, resized_logo)

        # Convert to RGB for splash PNG to ensure wide Android compatibility
        final_splash = Image.new("RGB", (width, height), (255, 255, 255))
        final_splash.paste(splash_img, (0, 0), splash_img)
        final_splash.save(os.path.join(draw_folder, "splash.png"), "PNG")
        print(f"Generated splash screen for {folder} ({width}x{height})")

    # 4. Update Web Favicon & Web Icons in public/
    os.makedirs(public_dir, exist_ok=True)
    icon_192 = source_img.resize((192, 192), Image.Resampling.LANCZOS)
    icon_192.save(os.path.join(public_dir, "apple-touch-icon.png"), "PNG")
    source_img.resize((96, 96), Image.Resampling.LANCZOS).save(os.path.join(public_dir, "favicon-96x96.png"), "PNG")
    source_img.resize((32, 32), Image.Resampling.LANCZOS).save(os.path.join(public_dir, "favicon.ico"), "ICO")
    print("Updated web icons in public/.")

    print("\nAll native Android icons, adaptive foregrounds, and splash screens generated successfully!")

if __name__ == "__main__":
    generate_assets()
