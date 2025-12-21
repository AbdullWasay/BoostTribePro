#!/usr/bin/env python3
"""
BoostTribe Review Test Suite
Tests specific functionality requested in the review:
1. Admin login with contact.artboost@gmail.com / BoostTribe2024!
2. Password reset flow (forgot-password and reset-password)
3. Catalog CRUD operations
4. Public chat functionality (ad-chat)
5. API keys verification
"""

import requests
import json
import time
import os
from datetime import datetime, timezone

# Configuration
BASE_URL = "https://boosttribe-app-1.preview.emergentagent.com/api"
HEADERS = {"Content-Type": "application/json"}

# Admin credentials from review request
ADMIN_CREDENTIALS = {
    "email": "contact.artboost@gmail.com",
    "password": "BoostTribe2024!"
}

class BoostTribeReviewTestSuite:
    def __init__(self):
        self.session = requests.Session()
        self.admin_token = None
        self.test_results = []
        self.created_items = []
        self.chat_sessions = []
        
    def log_test(self, test_name, success, message, details=None):
        """Log test results"""
        result = {
            "test": test_name,
            "success": success,
            "message": message,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "details": details or {}
        }
        self.test_results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {message}")
        if details and not success:
            print(f"   Details: {details}")
    
    def test_admin_login(self):
        """Test 1: LOGIN ADMIN - Test login with provided admin credentials"""
        try:
            response = self.session.post(
                f"{BASE_URL}/auth/login",
                headers=HEADERS,
                json=ADMIN_CREDENTIALS
            )
            
            print(f"Login response status: {response.status_code}")
            print(f"Login response: {response.text}")
            
            if response.status_code == 200:
                data = response.json()
                
                if "user" in data and "token" in data:
                    user = data["user"]
                    
                    # Verify user is admin and has correct email
                    if (user.get("email") == ADMIN_CREDENTIALS["email"] and 
                        user.get("role") == "admin"):
                        
                        self.admin_token = data["token"]
                        self.log_test(
                            "Admin Login",
                            True,
                            f"Successfully logged in admin: {user['name']}",
                            {
                                "user_id": user["id"], 
                                "email": user["email"], 
                                "role": user["role"],
                                "token_received": bool(self.admin_token)
                            }
                        )
                        return True
                    else:
                        self.log_test(
                            "Admin Login",
                            False,
                            f"Login successful but user role/email incorrect. Expected admin role and {ADMIN_CREDENTIALS['email']}",
                            {"user_data": user}
                        )
                else:
                    self.log_test(
                        "Admin Login",
                        False,
                        "Response missing user or token fields",
                        {"response": data}
                    )
            else:
                self.log_test(
                    "Admin Login",
                    False,
                    f"Login failed with HTTP {response.status_code}",
                    {"response_text": response.text}
                )
                
        except Exception as e:
            self.log_test(
                "Admin Login",
                False,
                f"Exception during admin login: {str(e)}"
            )
        
        return False
    
    def test_forgot_password(self):
        """Test 2: FORGOT PASSWORD - Test password reset request"""
        try:
            forgot_data = {"email": ADMIN_CREDENTIALS["email"]}
            
            response = self.session.post(
                f"{BASE_URL}/auth/forgot-password",
                headers=HEADERS,
                json=forgot_data
            )
            
            print(f"Forgot password response status: {response.status_code}")
            print(f"Forgot password response: {response.text}")
            
            if response.status_code == 200:
                data = response.json()
                
                if "message" in data:
                    self.log_test(
                        "Forgot Password",
                        True,
                        "Password reset request successful",
                        {
                            "status_code": response.status_code,
                            "message": data.get("message"),
                            "email": ADMIN_CREDENTIALS["email"]
                        }
                    )
                    return True
                else:
                    self.log_test(
                        "Forgot Password",
                        False,
                        "Response missing message field",
                        {"response": data}
                    )
            else:
                self.log_test(
                    "Forgot Password",
                    False,
                    f"Forgot password failed with HTTP {response.status_code}",
                    {"response_text": response.text}
                )
                
        except Exception as e:
            self.log_test(
                "Forgot Password",
                False,
                f"Exception during forgot password: {str(e)}"
            )
        
        return False
    
    def test_reset_password_with_test_token(self):
        """Test 3: RESET PASSWORD - Test password reset with test token"""
        try:
            reset_data = {
                "token": "test-token",
                "new_password": "NewPassword123!"
            }
            
            response = self.session.post(
                f"{BASE_URL}/auth/reset-password",
                headers=HEADERS,
                json=reset_data
            )
            
            print(f"Reset password response status: {response.status_code}")
            print(f"Reset password response: {response.text}")
            
            # We expect this to fail with 400 (invalid token) which is correct behavior
            if response.status_code == 400:
                data = response.json()
                if "invalid" in data.get("detail", "").lower() or "expired" in data.get("detail", "").lower():
                    self.log_test(
                        "Reset Password (Test Token)",
                        True,
                        "Correctly rejected invalid test token",
                        {
                            "status_code": response.status_code,
                            "message": data.get("detail"),
                            "expected_behavior": "Should reject invalid tokens"
                        }
                    )
                    return True
                else:
                    self.log_test(
                        "Reset Password (Test Token)",
                        False,
                        "Got 400 status but wrong error message",
                        {"response": data}
                    )
            else:
                self.log_test(
                    "Reset Password (Test Token)",
                    False,
                    f"Expected 400 status for invalid token but got {response.status_code}",
                    {"response_text": response.text}
                )
                
        except Exception as e:
            self.log_test(
                "Reset Password (Test Token)",
                False,
                f"Exception during reset password: {str(e)}"
            )
        
        return False
    
    def test_create_catalog_item(self):
        """Test 4: CREATE CATALOG ITEM - Test creating a course"""
        if not self.admin_token:
            self.log_test("Create Catalog Item", False, "No admin token available")
            return False
        
        try:
            headers = {**HEADERS, "Authorization": f"Bearer {self.admin_token}"}
            
            course_data = {
                "title": "Test Cours Yoga",
                "description": "Cours de yoga pour débutants",
                "category": "course",
                "price": 50,
                "currency": "CHF"
            }
            
            response = self.session.post(
                f"{BASE_URL}/catalog",
                headers=headers,
                json=course_data
            )
            
            print(f"Create catalog response status: {response.status_code}")
            print(f"Create catalog response: {response.text}")
            
            if response.status_code == 200:
                data = response.json()
                
                if "id" in data:
                    # Store the created item ID for later deletion
                    self.created_items.append(data["id"])
                    
                    self.log_test(
                        "Create Catalog Item",
                        True,
                        f"Successfully created course: {course_data['title']}",
                        {
                            "item_id": data["id"],
                            "status_code": response.status_code,
                            "slug_generated": data.get("slug", "N/A")
                        }
                    )
                    return True
                else:
                    self.log_test(
                        "Create Catalog Item",
                        False,
                        "Course creation response missing ID",
                        {"response": data}
                    )
            elif response.status_code == 201:
                # Some APIs return 201 for creation
                data = response.json()
                if "id" in data:
                    self.created_items.append(data["id"])
                    self.log_test(
                        "Create Catalog Item",
                        True,
                        f"Successfully created course: {course_data['title']}",
                        {"item_id": data["id"], "status_code": response.status_code}
                    )
                    return True
            else:
                self.log_test(
                    "Create Catalog Item",
                    False,
                    f"Failed to create catalog item with HTTP {response.status_code}",
                    {"response_text": response.text}
                )
                
        except Exception as e:
            self.log_test(
                "Create Catalog Item",
                False,
                f"Exception during catalog creation: {str(e)}"
            )
        
        return False
    
    def test_list_catalog_items(self):
        """Test 5: LIST CATALOG ITEMS - Test retrieving catalog"""
        if not self.admin_token:
            self.log_test("List Catalog Items", False, "No admin token available")
            return False
        
        try:
            headers = {**HEADERS, "Authorization": f"Bearer {self.admin_token}"}
            
            response = self.session.get(f"{BASE_URL}/catalog", headers=headers)
            
            print(f"List catalog response status: {response.status_code}")
            print(f"List catalog response: {response.text[:500]}...")  # Truncate for readability
            
            if response.status_code == 200:
                data = response.json()
                
                if isinstance(data, list):
                    # Look for our created item
                    created_item_found = False
                    if self.created_items:
                        created_item_found = any(item.get("id") in self.created_items for item in data)
                    
                    self.log_test(
                        "List Catalog Items",
                        True,
                        f"Successfully retrieved {len(data)} catalog items",
                        {
                            "total_items": len(data),
                            "created_item_found": created_item_found,
                            "status_code": response.status_code
                        }
                    )
                    return True
                else:
                    self.log_test(
                        "List Catalog Items",
                        False,
                        f"Expected list but got {type(data)}",
                        {"response": data}
                    )
            else:
                self.log_test(
                    "List Catalog Items",
                    False,
                    f"Failed to list catalog items with HTTP {response.status_code}",
                    {"response_text": response.text}
                )
                
        except Exception as e:
            self.log_test(
                "List Catalog Items",
                False,
                f"Exception during catalog listing: {str(e)}"
            )
        
        return False
    
    def test_delete_catalog_item(self):
        """Test 6: DELETE CATALOG ITEM - Test deleting created item"""
        if not self.admin_token or not self.created_items:
            self.log_test("Delete Catalog Item", False, "No admin token or created items available")
            return False
        
        try:
            headers = {**HEADERS, "Authorization": f"Bearer {self.admin_token}"}
            item_id = self.created_items[0]
            
            response = self.session.delete(f"{BASE_URL}/catalog/{item_id}", headers=headers)
            
            print(f"Delete catalog response status: {response.status_code}")
            print(f"Delete catalog response: {response.text}")
            
            if response.status_code == 200:
                data = response.json()
                
                self.log_test(
                    "Delete Catalog Item",
                    True,
                    f"Successfully deleted catalog item: {item_id}",
                    {
                        "item_id": item_id,
                        "status_code": response.status_code,
                        "message": data.get("message", "No message")
                    }
                )
                return True
            else:
                self.log_test(
                    "Delete Catalog Item",
                    False,
                    f"Failed to delete catalog item with HTTP {response.status_code}",
                    {"response_text": response.text, "item_id": item_id}
                )
                
        except Exception as e:
            self.log_test(
                "Delete Catalog Item",
                False,
                f"Exception during catalog deletion: {str(e)}"
            )
        
        return False
    
    def test_start_public_chat(self):
        """Test 7: START PUBLIC CHAT - Test ad-chat start (public endpoint)"""
        try:
            chat_data = {
                "ad_id": "test-ad-123",
                "ad_platform": "facebook",
                "visitor_name": "Test User",
                "visitor_email": "test@test.com",
                "initial_message": "Bonjour, je cherche des cours de yoga"
            }
            
            response = self.session.post(
                f"{BASE_URL}/ad-chat/start",
                headers=HEADERS,
                json=chat_data
            )
            
            print(f"Start chat response status: {response.status_code}")
            print(f"Start chat response: {response.text}")
            
            if response.status_code == 200:
                data = response.json()
                
                if "chat_id" in data or "id" in data:
                    chat_id = data.get("chat_id") or data.get("id")
                    self.chat_sessions.append(chat_id)
                    
                    self.log_test(
                        "Start Public Chat",
                        True,
                        f"Successfully started chat session: {chat_id}",
                        {
                            "chat_id": chat_id,
                            "ad_platform": chat_data["ad_platform"],
                            "visitor_name": chat_data["visitor_name"],
                            "ai_response": data.get("ai_response", "No AI response")
                        }
                    )
                    return True
                else:
                    self.log_test(
                        "Start Public Chat",
                        False,
                        "Chat creation response missing chat_id",
                        {"response": data}
                    )
            else:
                self.log_test(
                    "Start Public Chat",
                    False,
                    f"Failed to start chat with HTTP {response.status_code}",
                    {"response_text": response.text}
                )
                
        except Exception as e:
            self.log_test(
                "Start Public Chat",
                False,
                f"Exception during chat start: {str(e)}"
            )
        
        return False
    
    def test_send_chat_message(self):
        """Test 8: SEND CHAT MESSAGE - Test sending message to chat"""
        if not self.chat_sessions:
            self.log_test("Send Chat Message", False, "No chat sessions available")
            return False
        
        try:
            chat_id = self.chat_sessions[0]
            message_data = {
                "sender": "visitor",
                "content": "Quels sont vos tarifs?"
            }
            
            response = self.session.post(
                f"{BASE_URL}/ad-chat/{chat_id}/message",
                headers=HEADERS,
                json=message_data
            )
            
            print(f"Send message response status: {response.status_code}")
            print(f"Send message response: {response.text}")
            
            if response.status_code == 200:
                data = response.json()
                
                self.log_test(
                    "Send Chat Message",
                    True,
                    f"Successfully sent message to chat: {chat_id}",
                    {
                        "chat_id": chat_id,
                        "message_content": message_data["content"],
                        "ai_response": data.get("ai_response", "No AI response"),
                        "status_code": response.status_code
                    }
                )
                return True
            else:
                self.log_test(
                    "Send Chat Message",
                    False,
                    f"Failed to send message with HTTP {response.status_code}",
                    {"response_text": response.text, "chat_id": chat_id}
                )
                
        except Exception as e:
            self.log_test(
                "Send Chat Message",
                False,
                f"Exception during message send: {str(e)}"
            )
        
        return False
    
    def test_verify_api_keys(self):
        """Test 9: VERIFY API KEYS - Check which API keys are configured"""
        try:
            # Check environment variables and backend configuration
            api_keys_status = {}
            
            # Check EMERGENT_LLM_KEY
            emergent_key = os.environ.get('EMERGENT_LLM_KEY')
            api_keys_status['EMERGENT_LLM_KEY'] = {
                'present': bool(emergent_key),
                'value': emergent_key[:20] + "..." if emergent_key else None
            }
            
            # Check RESEND_API_KEY
            resend_key = os.environ.get('RESEND_API_KEY')
            api_keys_status['RESEND_API_KEY'] = {
                'present': bool(resend_key),
                'value': resend_key[:20] + "..." if resend_key else None
            }
            
            # Check for Stripe keys (might be in backend .env)
            stripe_pub = os.environ.get('STRIPE_PUBLISHABLE_KEY')
            stripe_sec = os.environ.get('STRIPE_SECRET_KEY')
            api_keys_status['STRIPE_KEYS'] = {
                'publishable_present': bool(stripe_pub),
                'secret_present': bool(stripe_sec)
            }
            
            # Read backend .env file for additional keys
            try:
                with open('/app/backend/.env', 'r') as f:
                    env_content = f.read()
                    
                    # Check for keys in backend .env
                    if 'EMERGENT_LLM_KEY=' in env_content:
                        api_keys_status['EMERGENT_LLM_KEY']['in_backend_env'] = True
                    if 'RESEND_API_KEY=' in env_content:
                        api_keys_status['RESEND_API_KEY']['in_backend_env'] = True
                        
            except Exception as e:
                api_keys_status['env_file_error'] = str(e)
            
            # Count configured keys
            configured_keys = sum([
                api_keys_status['EMERGENT_LLM_KEY']['present'],
                api_keys_status['RESEND_API_KEY']['present'],
                api_keys_status['STRIPE_KEYS']['publishable_present'],
                api_keys_status['STRIPE_KEYS']['secret_present']
            ])
            
            self.log_test(
                "Verify API Keys",
                True,
                f"API Keys verification complete: {configured_keys}/4 keys configured",
                api_keys_status
            )
            return True
            
        except Exception as e:
            self.log_test(
                "Verify API Keys",
                False,
                f"Exception during API keys verification: {str(e)}"
            )
        
        return False
    
    def run_all_tests(self):
        """Run all BoostTribe review tests"""
        print("🚀 Starting BoostTribe Review Test Suite")
        print(f"📍 Testing against: {BASE_URL}")
        print(f"👤 Admin credentials: {ADMIN_CREDENTIALS['email']}")
        print("=" * 70)
        
        # Test sequence as specified in the review request
        tests = [
            ("1. Admin Login", self.test_admin_login),
            ("2. Forgot Password", self.test_forgot_password),
            ("3. Reset Password", self.test_reset_password_with_test_token),
            ("4. Create Catalog Item", self.test_create_catalog_item),
            ("5. List Catalog Items", self.test_list_catalog_items),
            ("6. Delete Catalog Item", self.test_delete_catalog_item),
            ("7. Start Public Chat", self.test_start_public_chat),
            ("8. Send Chat Message", self.test_send_chat_message),
            ("9. Verify API Keys", self.test_verify_api_keys)
        ]
        
        passed = 0
        total = len(tests)
        
        for test_name, test_func in tests:
            print(f"\n🧪 Running {test_name}...")
            success = test_func()
            if success:
                passed += 1
            time.sleep(1)  # Delay between tests
        
        print("\n" + "=" * 70)
        print(f"📊 FINAL RESULTS: {passed}/{total} tests passed ({(passed/total*100):.1f}%)")
        
        # Print summary by category
        print("\n📋 SUMMARY BY CATEGORY:")
        
        auth_tests = [r for r in self.test_results if "Login" in r["test"] or "Password" in r["test"]]
        auth_passed = sum(1 for r in auth_tests if r["success"])
        print(f"   🔐 Authentication: {auth_passed}/{len(auth_tests)} passed")
        
        catalog_tests = [r for r in self.test_results if "Catalog" in r["test"]]
        catalog_passed = sum(1 for r in catalog_tests if r["success"])
        print(f"   📦 Catalog CRUD: {catalog_passed}/{len(catalog_tests)} passed")
        
        chat_tests = [r for r in self.test_results if "Chat" in r["test"]]
        chat_passed = sum(1 for r in chat_tests if r["success"])
        print(f"   💬 Chat System: {chat_passed}/{len(chat_tests)} passed")
        
        api_tests = [r for r in self.test_results if "API" in r["test"]]
        api_passed = sum(1 for r in api_tests if r["success"])
        print(f"   🔑 API Keys: {api_passed}/{len(api_tests)} passed")
        
        if passed == total:
            print("\n🎉 ALL TESTS PASSED! BoostTribe system is working correctly.")
        else:
            print(f"\n⚠️  {total - passed} tests FAILED. See details above.")
            
            # Print failed tests
            failed_tests = [r for r in self.test_results if not r["success"]]
            if failed_tests:
                print("\n❌ FAILED TESTS:")
                for test in failed_tests:
                    print(f"   - {test['test']}: {test['message']}")
        
        return passed == total
    
    def get_detailed_report(self):
        """Get detailed test report for each endpoint"""
        report = {
            "summary": {
                "total_tests": len(self.test_results),
                "passed": sum(1 for r in self.test_results if r["success"]),
                "failed": sum(1 for r in self.test_results if not r["success"]),
                "success_rate": (sum(1 for r in self.test_results if r["success"]) / len(self.test_results) * 100) if self.test_results else 0
            },
            "test_results": self.test_results,
            "endpoints_tested": [
                "POST /api/auth/login",
                "POST /api/auth/forgot-password", 
                "POST /api/auth/reset-password",
                "POST /api/catalog",
                "GET /api/catalog",
                "DELETE /api/catalog/{id}",
                "POST /api/ad-chat/start",
                "POST /api/ad-chat/{id}/message"
            ],
            "api_keys_checked": [
                "EMERGENT_LLM_KEY",
                "RESEND_API_KEY", 
                "STRIPE_PUBLISHABLE_KEY",
                "STRIPE_SECRET_KEY"
            ]
        }
        
        return report


if __name__ == "__main__":
    # Run the test suite
    suite = BoostTribeReviewTestSuite()
    success = suite.run_all_tests()
    
    # Save detailed report
    report = suite.get_detailed_report()
    with open('/app/boosttribe_review_results.json', 'w') as f:
        json.dump(report, f, indent=2, default=str)
    
    print(f"\n📄 Detailed report saved to: /app/boosttribe_review_results.json")
    
    exit(0 if success else 1)