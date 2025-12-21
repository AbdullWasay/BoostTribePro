#!/usr/bin/env python3
"""
BoostTribe Phase 2 Backend Test Suite
Tests all 4 new backend modules: Gift Cards, Discounts, Referrals, Ad Chat
"""

import requests
import json
import time
from datetime import datetime, timezone, timedelta

# Configuration
BASE_URL = "https://boosttribe-app-1.preview.emergentagent.com/api"
HEADERS = {"Content-Type": "application/json"}

class GiftCardsTestSuite:
    def __init__(self):
        self.session = requests.Session()
        self.admin_token = None
        self.test_results = []
        self.gift_cards = []
        
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
    
    def setup_auth(self):
        """Setup authentication"""
        try:
            # Use existing test user or create new one
            login_data = {
                "email": "test@boosttribe.com",
                "password": "testpass123"
            }
            
            response = self.session.post(
                f"{BASE_URL}/auth/login",
                headers=HEADERS,
                json=login_data
            )
            
            if response.status_code == 200:
                data = response.json()
                self.admin_token = data["token"]
                return True
            else:
                # Create test user if doesn't exist
                register_data = {
                    "name": "Test User",
                    "email": "test@boosttribe.com",
                    "password": "testpass123"
                }
                
                response = self.session.post(
                    f"{BASE_URL}/auth/register",
                    headers=HEADERS,
                    json=register_data
                )
                
                if response.status_code == 200:
                    data = response.json()
                    self.admin_token = data["token"]
                    return True
        except Exception as e:
            self.log_test("Setup Auth", False, f"Auth setup failed: {str(e)}")
        return False
    
    def test_create_gift_card(self):
        """Test POST /api/gift-cards - Create gift card"""
        if not self.admin_token:
            self.log_test("Create Gift Card", False, "No admin token available")
            return False
        
        try:
            headers = {**HEADERS, "Authorization": f"Bearer {self.admin_token}"}
            
            # Calculate expiry date (1 year from now)
            expires_at = (datetime.now(timezone.utc) + timedelta(days=365)).isoformat()
            
            gift_card_data = {
                "amount": 100,
                "currency": "CHF",
                "recipient_name": "Marie Test",
                "recipient_email": "marie@test.com",
                "sender_name": "Test User",
                "sender_email": "test@boosttribe.com",
                "expires_at": expires_at,
                "design_color": "#8B5CF6"
            }
            
            response = self.session.post(
                f"{BASE_URL}/gift-cards",
                headers=headers,
                json=gift_card_data
            )
            
            if response.status_code == 200:
                data = response.json()
                
                if "code" in data and "id" in data:
                    self.gift_cards.append(data)
                    self.log_test(
                        "Create Gift Card",
                        True,
                        f"Successfully created gift card with code: {data['code']}",
                        {"gift_card_id": data["id"], "amount": data["amount"], "currency": data["currency"]}
                    )
                    return True
                else:
                    self.log_test("Create Gift Card", False, "Gift card created but missing code/id", {"response": data})
            else:
                self.log_test("Create Gift Card", False, f"Failed to create gift card: {response.status_code}", {"response": response.text})
        except Exception as e:
            self.log_test("Create Gift Card", False, f"Exception: {str(e)}")
        return False
    
    def test_list_gift_cards(self):
        """Test GET /api/gift-cards - List user's gift cards"""
        if not self.admin_token:
            self.log_test("List Gift Cards", False, "No admin token available")
            return False
        
        try:
            headers = {**HEADERS, "Authorization": f"Bearer {self.admin_token}"}
            
            response = self.session.get(
                f"{BASE_URL}/gift-cards",
                headers=headers
            )
            
            if response.status_code == 200:
                data = response.json()
                
                if isinstance(data, list) and len(data) > 0:
                    self.log_test(
                        "List Gift Cards",
                        True,
                        f"Successfully retrieved {len(data)} gift cards",
                        {"total_cards": len(data)}
                    )
                    return True
                else:
                    self.log_test("List Gift Cards", False, "No gift cards found or invalid response", {"response": data})
            else:
                self.log_test("List Gift Cards", False, f"Failed to list gift cards: {response.status_code}", {"response": response.text})
        except Exception as e:
            self.log_test("List Gift Cards", False, f"Exception: {str(e)}")
        return False
    
    def test_validate_gift_card(self):
        """Test GET /api/gift-cards/{code} - Validate gift card by code"""
        if not self.gift_cards:
            self.log_test("Validate Gift Card", False, "No gift cards available to validate")
            return False
        
        try:
            gift_card = self.gift_cards[0]
            code = gift_card["code"]
            
            response = self.session.get(
                f"{BASE_URL}/gift-cards/{code}",
                headers=HEADERS
            )
            
            if response.status_code == 200:
                data = response.json()
                
                if data.get("code") == code and "status" in data:
                    self.log_test(
                        "Validate Gift Card",
                        True,
                        f"Successfully validated gift card: {code}",
                        {"code": code, "status": data["status"], "amount": data.get("amount")}
                    )
                    return True
                else:
                    self.log_test("Validate Gift Card", False, "Gift card validated but data incorrect", {"response": data})
            else:
                self.log_test("Validate Gift Card", False, f"Failed to validate gift card: {response.status_code}", {"response": response.text})
        except Exception as e:
            self.log_test("Validate Gift Card", False, f"Exception: {str(e)}")
        return False
    
    def test_redeem_gift_card(self):
        """Test PATCH /api/gift-cards/{code}/redeem - Redeem gift card"""
        if not self.gift_cards:
            self.log_test("Redeem Gift Card", False, "No gift cards available to redeem")
            return False
        
        try:
            gift_card = self.gift_cards[0]
            code = gift_card["code"]
            
            redeem_data = {
                "redeemed_by_name": "Client Test",
                "redeemed_by_email": "client@test.com",
                "amount_to_use": 50  # Partial redemption
            }
            
            response = self.session.patch(
                f"{BASE_URL}/gift-cards/{code}/redeem",
                headers=HEADERS,
                json=redeem_data
            )
            
            if response.status_code == 200:
                data = response.json()
                
                if "remaining_balance" in data or "status" in data or "message" in data:
                    self.log_test(
                        "Redeem Gift Card",
                        True,
                        f"Successfully redeemed gift card: {code}",
                        {"code": code, "amount_used": redeem_data["amount_to_use"], "response": data}
                    )
                    return True
                else:
                    self.log_test("Redeem Gift Card", False, "Gift card redeemed but response incorrect", {"response": data})
            else:
                self.log_test("Redeem Gift Card", False, f"Failed to redeem gift card: {response.status_code}", {"response": response.text})
        except Exception as e:
            self.log_test("Redeem Gift Card", False, f"Exception: {str(e)}")
        return False
    
    def run_all_tests(self):
        """Run all gift card tests"""
        print("🎁 Starting Gift Cards Test Suite")
        print(f"📍 Testing against: {BASE_URL}")
        print("=" * 60)
        
        if not self.setup_auth():
            print("❌ Failed to setup authentication - aborting tests")
            return False
        
        tests = [
            self.test_create_gift_card,
            self.test_list_gift_cards,
            self.test_validate_gift_card,
            self.test_redeem_gift_card
        ]
        
        passed = 0
        total = len(tests)
        
        for test in tests:
            success = test()
            if success:
                passed += 1
            time.sleep(0.5)
        
        print("=" * 60)
        print(f"📊 Gift Cards Test Results: {passed}/{total} tests passed")
        return passed == total
    
    def get_summary(self):
        """Get test summary"""
        passed = sum(1 for result in self.test_results if result["success"])
        total = len(self.test_results)
        
        return {
            "total_tests": total,
            "passed": passed,
            "failed": total - passed,
            "success_rate": (passed / total * 100) if total > 0 else 0,
            "results": self.test_results
        }


