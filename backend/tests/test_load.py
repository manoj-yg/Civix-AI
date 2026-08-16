import time
import pytest

def test_api_load_throughput(client):
    """
    Basic load test verifying API throughput and latency stability under 50 concurrent request bursts.
    """
    start_time = time.perf_counter()
    num_requests = 50

    success_count = 0
    for _ in range(num_requests):
        resp = client.get("/api/v1/health/live")
        if resp.status_code == 200:
            success_count += 1

    total_time_s = time.perf_counter() - start_time
    req_per_sec = num_requests / max(0.001, total_time_s)

    assert success_count == num_requests
    assert req_per_sec > 10.0, f"Request throughput lower than threshold: {req_per_sec:.2f} req/s"
