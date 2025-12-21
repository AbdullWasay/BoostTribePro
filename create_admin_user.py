#!/usr/bin/env python3
"""
Create Admin User for BoostTribe Review
Creates the admin user with the specified credentials
"""

import requests
import json

# Configuration
BASE_URL = "https://boosttribe-app-1.preview.emergentagent.com/api"
HEADERS = {"Content-Type": "application/json"}

# Admin credentials from review request
ADMIN_USER_DATA = {
    "name": "BoostTribe Admin",
    "email": "contact.artboost@gmail.com",
    "password": "BoostTribe2024!"
}

def create_admin_user():
    """Create the admin user"""
    try:
        print(f"Creating admin user: {ADMIN_USER_DATA['email']}")
        
        response = requests.post(
            f"{BASE_URL}/auth/register",
            headers=HEADERS,
            json=ADMIN_USER_DATA
        )
        
        print(f"Registration response status: {response.status_code}")
        print(f"Registration response: {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            user = data.get("user", {})
            
            print(f"✅ Successfully created admin user:")
            print(f"   - Name: {user.get('name')}")
            print(f"   - Email: {user.get('email')}")
            print(f"   - Role: {user.get('role')}")
            print(f"   - User ID: {user.get('id')}")
            
            return True
        elif response.status_code == 400 and "already registered" in response.text:
            print(f"ℹ️  User already exists, trying to login...")
            
            # Try to login
            login_response = requests.post(
                f"{BASE_URL}/auth/login",
                headers=HEADERS,
                json={
                    "email": ADMIN_USER_DATA["email"],
                    "password": ADMIN_USER_DATA["password"]
                }
            )
            
            print(f"Login response status: {login_response.status_code}")
            print(f"Login response: {login_response.text}")
            
            if login_response.status_code == 200:
                data = login_response.json()
                user = data.get("user", {})
                
                print(f"✅ Successfully logged in existing user:")
                print(f"   - Name: {user.get('name')}")
                print(f"   - Email: {user.get('email')}")
                print(f"   - Role: {user.get('role')}")
                
                return True
            else:
                print(f"❌ Login failed: {login_response.text}")
                return False
        else:
            print(f"❌ Registration failed: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Exception: {str(e)}")
        return False

if __name__ == "__main__":
    success = create_admin_user()
    exit(0 if success else 1)