class DiscountsTestSuite:
    def __init__(self):
        self.session = requests.Session()
        self.admin_token = None
        self.test_results = []
        self.discounts = []
        
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
    
    def setup_auth(self):
        """Setup authentication"""
        try:
            login_data = {
                "email": "test@boosttribe.com",
                "password": "testpass123"
            }
            
            response = self.session.post(
                f"{BASE_URL}/auth/login",
                headers=HEADERS,
                json=login_data
            )
            
            if response.status_code == 200:
                data = response.json()
                self.admin_token = data["token"]
                return True
        except Exception as e:
            self.log_test("Setup Auth", False, f"Auth setup failed: {str(e)}")
        return False
    
    def test_create_discount(self):
        """Test POST /api/discounts - Create discount"""
        if not self.admin_token:
            self.log_test("Create Discount", False, "No admin token available")
            return False
        
        try:
            headers = {**HEADERS, "Authorization": f"Bearer {self.admin_token}"}
            
            start_date = datetime.now(timezone.utc).isoformat()
            end_date = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
            
            discount_data = {
                "code": f"SUMMER{int(time.time())}",
                "discount_type": "percentage",
                "discount_value": 20,
                "name": "Summer Sale",
                "start_date": start_date,
                "end_date": end_date,
                "usage_limit": 100
            }
            
            response = self.session.post(
                f"{BASE_URL}/discounts",
                headers=headers,
                json=discount_data
            )
            
            if response.status_code == 200:
                data = response.json()
                
                if "id" in data and data.get("code").startswith("SUMMER"):
                    self.discounts.append(data)
                    self.log_test(
                        "Create Discount",
                        True,
                        f"Successfully created discount: {data['code']}",
                        {"discount_id": data["id"], "discount_value": data["discount_value"]}
                    )
                    return True
                else:
                    self.log_test("Create Discount", False, "Discount created but data incorrect", {"response": data})
            else:
                self.log_test("Create Discount", False, f"Failed to create discount: {response.status_code}", {"response": response.text})
        except Exception as e:
            self.log_test("Create Discount", False, f"Exception: {str(e)}")
        return False
    
    def test_list_discounts(self):
        """Test GET /api/discounts - List all discounts"""
        if not self.admin_token:
            self.log_test("List Discounts", False, "No admin token available")
            return False
        
        try:
            headers = {**HEADERS, "Authorization": f"Bearer {self.admin_token}"}
            
            response = self.session.get(
                f"{BASE_URL}/discounts",
                headers=headers
            )
            
            if response.status_code == 200:
                data = response.json()
                
                if isinstance(data, list):
                    self.log_test(
                        "List Discounts",
                        True,
                        f"Successfully retrieved {len(data)} discounts",
                        {"total_discounts": len(data)}
                    )
                    return True
                else:
                    self.log_test("List Discounts", False, "Invalid response format", {"response": data})
            else:
                self.log_test("List Discounts", False, f"Failed to list discounts: {response.status_code}", {"response": response.text})
        except Exception as e:
            self.log_test("List Discounts", False, f"Exception: {str(e)}")
        return False
    
    def test_get_specific_discount(self):
        """Test GET /api/discounts/{id} - Get specific discount"""
        if not self.discounts:
            self.log_test("Get Specific Discount", False, "No discounts available")
            return False
        
        try:
            headers = {**HEADERS, "Authorization": f"Bearer {self.admin_token}"}
            discount = self.discounts[0]
            
            response = self.session.get(
                f"{BASE_URL}/discounts/{discount['id']}",
                headers=headers
            )
            
            if response.status_code == 200:
                data = response.json()
                
                if data.get("id") == discount["id"]:
                    self.log_test(
                        "Get Specific Discount",
                        True,
                        f"Successfully retrieved discount: {data['code']}",
                        {"discount_id": data["id"], "code": data["code"]}
                    )
                    return True
                else:
                    self.log_test("Get Specific Discount", False, "Discount retrieved but data incorrect", {"response": data})
            else:
                self.log_test("Get Specific Discount", False, f"Failed to get discount: {response.status_code}", {"response": response.text})
        except Exception as e:
            self.log_test("Get Specific Discount", False, f"Exception: {str(e)}")
        return False
    
    def test_update_discount(self):
        """Test PATCH /api/discounts/{id} - Update discount"""
        if not self.discounts:
            self.log_test("Update Discount", False, "No discounts available")
            return False
        
        try:
            headers = {**HEADERS, "Authorization": f"Bearer {self.admin_token}"}
            discount = self.discounts[0]
            
            update_data = {
                "discount_value": 25,
                "is_active": True
            }
            
            response = self.session.patch(
                f"{BASE_URL}/discounts/{discount['id']}",
                headers=headers,
                json=update_data
            )
            
            if response.status_code == 200:
                data = response.json()
                
                if "message" in data or data.get("discount_value") == 25:
                    self.log_test(
                        "Update Discount",
                        True,
                        f"Successfully updated discount",
                        {"discount_id": discount["id"], "new_value": update_data["discount_value"]}
                    )
                    return True
                else:
                    self.log_test("Update Discount", False, "Discount updated but response incorrect", {"response": data})
            else:
                self.log_test("Update Discount", False, f"Failed to update discount: {response.status_code}", {"response": response.text})
        except Exception as e:
            self.log_test("Update Discount", False, f"Exception: {str(e)}")
        return False
    
    def test_validate_discount_code(self):
        """Test POST /api/discounts/validate - Validate discount code"""
        if not self.discounts:
            self.log_test("Validate Discount Code", False, "No discounts available")
            return False
        
        try:
            validate_data = {
                "code": self.discounts[0]["code"] if self.discounts else "TESTCODE",
                "contact_email": "test@test.com",
                "items": [],
                "subtotal": 100
            }
            
            response = self.session.post(
                f"{BASE_URL}/discounts/validate",
                headers=HEADERS,
                json=validate_data
            )
            
            if response.status_code == 200:
                data = response.json()
                
                if "discount_amount" in data or "valid" in data or "message" in data:
                    self.log_test(
                        "Validate Discount Code",
                        True,
                        f"Successfully validated discount code: {validate_data['code']}",
                        {"code": validate_data["code"], "response": data}
                    )
                    return True
                else:
                    self.log_test("Validate Discount Code", False, "Discount validated but response incorrect", {"response": data})
            else:
                self.log_test("Validate Discount Code", False, f"Failed to validate discount: {response.status_code}", {"response": response.text})
        except Exception as e:
            self.log_test("Validate Discount Code", False, f"Exception: {str(e)}")
        return False
    
    def test_delete_discount(self):
        """Test DELETE /api/discounts/{id} - Delete discount"""
        if not self.discounts:
            self.log_test("Delete Discount", False, "No discounts available")
            return False
        
        try:
            headers = {**HEADERS, "Authorization": f"Bearer {self.admin_token}"}
            discount = self.discounts[0]
            
            response = self.session.delete(
                f"{BASE_URL}/discounts/{discount['id']}",
                headers=headers
            )
            
            if response.status_code == 200:
                data = response.json()
                
                if "message" in data:
                    self.log_test(
                        "Delete Discount",
                        True,
                        f"Successfully deleted discount",
                        {"discount_id": discount["id"]}
                    )
                    return True
                else:
                    self.log_test("Delete Discount", False, "Discount deleted but response incorrect", {"response": data})
            else:
                self.log_test("Delete Discount", False, f"Failed to delete discount: {response.status_code}", {"response": response.text})
        except Exception as e:
            self.log_test("Delete Discount", False, f"Exception: {str(e)}")
        return False
    
    def test_create_fixed_discount(self):
        """Test POST /api/discounts - Create another discount for continued testing"""
        if not self.admin_token:
            self.log_test("Create Fixed Discount", False, "No admin token available")
            return False
        
        try:
            headers = {**HEADERS, "Authorization": f"Bearer {self.admin_token}"}
            
            start_date = datetime.now(timezone.utc).isoformat()
            end_date = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
            
            discount_data = {
                "code": f"FIXED{int(time.time())}",
                "discount_type": "fixed_amount",
                "discount_value": 50,
                "name": "Fixed 50 CHF Off",
                "start_date": start_date,
                "end_date": end_date,
                "usage_limit": 50
            }
            
            response = self.session.post(
                f"{BASE_URL}/discounts",
                headers=headers,
                json=discount_data
            )
            
            if response.status_code == 200:
                data = response.json()
                
                if "id" in data and data.get("code") == "FIXED50":
                    self.log_test(
                        "Create Fixed Discount",
                        True,
                        f"Successfully created fixed discount: {data['code']}",
                        {"discount_id": data["id"], "discount_type": data["discount_type"]}
                    )
                    return True
                else:
                    self.log_test("Create Fixed Discount", False, "Fixed discount created but data incorrect", {"response": data})
            else:
                self.log_test("Create Fixed Discount", False, f"Failed to create fixed discount: {response.status_code}", {"response": response.text})
        except Exception as e:
            self.log_test("Create Fixed Discount", False, f"Exception: {str(e)}")
        return False
    
    def run_all_tests(self):
        """Run all discount tests"""
        print("💰 Starting Discounts Test Suite")
        print(f"📍 Testing against: {BASE_URL}")
        print("=" * 60)
        
        if not self.setup_auth():
            print("❌ Failed to setup authentication - aborting tests")
            return False
        
        tests = [
            self.test_create_discount,
            self.test_list_discounts,
            self.test_get_specific_discount,
            self.test_update_discount,
            self.test_validate_discount_code,
            self.test_delete_discount,
            self.test_create_fixed_discount
        ]
        
        passed = 0
        total = len(tests)
        
        for test in tests:
            success = test()
            if success:
                passed += 1
            time.sleep(0.5)
        
        print("=" * 60)
        print(f"📊 Discounts Test Results: {passed}/{total} tests passed")
        return passed == total
    
    def get_summary(self):
        """Get test summary"""
        passed = sum(1 for result in self.test_results if result["success"])
        total = len(self.test_results)
        
        return {
            "total_tests": total,
            "passed": passed,
            "failed": total - passed,
            "success_rate": (passed / total * 100) if total > 0 else 0,
            "results": self.test_results
        }


