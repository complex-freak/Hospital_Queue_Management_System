import requests
import json

# Test the queue update endpoint
def test_queue_update():
    # First, let's get the current queue to see what appointments are available
    try:
        response = requests.get('http://localhost:8000/api/v1/staff/queue')
        print("Queue response status:", response.status_code)
        if response.status_code == 200:
            queue_data = response.json()
            print(f"Found {len(queue_data)} queue entries")
            if queue_data:
                # Use the first queue entry for testing
                first_entry = queue_data[0]
                appointment_id = first_entry.get('appointment_id')
                print(f"Testing with appointment ID: {appointment_id}")
                
                # Test the update endpoint
                update_data = {
                    "priority_score": 10,
                    "status": "waiting"
                }
                
                update_response = requests.put(
                    f'http://localhost:8000/api/v1/staff/queue/{appointment_id}',
                    json=update_data,
                    headers={'Content-Type': 'application/json'}
                )
                
                print("Update response status:", update_response.status_code)
                print("Update response:", update_response.text)
                
                if update_response.status_code == 200:
                    print("✅ Queue update successful!")
                else:
                    print("❌ Queue update failed!")
            else:
                print("No queue entries found to test with")
        else:
            print("Failed to get queue data")
    except Exception as e:
        print(f"Error testing queue update: {e}")

if __name__ == "__main__":
    test_queue_update() 