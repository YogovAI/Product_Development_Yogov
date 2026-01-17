import requests
import json

BASE_URL = "http://localhost:8002"

def test_data_source():
    # Test creating a data source
    payload = {
        "name": "Test Postgre",
        "source_type": "RDBMS",
        "type": "database",
        "connection_details": {
            "User Name": "testuser",
            "Host or IP Address": "localhost",
            "DB Name or Service Name": "testdb"
        }
    }
    
    print(f"Creating data source with payload: {json.dumps(payload, indent=2)}")
    try:
        response = requests.post(f"{BASE_URL}/sources/", json=payload)
        print(f"Response Status: {response.status_code}")
        print(f"Response Body: {response.text}")
        
        if response.status_code == 200:
            source_id = response.json().get("id")
            print(f"Successfully created source with ID: {source_id}")
            
            # Test listing
            print("\nFetching all sources...")
            list_response = requests.get(f"{BASE_URL}/sources/")
            print(f"List response Body: {list_response.text}")
        else:
            print("Failed to create source.")
            
    except Exception as e:
        print(f"Error during request: {e}")

if __name__ == "__main__":
    test_data_source()