class ReferralsTestSuite:
    def __init__(self):
        self.session = requests.Session()
        self.admin_token = None
        self.test_results = []
        self.referrals = []
        
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
    
    def setup_auth(self):
        """Setup authentication"""
        try:
            login_data = {
                "email": "test@boosttribe.com",
                "password": "testpass123"
            }
            
            response = self.session.post(
                f"{BASE_URL}/auth/login",
                headers=HEADERS,
                json=login_data
            )
            
            if response.status_code == 200:
                data = response.json()
                self.admin_token = data["token"]
                return True
        except Exception as e:
            self.log_test("Setup Auth", False, f"Auth setup failed: {str(e)}")
        return False
    
    def test_create_referral(self):
        """Test POST /api/referrals - Create referral invitation"""
        if not self.admin_token:
            self.log_test("Create Referral", False, "No admin token available")
            return False
        
        try:
            headers = {**HEADERS, "Authorization": f"Bearer {self.admin_token}"}
            
            referral_data = {
                "referred_email": f"friend{int(time.time())}@test.com",
                "referred_name": "Friend Test"
            }
            
            response = self.session.post(
                f"{BASE_URL}/referrals",
                headers=headers,
                json=referral_data
            )
            
            if response.status_code == 200:
                data = response.json()
                
                if "id" in data and "referral_code" in data and data.get("status") == "pending":
                    self.referrals.append(data)
                    self.log_test(
                        "Create Referral",
                        True,
                        f"Successfully created referral with code: {data['referral_code']}",
                        {"referral_id": data["id"], "status": data["status"], "referred_email": data["referred_email"]}
                    )
                    return True
                else:
                    self.log_test("Create Referral", False, "Referral created but data incorrect", {"response": data})
            else:
                self.log_test("Create Referral", False, f"Failed to create referral: {response.status_code}", {"response": response.text})
        except Exception as e:
            self.log_test("Create Referral", False, f"Exception: {str(e)}")
        return False
    
    def test_list_my_referrals(self):
        """Test GET /api/referrals/my-referrals - List user's referrals"""
        if not self.admin_token:
            self.log_test("List My Referrals", False, "No admin token available")
            return False
        
        try:
            headers = {**HEADERS, "Authorization": f"Bearer {self.admin_token}"}
            
            response = self.session.get(
                f"{BASE_URL}/referrals/my-referrals",
                headers=headers
            )
            
            if response.status_code == 200:
                data = response.json()
                
                if isinstance(data, list):
                    self.log_test(
                        "List My Referrals",
                        True,
                        f"Successfully retrieved {len(data)} referrals",
                        {"total_referrals": len(data)}
                    )
                    return True
                else:
                    self.log_test("List My Referrals", False, "Invalid response format", {"response": data})
            else:
                self.log_test("List My Referrals", False, f"Failed to list referrals: {response.status_code}", {"response": response.text})
        except Exception as e:
            self.log_test("List My Referrals", False, f"Exception: {str(e)}")
        return False
    
    def test_get_referral_stats(self):
        """Test GET /api/referrals/stats - Get referral statistics"""
        if not self.admin_token:
            self.log_test("Get Referral Stats", False, "No admin token available")
            return False
        
        try:
            headers = {**HEADERS, "Authorization": f"Bearer {self.admin_token}"}
            
            response = self.session.get(
                f"{BASE_URL}/referrals/stats",
                headers=headers
            )
            
            if response.status_code == 200:
                data = response.json()
                
                required_fields = ["total_referrals", "pending_referrals", "completed_referrals", "total_rewards_earned", "referral_code"]
                if all(field in data for field in required_fields):
                    self.log_test(
                        "Get Referral Stats",
                        True,
                        f"Successfully retrieved referral stats",
                        {"total_referrals": data["total_referrals"], "referral_code": data["referral_code"]}
                    )
                    return True
                else:
                    self.log_test("Get Referral Stats", False, "Stats retrieved but missing required fields", {"response": data})
            else:
                self.log_test("Get Referral Stats", False, f"Failed to get referral stats: {response.status_code}", {"response": response.text})
        except Exception as e:
            self.log_test("Get Referral Stats", False, f"Exception: {str(e)}")
        return False
    
    def test_complete_referral(self):
        """Test PATCH /api/referrals/{id}/complete - Mark referral complete"""
        if not self.referrals:
            self.log_test("Complete Referral", False, "No referrals available")
            return False
        
        try:
            headers = {**HEADERS, "Authorization": f"Bearer {self.admin_token}"}
            referral = self.referrals[0]
            
            response = self.session.patch(
                f"{BASE_URL}/referrals/{referral['id']}/complete",
                headers=headers
            )
            
            if response.status_code == 200:
                data = response.json()
                
                if "message" in data or data.get("status") == "completed":
                    self.log_test(
                        "Complete Referral",
                        True,
                        f"Successfully completed referral",
                        {"referral_id": referral["id"]}
                    )
                    return True
                else:
                    self.log_test("Complete Referral", False, "Referral completed but response incorrect", {"response": data})
            else:
                self.log_test("Complete Referral", False, f"Failed to complete referral: {response.status_code}", {"response": response.text})
        except Exception as e:
            self.log_test("Complete Referral", False, f"Exception: {str(e)}")
        return False
    
    def run_all_tests(self):
        """Run all referral tests"""
        print("👥 Starting Referrals Test Suite")
        print(f"📍 Testing against: {BASE_URL}")
        print("=" * 60)
        
        if not self.setup_auth():
            print("❌ Failed to setup authentication - aborting tests")
            return False
        
        tests = [
            self.test_create_referral,
            self.test_list_my_referrals,
            self.test_get_referral_stats,
            self.test_complete_referral
        ]
        
        passed = 0
        total = len(tests)
        
        for test in tests:
            success = test()
            if success:
                passed += 1
            time.sleep(0.5)
        
        print("=" * 60)
        print(f"📊 Referrals Test Results: {passed}/{total} tests passed")
        return passed == total
    
    def get_summary(self):
        """Get test summary"""
        passed = sum(1 for result in self.test_results if result["success"])
        total = len(self.test_results)
        
        return {
            "total_tests": total,
            "passed": passed,
            "failed": total - passed,
            "success_rate": (passed / total * 100) if total > 0 else 0,
            "results": self.test_results
        }


