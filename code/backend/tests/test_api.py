"""
API Testing Script for Drone Imagery Backend
Test all endpoints programmatically
"""

import requests
import json
import os
import time
from pathlib import Path
import pytest

# Base URL - change if your server runs on different port
BASE_URL = "http://localhost:8001"

def print_separator(title):
    """Print a nice separator for test sections"""
    print(f"\n{'='*50}")
    print(f" {title}")
    print(f"{'='*50}")

def test_health_endpoints():
    """Test health check endpoints"""
    print_separator("TESTING HEALTH ENDPOINTS")
    
    try:
        # Test root endpoint
        print("Testing root endpoint (/)...")
        response = requests.get(f"{BASE_URL}/")
        print(f"Status: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        
        # Test health endpoint
        print("\nTesting health endpoint (/health)...")
        response = requests.get(f"{BASE_URL}/health")
        print(f"Status: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        
    except requests.exceptions.ConnectionError:
        print("❌ ERROR: Could not connect to server. Make sure it's running on port 8001")
        return False
    except Exception as e:
        print(f"❌ ERROR: {e}")
        return False
    
    return True

def test_health_endpoints_pytest():
    """Test health check endpoints for pytest"""
    try:
        # Test root endpoint
        response = requests.get(f"{BASE_URL}/")
        assert response.status_code == 200
        
        # Test health endpoint
        response = requests.get(f"{BASE_URL}/health")
        assert response.status_code == 200
        
    except requests.exceptions.ConnectionError:
        pytest.fail("Could not connect to server. Make sure it's running on port 8001")
    except Exception as e:
        pytest.fail(f"Health test failed: {e}")



CHUNK_SIZE = 5 * 1024 * 1024  # 5MB, match backend default


def chunked_upload(test_files):
    """
    Upload files via chunked flow: init -> chunk (per file chunk) -> finalize.
    Returns (task_id, nodeodm_task_id) on success, or (None, None) on failure.
    """
    # 1. Init
    init_resp = requests.post(
        f"{BASE_URL}/api/v1/upload/init",
        data={},
    )
    if init_resp.status_code != 200:
        print(f"Init failed: {init_resp.status_code} {init_resp.text}")
        return None, None
    task_id = init_resp.json()["task_id"]

    file_list = []
    try:
        for test_file in test_files:
            size = test_file.stat().st_size
            total_chunks = (size + CHUNK_SIZE - 1) // CHUNK_SIZE
            file_list.append({
                "filename": test_file.name,
                "total_chunks": total_chunks,
                "size": size,
            })
            with open(test_file, "rb") as f:
                for ci in range(total_chunks):
                    chunk_data = f.read(CHUNK_SIZE)
                    chunk_resp = requests.post(
                        f"{BASE_URL}/api/v1/upload/chunk",
                        data={
                            "task_id": task_id,
                            "filename": test_file.name,
                            "chunk_index": ci,
                            "total_chunks": total_chunks,
                        },
                        files={"chunk": (test_file.name, chunk_data)},
                    )
                    if chunk_resp.status_code != 200:
                        print(f"Chunk failed: {chunk_resp.status_code} {chunk_resp.text}")
                        return None, None

        # 3. Finalize
        finalize_resp = requests.post(
            f"{BASE_URL}/api/v1/upload/finalize",
            data={
                "task_id": task_id,
                "files": json.dumps(file_list),
            },
        )
        if finalize_resp.status_code != 201:
            print(f"Finalize failed: {finalize_resp.status_code} {finalize_resp.text}")
            return None, None
        data = finalize_resp.json()
        return task_id, data.get("nodeodm_task_id")
    except Exception as e:
        print(f"Chunked upload error: {e}")
        return None, None


def test_upload_endpoint(max_files=None):
    """Test file upload endpoint with test images (chunked upload flow)"""
    print_separator("TESTING UPLOAD ENDPOINT")
    
    # Get test images from test_images folder
    test_images_dir = Path(__file__).parent / "test_images"
    all_test_files = list(test_images_dir.glob("*.JPG"))
    
    if not all_test_files:
        print("❌ No test images found in test_images folder")
        return None
    
    # Limit number of files if specified
    test_files = all_test_files[:max_files] if max_files else all_test_files
    print(f"Found {len(all_test_files)} total test images, uploading {len(test_files)} files (chunked)")
    
    try:
        task_id, nodeodm_task_id = chunked_upload(test_files)
        if nodeodm_task_id:
            print(f"✅ Upload successful! Task ID: {task_id}, NodeODM Task ID: {nodeodm_task_id}")
            return nodeodm_task_id
        print("❌ Upload failed")
        return None
    except Exception as e:
        print(f"❌ ERROR: {e}")
        return None

def test_upload_small_batch():
    """Test upload with just a few images (faster for testing)"""
    print_separator("TESTING UPLOAD ENDPOINT (SMALL BATCH)")
    return test_upload_endpoint(max_files=5)

def test_upload_status(nodeodm_task_id):
    """Test upload status endpoint"""
    if not nodeodm_task_id:
        print("❌ No NodeODM task ID provided for status test")
        return
    
    print_separator("TESTING UPLOAD STATUS")
    
    try:
        print(f"Checking status for task: {nodeodm_task_id}")
        response = requests.get(f"{BASE_URL}/api/v1/upload/{nodeodm_task_id}/status")
        
        print(f"Status: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        
        if response.status_code == 200:
            print("✅ Status check successful!")
        else:
            print(f"❌ Status check failed with status {response.status_code}")
    
    except Exception as e:
        print(f"❌ ERROR: {e}")


def main():
    """Main test function"""
    print("🚀 Starting API Tests for Drone Imagery Backend")
    print(f"Testing against: {BASE_URL}")
    
    # Test 1: Health endpoints
    if not test_health_endpoints():
        print("❌ Health tests failed. Make sure the server is running.")
        return
    
    # Test 2: Upload endpoint (you can choose between small batch or all images)
    print("\nChoose upload test:")
    print("1. Small batch (5 images) - faster for testing")
    print("2. All images (75+ images) - full test")
    
    choice = input("Enter choice (1 or 2, default 1): ").strip()
    
    if choice == "2":
        print("⚠️  WARNING: This will upload all test images and may take a long time to process!")
        confirm = input("Continue? (y/N): ").strip().lower()
        if confirm == 'y':
            nodeodm_task_id = test_upload_endpoint()  # All images
        else:
            print("Using small batch instead...")
            nodeodm_task_id = test_upload_small_batch()
    else:
        nodeodm_task_id = test_upload_small_batch()  # Default to small batch
    
    # Test 3: Upload status
    test_upload_status(nodeodm_task_id)
    
    print_separator("TESTING COMPLETE")
    print("✅ All tests completed!")

if __name__ == "__main__":
    main()
