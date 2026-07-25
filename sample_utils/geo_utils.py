import requests
import datetime
from PIL import Image, ImageDraw, ImageFont
from PIL.ExifTags import TAGS, GPSTAGS
import cv2
import numpy as np
import streamlit as st
from streamlit_js_eval import get_geolocation

def get_device_gps_location():
    """
    Requests high-accuracy HTML5 device GPS location from the user's browser (mobile / desktop).
    Returns (lat, lon, accuracy, source_desc) or (None, None, None, error_desc).
    """
    try:
        geo_data = get_geolocation()
        if geo_data and "coords" in geo_data:
            coords = geo_data["coords"]
            lat = round(float(coords["latitude"]), 6)
            lon = round(float(coords["longitude"]), 6)
            acc = round(float(coords.get("accuracy", 0)), 1)
            return lat, lon, acc, f"Device Native GPS (Accuracy ±{acc}m)"
    except Exception:
        pass
    return None, None, None, "Device GPS Unavailable"

def extract_exif_location(pil_image):
    """
    Extracts GPS latitude and longitude from EXIF metadata of a PIL image if available.
    Returns (lat, lon) tuple or (None, None).
    """
    try:
        exif = pil_image._getexif()
        if not exif:
            return None, None
        
        gps_info = {}
        for key, val in exif.items():
            tag = TAGS.get(key)
            if tag == "GPSInfo":
                for gps_tag in val:
                    sub_tag = GPSTAGS.get(gps_tag, gps_tag)
                    gps_info[sub_tag] = val[gps_tag]
                    
        if "GPSLatitude" not in gps_info or "GPSLongitude" not in gps_info:
            return None, None

        def convert_to_degrees(value):
            d = float(value[0])
            m = float(value[1])
            s = float(value[2])
            return d + (m / 60.0) + (s / 3600.0)

        lat = convert_to_degrees(gps_info["GPSLatitude"])
        if gps_info.get("GPSLatitudeRef", "N") != "N":
            lat = -lat

        lon = convert_to_degrees(gps_info["GPSLongitude"])
        if gps_info.get("GPSLongitudeRef", "E") != "E":
            lon = -lon

        return round(lat, 6), round(lon, 6)
    except Exception:
        return None, None

def reverse_geocode(lat, lon):
    """
    Reverse geocodes coordinates to street address using OpenStreetMap Nominatim API.
    """
    if lat is None or lon is None:
        return "Unknown Address"
    try:
        url = f"https://nominatim.openstreetmap.org/reverse?format=json&lat={lat}&lon={lon}"
        headers = {"User-Agent": "Civix-AI-RoadDamageDetector/2.0"}
        resp = requests.get(url, headers=headers, timeout=3)
        if resp.status_code == 200:
            data = resp.json()
            display_name = data.get("display_name")
            if display_name:
                parts = [p.strip() for p in display_name.split(",")]
                return ", ".join(parts[:4])
    except Exception:
        pass
    return f"{lat:.6f}, {lon:.6f}"

def get_ip_location():
    """
    Fallback method to estimate location based on public IP address.
    """
    try:
        resp = requests.get("https://ipapi.co/json/", timeout=4)
        if resp.status_code == 200:
            data = resp.json()
            lat = data.get("latitude")
            lon = data.get("longitude")
            city = data.get("city", "Unknown City")
            country = data.get("country_name", "Unknown Country")
            if lat and lon:
                return float(lat), float(lon), f"{city}, {country} (IP Estimate)"
    except Exception:
        pass
    return None, None, "Unknown Location"

def get_google_maps_link(lat, lon):
    if lat is not None and lon is not None:
        return f"https://www.google.com/maps?q={lat},{lon}"
    return "#"

def tag_image_with_gps(image_input, lat, lon, loc_source="Device GPS", timestamp_str=None):
    """
    Watermarks/tags an image with a clear GPS location and timestamp banner overlay.
    Accepts PIL.Image or numpy.ndarray (RGB).
    Returns tagged RGB numpy.ndarray.
    """
    if isinstance(image_input, np.ndarray):
        img_pil = Image.fromarray(image_input).convert("RGB")
    else:
        img_pil = image_input.convert("RGB")

    w, h = img_pil.size
    banner_height = max(45, int(h * 0.07))

    # Create dark banner at bottom
    overlay = Image.new("RGBA", (w, banner_height), (0, 0, 0, 200))
    draw = ImageDraw.Draw(overlay)

    time_text = timestamp_str or datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    lat_str = f"{lat:.6f}" if lat is not None else "N/A"
    lon_str = f"{lon:.6f}" if lon is not None else "N/A"

    line1 = f"📍 LAT: {lat_str} | LON: {lon_str} ({loc_source})"
    line2 = f"📅 TIME: {time_text} | ROAD DAMAGE DETECTION"

    # Try loading default font
    try:
        font = ImageFont.load_default()
    except Exception:
        font = None

    draw.text((10, 5), line1, fill=(255, 220, 0, 255), font=font)
    draw.text((10, int(banner_height * 0.5)), line2, fill=(255, 255, 255, 255), font=font)

    # Composite banner onto bottom of main image
    final_img = img_pil.copy()
    final_img.paste(overlay, (0, h - banner_height), overlay)

    return np.array(final_img)