class AdChatTestSuite:
    def __init__(self):
        self.session = requests.Session()
        self.admin_token = None
        self.test_results = []
        self.ad_chats = []
        
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
    
    def setup_auth(self):
        """Setup authentication"""
        try:
            login_data = {
                "email": "test@boosttribe.com",
                "password": "testpass123"
            }
            
            response = self.session.post(
                f"{BASE_URL}/auth/login",
                headers=HEADERS,
                json=login_data
            )
            
            if response.status_code == 200:
                data = response.json()
                self.admin_token = data["token"]
                return True
        except Exception as e:
            self.log_test("Setup Auth", False, f"Auth setup failed: {str(e)}")
        return False
    
    def test_start_ad_chat(self):
        """Test POST /api/ad-chat/start - Start new ad chat (PUBLIC ENDPOINT)"""
        try:
            chat_data = {
                "ad_id": "test-ad-123",
                "ad_platform": "facebook",
                "visitor_name": "John Visitor",
                "visitor_email": "john@visitor.com",
                "initial_message": "Hi, I'm interested in your services"
            }
            
            response = self.session.post(
                f"{BASE_URL}/ad-chat/start",
                headers=HEADERS,
                json=chat_data
            )
            
            if response.status_code == 200:
                data = response.json()
                
                if "id" in data and "session_id" in data:
                    self.ad_chats.append(data)
                    self.log_test(
                        "Start Ad Chat",
                        True,
                        f"Successfully started ad chat with session: {data['session_id']}",
                        {"chat_id": data["id"], "ad_platform": data.get("ad_platform"), "visitor_name": data.get("visitor_name")}
                    )
                    return True
                else:
                    self.log_test("Start Ad Chat", False, "Chat started but missing id/session_id", {"response": data})
            else:
                self.log_test("Start Ad Chat", False, f"Failed to start ad chat: {response.status_code}", {"response": response.text})
        except Exception as e:
            self.log_test("Start Ad Chat", False, f"Exception: {str(e)}")
        return False
    
    def test_send_visitor_message(self):
        """Test POST /api/ad-chat/{id}/message - Send visitor message (PUBLIC)"""
        if not self.ad_chats:
            self.log_test("Send Visitor Message", False, "No ad chats available")
            return False
        
        try:
            chat = self.ad_chats[0]
            
            message_data = {
                "sender": "visitor",
                "content": "Can you tell me more about pricing?"
            }
            
            response = self.session.post(
                f"{BASE_URL}/ad-chat/{chat['id']}/message",
                headers=HEADERS,
                json=message_data
            )
            
            if response.status_code == 200:
                data = response.json()
                
                if "message" in data or "id" in data or "success" in str(data).lower():
                    self.log_test(
                        "Send Visitor Message",
                        True,
                        f"Successfully sent visitor message",
                        {"chat_id": chat["id"], "sender": message_data["sender"]}
                    )
                    return True
                else:
                    self.log_test("Send Visitor Message", False, "Message sent but response incorrect", {"response": data})
            else:
                self.log_test("Send Visitor Message", False, f"Failed to send visitor message: {response.status_code}", {"response": response.text})
        except Exception as e:
            self.log_test("Send Visitor Message", False, f"Exception: {str(e)}")
        return False
    
    def test_send_agent_message(self):
        """Test POST /api/ad-chat/{id}/message - Send agent message (AUTH REQUIRED)"""
        if not self.ad_chats or not self.admin_token:
            self.log_test("Send Agent Message", False, "No ad chats or admin token available")
            return False
        
        try:
            headers = {**HEADERS, "Authorization": f"Bearer {self.admin_token}"}
            chat = self.ad_chats[0]
            
            message_data = {
                "sender": "agent",
                "content": "Sure! Our pricing starts at 49 CHF/month"
            }
            
            response = self.session.post(
                f"{BASE_URL}/ad-chat/{chat['id']}/message",
                headers=headers,
                json=message_data
            )
            
            if response.status_code == 200:
                data = response.json()
                
                if "message" in data or "id" in data or "success" in str(data).lower():
                    self.log_test(
                        "Send Agent Message",
                        True,
                        f"Successfully sent agent message",
                        {"chat_id": chat["id"], "sender": message_data["sender"]}
                    )
                    return True
                else:
                    self.log_test("Send Agent Message", False, "Agent message sent but response incorrect", {"response": data})
            else:
                self.log_test("Send Agent Message", False, f"Failed to send agent message: {response.status_code}", {"response": response.text})
        except Exception as e:
            self.log_test("Send Agent Message", False, f"Exception: {str(e)}")
        return False
    
    def test_list_chats(self):
        """Test GET /api/ad-chat - List all chats (AUTH REQUIRED)"""
        if not self.admin_token:
            self.log_test("List Chats", False, "No admin token available")
            return False
        
        try:
            headers = {**HEADERS, "Authorization": f"Bearer {self.admin_token}"}
            
            response = self.session.get(
                f"{BASE_URL}/ad-chat",
                headers=headers
            )
            
            if response.status_code == 200:
                data = response.json()
                
                if isinstance(data, list):
                    self.log_test(
                        "List Chats",
                        True,
                        f"Successfully retrieved {len(data)} chats",
                        {"total_chats": len(data)}
                    )
                    return True
                else:
                    self.log_test("List Chats", False, "Invalid response format", {"response": data})
            else:
                self.log_test("List Chats", False, f"Failed to list chats: {response.status_code}", {"response": response.text})
        except Exception as e:
            self.log_test("List Chats", False, f"Exception: {str(e)}")
        return False
    
    def test_filter_chats_by_status(self):
        """Test GET /api/ad-chat?status=active - Filter chats by status"""
        if not self.admin_token:
            self.log_test("Filter Chats by Status", False, "No admin token available")
            return False
        
        try:
            headers = {**HEADERS, "Authorization": f"Bearer {self.admin_token}"}
            
            response = self.session.get(
                f"{BASE_URL}/ad-chat?status=active",
                headers=headers
            )
            
            if response.status_code == 200:
                data = response.json()
                
                if isinstance(data, list):
                    self.log_test(
                        "Filter Chats by Status",
                        True,
                        f"Successfully filtered chats by status: {len(data)} active chats",
                        {"active_chats": len(data)}
                    )
                    return True
                else:
                    self.log_test("Filter Chats by Status", False, "Invalid response format", {"response": data})
            else:
                self.log_test("Filter Chats by Status", False, f"Failed to filter chats: {response.status_code}", {"response": response.text})
        except Exception as e:
            self.log_test("Filter Chats by Status", False, f"Exception: {str(e)}")
        return False
    
    def test_get_specific_chat(self):
        """Test GET /api/ad-chat/{id} - Get specific chat (AUTH REQUIRED)"""
        if not self.ad_chats or not self.admin_token:
            self.log_test("Get Specific Chat", False, "No ad chats or admin token available")
            return False
        
        try:
            headers = {**HEADERS, "Authorization": f"Bearer {self.admin_token}"}
            chat = self.ad_chats[0]
            
            response = self.session.get(
                f"{BASE_URL}/ad-chat/{chat['id']}",
                headers=headers
            )
            
            if response.status_code == 200:
                data = response.json()
                
                if data.get("id") == chat["id"] and "messages" in data:
                    self.log_test(
                        "Get Specific Chat",
                        True,
                        f"Successfully retrieved chat with messages",
                        {"chat_id": data["id"], "message_count": len(data.get("messages", []))}
                    )
                    return True
                else:
                    self.log_test("Get Specific Chat", False, "Chat retrieved but data incorrect", {"response": data})
            else:
                self.log_test("Get Specific Chat", False, f"Failed to get specific chat: {response.status_code}", {"response": response.text})
        except Exception as e:
            self.log_test("Get Specific Chat", False, f"Exception: {str(e)}")
        return False
    
    def test_update_chat(self):
        """Test PATCH /api/ad-chat/{id} - Update chat details (AUTH REQUIRED)"""
        if not self.ad_chats or not self.admin_token:
            self.log_test("Update Chat", False, "No ad chats or admin token available")
            return False
        
        try:
            headers = {**HEADERS, "Authorization": f"Bearer {self.admin_token}"}
            chat = self.ad_chats[0]
            
            update_data = {
                "status": "resolved",
                "priority": "high",
                "lead_score": 85
            }
            
            response = self.session.patch(
                f"{BASE_URL}/ad-chat/{chat['id']}",
                headers=headers,
                json=update_data
            )
            
            if response.status_code == 200:
                data = response.json()
                
                if "message" in data or data.get("status") == "resolved":
                    self.log_test(
                        "Update Chat",
                        True,
                        f"Successfully updated chat",
                        {"chat_id": chat["id"], "new_status": update_data["status"], "lead_score": update_data["lead_score"]}
                    )
                    return True
                else:
                    self.log_test("Update Chat", False, "Chat updated but response incorrect", {"response": data})
            else:
                self.log_test("Update Chat", False, f"Failed to update chat: {response.status_code}", {"response": response.text})
        except Exception as e:
            self.log_test("Update Chat", False, f"Exception: {str(e)}")
        return False
    
    def test_convert_chat_to_contact(self):
        """Test POST /api/ad-chat/{id}/convert - Convert chat to contact (AUTH REQUIRED)"""
        if not self.ad_chats or not self.admin_token:
            self.log_test("Convert Chat to Contact", False, "No ad chats or admin token available")
            return False
        
        try:
            headers = {**HEADERS, "Authorization": f"Bearer {self.admin_token}"}
            chat = self.ad_chats[0]
            
            response = self.session.post(
                f"{BASE_URL}/ad-chat/{chat['id']}/convert",
                headers=headers
            )
            
            if response.status_code == 200:
                data = response.json()
                
                if "contact_id" in data or "message" in data:
                    self.log_test(
                        "Convert Chat to Contact",
                        True,
                        f"Successfully converted chat to contact",
                        {"chat_id": chat["id"], "response": data}
                    )
                    return True
                else:
                    self.log_test("Convert Chat to Contact", False, "Chat converted but response incorrect", {"response": data})
            else:
                self.log_test("Convert Chat to Contact", False, f"Failed to convert chat: {response.status_code}", {"response": response.text})
        except Exception as e:
            self.log_test("Convert Chat to Contact", False, f"Exception: {str(e)}")
        return False
    
    def run_all_tests(self):
        """Run all ad chat tests"""
        print("💬 Starting Ad Chat Test Suite")
        print(f"📍 Testing against: {BASE_URL}")
        print("=" * 60)
        
        if not self.setup_auth():
            print("❌ Failed to setup authentication - aborting tests")
            return False
        
        tests = [
            self.test_start_ad_chat,
            self.test_send_visitor_message,
            self.test_send_agent_message,
            self.test_list_chats,
            self.test_filter_chats_by_status,
            self.test_get_specific_chat,
            self.test_update_chat,
            self.test_convert_chat_to_contact
        ]
        
        passed = 0
        total = len(tests)
        
        for test in tests:
            success = test()
            if success:
                passed += 1
            time.sleep(0.5)
        
        print("=" * 60)
        print(f"📊 Ad Chat Test Results: {passed}/{total} tests passed")
        return passed == total
    
    def get_summary(self):
        """Get test summary"""
        passed = sum(1 for result in self.test_results if result["success"])
        total = len(self.test_results)
        
        return {
            "total_tests": total,
            "passed": passed,
            "failed": total - passed,
            "success_rate": (passed / total * 100) if total > 0 else 0,
            "results": self.test_results
        }


