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

def create_test_image():
    """Create a simple test image file"""
    test_file = "test_image.jpg"
    
    # Create a simple test file (not a real image, but good enough for testing)
    with open(test_file, "w") as f:
        f.write("This is a test file for API testing")
    
    return test_file

def test_upload_endpoint():
    """Test file upload endpoint"""
    print_separator("TESTING UPLOAD ENDPOINT")
    
    # Create test file
    test_file = create_test_image()
    
    try:
        print(f"Uploading test file: {test_file}")
        
        # Upload the file
        with open(test_file, "rb") as f:
            files = {"files": (test_file, f, "image/jpeg")}
            response = requests.post(f"{BASE_URL}/api/v1/upload", files=files)
        
        print(f"Status: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        
        if response.status_code == 201:
            response_data = response.json()
            nodeodm_task_id = response_data["nodeodm_task_id"]
            print(f"✅ Upload successful! NodeODM Task ID: {nodeodm_task_id}")
            return nodeodm_task_id
        else:
            print(f"❌ Upload failed with status {response.status_code}")
            return None
    
    except Exception as e:
        print(f"❌ ERROR: {e}")
        return None
    
    finally:
        # Clean up test file
        if os.path.exists(test_file):
            os.remove(test_file)
            print(f"Cleaned up test file: {test_file}")

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
    
    # Test 2: Upload endpoint
    nodeodm_task_id = test_upload_endpoint()
    
    # Test 3: Upload status
    test_upload_status(nodeodm_task_id)
    
    print_separator("TESTING COMPLETE")
    print("✅ All tests completed!")

if __name__ == "__main__":
    main()
