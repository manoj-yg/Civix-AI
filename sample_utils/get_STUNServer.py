import requests

GEO_LOC_URL = "https://raw.githubusercontent.com/pradt2/always-online-stun/master/geoip_cache.txt"
IPV4_URL = "https://raw.githubusercontent.com/pradt2/always-online-stun/master/valid_ipv4s.txt"
GEO_USER_URL = "https://geolocation-db.com/json"
DEFAULT_STUN_SERVER = "stun.l.google.com:19302"

def getSTUNServer():
    try:
        # Fetch geoLocs data
        response = requests.get(GEO_LOC_URL, timeout=5)
        geoLocs = response.json()

        # Fetch latitude and longitude
        response = requests.get(GEO_USER_URL, timeout=5)
        user_data = response.json()
        latitude, longitude = user_data.get("latitude", 0), user_data.get("longitude", 0)

        # Fetch and process IPV4 data
        response = requests.get(IPV4_URL, timeout=5)
        ip_addresses = [line.strip() for line in response.text.strip().split('\n') if line.strip()]

        if not ip_addresses:
            return DEFAULT_STUN_SERVER

        # Find the closest STUN server
        def calculate_distance(addr):
            stunLat, stunLon = geoLocs.get(addr.split(':')[0], (0, 0))
            dist = ((latitude - stunLat) ** 2 + (longitude - stunLon) ** 2) ** 0.5
            return addr, dist

        closest_addr, _ = min(map(calculate_distance, ip_addresses), key=lambda x: x[1])
        return closest_addr
    except Exception as e:
        # Fallback to standard Google STUN server if any network request fails
        return DEFAULT_STUN_SERVER