if __name__ == "__main__":
    print("🧪 COMPREHENSIVE BACKEND TESTING - BOOSTTRIBE PHASE 2 MODULES")
    print("=" * 80)
    
    all_results = {}
    
    # Test Phase 2 New Modules
    print("\n🎁 MODULE 1: GIFT CARDS")
    gift_cards_suite = GiftCardsTestSuite()
    gift_cards_success = gift_cards_suite.run_all_tests()
    all_results["gift_cards"] = gift_cards_suite.get_summary()
    
    print("\n💰 MODULE 2: DISCOUNTS")
    discounts_suite = DiscountsTestSuite()
    discounts_success = discounts_suite.run_all_tests()
    all_results["discounts"] = discounts_suite.get_summary()
    
    print("\n👥 MODULE 3: REFERRALS")
    referrals_suite = ReferralsTestSuite()
    referrals_success = referrals_suite.run_all_tests()
    all_results["referrals"] = referrals_suite.get_summary()
    
    print("\n💬 MODULE 4: AD CHAT")
    ad_chat_suite = AdChatTestSuite()
    ad_chat_success = ad_chat_suite.run_all_tests()
    all_results["ad_chat"] = ad_chat_suite.get_summary()
    
    # Overall Summary
    print("\n" + "=" * 80)
    print("📊 BOOSTTRIBE PHASE 2 TEST SUMMARY")
    print("=" * 80)
    
    total_tests = sum(result["total_tests"] for result in all_results.values())
    total_passed = sum(result["passed"] for result in all_results.values())
    overall_success_rate = (total_passed / total_tests * 100) if total_tests > 0 else 0
    
    for module, result in all_results.items():
        status = "✅" if result["failed"] == 0 else "❌"
        print(f"{status} {module.upper()}: {result['passed']}/{result['total_tests']} ({result['success_rate']:.1f}%)")
    
    print(f"\n🎯 OVERALL: {total_passed}/{total_tests} tests passed ({overall_success_rate:.1f}%)")
    
    # Save detailed results
    with open("/app/phase2_test_results.json", "w") as f:
        json.dump(all_results, f, indent=2, default=str)
    
    print(f"📄 Detailed results saved to: /app/phase2_test_results.json")
    
    if overall_success_rate >= 80:
        print("🎉 BOOSTTRIBE PHASE 2 BACKEND TESTING SUCCESSFUL!")
    else:
        print("⚠️  BOOSTTRIBE PHASE 2 BACKEND TESTING NEEDS ATTENTION")
        
    print("=" * 80)