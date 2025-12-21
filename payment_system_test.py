#!/usr/bin/env python3
"""
Payment System Test Suite - Complete Payment Testing
Tests all payment-related endpoints and functionality
"""

import requests
import json
import time
from datetime import datetime, timezone

# Configuration
BASE_URL = "https://boosttribe-app-1.preview.emergentagent.com/api"
HEADERS = {"Content-Type": "application/json"}

# Test data
ADMIN_USER = {
    "name": "Sarah Martinez",
    "email": "sarah.martinez@afroboost.com", 
    "password": "admin123"
}

class PaymentSystemTestSuite:
    def __init__(self):
        self.session = requests.Session()
        self.admin_token = None
        self.test_results = []
        self.catalog_items = []
        
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
    
    def setup_admin_auth(self):
        """Setup admin authentication"""
        try:
            # Try to login with existing admin credentials
            login_data = {
                "email": ADMIN_USER["email"],
                "password": ADMIN_USER["password"]
            }
            
            response = self.session.post(
                f"{BASE_URL}/auth/login",
                headers=HEADERS,
                json=login_data
            )
            
            if response.status_code == 200:
                data = response.json()
                user_role = data.get("user", {}).get("role")
                
                if user_role == "admin":
                    self.admin_token = data["token"]
                    self.log_test(
                        "Setup Admin Authentication",
                        True,
                        f"Admin authenticated: {data['user']['name']}",
                        {"user_id": data["user"]["id"], "role": data["user"]["role"]}
                    )
                    return True
                else:
                    # User is not admin, but we can still test some endpoints
                    self.admin_token = data["token"]  # Use regular user token for available tests
                    self.log_test(
                        "Setup Admin Authentication",
                        True,
                        f"User authenticated (not admin): {data['user']['name']} - will test available endpoints",
                        {"user_id": data["user"]["id"], "role": user_role, "note": "Limited admin testing"}
                    )
                    return True
            else:
                self.log_test(
                    "Setup Admin Authentication",
                    False,
                    f"Login failed: {response.status_code}",
                    {"response": response.text}
                )
                
        except Exception as e:
            self.log_test(
                "Setup Admin Authentication",
                False,
                f"Exception during auth setup: {str(e)}"
            )
        
        return False
    
    def test_create_published_product(self):
        """Test 1: Create a published product for payment testing"""
        if not self.admin_token:
            self.log_test("Create Published Product", False, "No admin token available")
            return False
        
        try:
            headers = {**HEADERS, "Authorization": f"Bearer {self.admin_token}"}
            
            product_data = {
                "title": "Cours Test Paiement",
                "description": "Test",
                "category": "course",
                "price": 50,
                "currency": "CHF",
                "is_published": True,
                "is_active": True,
                "max_attendees": 20
            }
            
            response = self.session.post(
                f"{BASE_URL}/catalog",
                headers=headers,
                json=product_data
            )
            
            if response.status_code == 200:
                data = response.json()
                
                if "id" in data:
                    # Fetch the created item to verify it
                    catalog_response = self.session.get(f"{BASE_URL}/catalog", headers=headers)
                    if catalog_response.status_code == 200:
                        catalog_items = catalog_response.json()
                        created_item = next((item for item in catalog_items if item.get("id") == data["id"]), None)
                        
                        if created_item and created_item.get("is_published") and created_item.get("is_active"):
                            self.catalog_items.append(created_item)
                            self.log_test(
                                "Create Published Product",
                                True,
                                f"Successfully created published product: {created_item['title']}",
                                {"product_id": created_item["id"], "price": created_item["price"], "currency": created_item["currency"]}
                            )
                            return True
                        else:
                            self.log_test(
                                "Create Published Product",
                                False,
                                "Product created but not published/active",
                                {"created_item": created_item}
                            )
                    else:
                        self.log_test(
                            "Create Published Product",
                            False,
                            "Product created but failed to fetch catalog",
                            {"response": data}
                        )
                else:
                    self.log_test(
                        "Create Published Product",
                        False,
                        "Product creation response missing ID",
                        {"response": data}
                    )
            else:
                self.log_test(
                    "Create Published Product",
                    False,
                    f"Failed to create product: {response.status_code}",
                    {"response": response.text}
                )
                
        except Exception as e:
            self.log_test(
                "Create Published Product",
                False,
                f"Exception during product creation: {str(e)}"
            )
        
        return False
    
    def test_product_checkout(self):
        """Test 2: Try to buy the created product via checkout"""
        if not self.catalog_items:
            self.log_test("Product Checkout", False, "No catalog items available for checkout")
            return False
        
        try:
            product = self.catalog_items[0]
            
            # The API expects query parameters, not JSON body
            params = {
                "catalog_item_id": product["id"],
                "quantity": 1,
                "customer_name": "Test Client",
                "customer_email": "client@test.com",
                "customer_phone": "+33612345678"
            }
            
            response = self.session.post(
                f"{BASE_URL}/reservations/checkout",
                headers=HEADERS,
                params=params
            )
            
            if response.status_code == 200:
                data = response.json()
                
                # Check if we get a session_id (Stripe checkout session)
                if "session_id" in data:
                    self.log_test(
                        "Product Checkout",
                        True,
                        "Checkout successful - Stripe session created",
                        {"session_id": data["session_id"], "product_id": product["id"]}
                    )
                    return True
                elif "reservation_id" in data:
                    # If no Stripe but reservation created
                    self.log_test(
                        "Product Checkout",
                        True,
                        "Checkout successful - Reservation created (Stripe not configured)",
                        {"reservation_id": data["reservation_id"], "message": data.get("message")}
                    )
                    return True
                else:
                    self.log_test(
                        "Product Checkout",
                        False,
                        "Checkout response missing session_id or reservation_id",
                        {"response": data}
                    )
            elif response.status_code == 400:
                data = response.json()
                error_detail = data.get("detail", "").lower()
                
                if "stripe" in error_detail or "payment" in error_detail or "key" in error_detail:
                    self.log_test(
                        "Product Checkout",
                        False,
                        "Checkout failed - Stripe configuration issue",
                        {"error": data.get("detail"), "status_code": response.status_code}
                    )
                else:
                    self.log_test(
                        "Product Checkout",
                        False,
                        f"Checkout failed with validation error: {data.get('detail')}",
                        {"response": data}
                    )
            else:
                self.log_test(
                    "Product Checkout",
                    False,
                    f"Checkout failed: {response.status_code}",
                    {"response": response.text}
                )
                
        except Exception as e:
            self.log_test(
                "Product Checkout",
                False,
                f"Exception during checkout: {str(e)}"
            )
        
        return False
    
    def test_subscription_payment(self):
        """Test 3: Try to create a subscription payment"""
        try:
            subscription_data = {
                "customer_email": "test@example.com",
                "customer_name": "Test User",
                "payment_method_id": "pm_test_card",
                "plan_id": "price_test_plan"
            }
            
            response = self.session.post(
                f"{BASE_URL}/stripe/create-subscription",
                headers=HEADERS,
                json=subscription_data
            )
            
            if response.status_code == 200:
                data = response.json()
                
                if "subscription_id" in data:
                    self.log_test(
                        "Subscription Payment",
                        True,
                        "Subscription created successfully",
                        {"subscription_id": data["subscription_id"]}
                    )
                    return True
                else:
                    self.log_test(
                        "Subscription Payment",
                        False,
                        "Subscription response missing subscription_id",
                        {"response": data}
                    )
            elif response.status_code == 404:
                self.log_test(
                    "Subscription Payment",
                    False,
                    "Subscription endpoint not found - feature not implemented",
                    {"status_code": response.status_code, "response": response.text}
                )
            elif response.status_code == 400:
                data = response.json()
                error_detail = data.get("detail", "").lower()
                
                if "stripe" in error_detail or "key" in error_detail or "configured" in error_detail:
                    self.log_test(
                        "Subscription Payment",
                        False,
                        "Subscription failed - Stripe configuration issue",
                        {"error": data.get("detail"), "status_code": response.status_code}
                    )
                else:
                    self.log_test(
                        "Subscription Payment",
                        False,
                        f"Subscription failed with validation error: {data.get('detail')}",
                        {"response": data}
                    )
            else:
                self.log_test(
                    "Subscription Payment",
                    False,
                    f"Subscription failed: {response.status_code}",
                    {"response": response.text}
                )
                
        except Exception as e:
            self.log_test(
                "Subscription Payment",
                False,
                f"Exception during subscription: {str(e)}"
            )
        
        return False
    
    def test_admin_settings_stripe_keys(self):
        """Test 4: Check if Stripe keys are configured in admin settings"""
        if not self.admin_token:
            self.log_test("Admin Stripe Settings", False, "No admin token available")
            return False
        
        try:
            headers = {**HEADERS, "Authorization": f"Bearer {self.admin_token}"}
            
            response = self.session.get(
                f"{BASE_URL}/settings",
                headers=headers
            )
            
            if response.status_code == 200:
                data = response.json()
                
                stripe_secret = data.get("stripe_secret_key", "")
                stripe_publishable = data.get("stripe_publishable_key", "")
                
                if stripe_secret and stripe_publishable:
                    self.log_test(
                        "Admin Stripe Settings",
                        True,
                        "Stripe keys are configured in admin settings",
                        {"has_secret_key": bool(stripe_secret), "has_publishable_key": bool(stripe_publishable)}
                    )
                    return True
                elif stripe_secret or stripe_publishable:
                    self.log_test(
                        "Admin Stripe Settings",
                        False,
                        "Partial Stripe configuration - missing keys",
                        {"has_secret_key": bool(stripe_secret), "has_publishable_key": bool(stripe_publishable)}
                    )
                else:
                    self.log_test(
                        "Admin Stripe Settings",
                        False,
                        "No Stripe keys configured in admin settings",
                        {"stripe_secret_key": "empty", "stripe_publishable_key": "empty"}
                    )
            elif response.status_code == 403:
                self.log_test(
                    "Admin Stripe Settings",
                    False,
                    "Access denied - user is not admin (cannot access admin settings)",
                    {"status_code": response.status_code, "note": "Admin role required"}
                )
            elif response.status_code == 404:
                self.log_test(
                    "Admin Stripe Settings",
                    False,
                    "Admin settings endpoint not found",
                    {"status_code": response.status_code}
                )
            else:
                self.log_test(
                    "Admin Stripe Settings",
                    False,
                    f"Failed to get admin settings: {response.status_code}",
                    {"response": response.text}
                )
                
        except Exception as e:
            self.log_test(
                "Admin Stripe Settings",
                False,
                f"Exception during admin settings check: {str(e)}"
            )
        
        return False
    
    def test_user_payment_config(self):
        """Test 5: Check user payment configuration"""
        if not self.admin_token:
            self.log_test("User Payment Config", False, "No admin token available")
            return False
        
        try:
            headers = {**HEADERS, "Authorization": f"Bearer {self.admin_token}"}
            
            response = self.session.get(
                f"{BASE_URL}/user/payment-config",
                headers=headers
            )
            
            if response.status_code == 200:
                data = response.json()
                
                stripe_secret = data.get("stripe_secret_key", "")
                stripe_publishable = data.get("stripe_publishable_key", "")
                paypal_client = data.get("paypal_client_id", "")
                paypal_secret = data.get("paypal_secret", "")
                
                if stripe_secret:
                    self.log_test(
                        "User Payment Config",
                        True,
                        "User has Stripe configuration",
                        {
                            "has_stripe_secret": bool(stripe_secret),
                            "has_stripe_publishable": bool(stripe_publishable),
                            "has_paypal_client": bool(paypal_client),
                            "has_paypal_secret": bool(paypal_secret)
                        }
                    )
                    return True
                else:
                    self.log_test(
                        "User Payment Config",
                        False,
                        "User payment configuration is empty - no Stripe keys configured",
                        {
                            "stripe_secret_key": "empty",
                            "stripe_publishable_key": "empty" if not stripe_publishable else "configured",
                            "paypal_client_id": "empty" if not paypal_client else "configured",
                            "paypal_secret": "empty" if not paypal_secret else "configured"
                        }
                    )
            elif response.status_code == 401 or response.status_code == 403:
                self.log_test(
                    "User Payment Config",
                    False,
                    "Authentication failed for user payment config",
                    {"status_code": response.status_code}
                )
            else:
                self.log_test(
                    "User Payment Config",
                    False,
                    f"Failed to get user payment config: {response.status_code}",
                    {"response": response.text}
                )
                
        except Exception as e:
            self.log_test(
                "User Payment Config",
                False,
                f"Exception during user payment config check: {str(e)}"
            )
        
        return False
    
    def test_backend_logs_for_errors(self):
        """Test 6: Check backend logs for payment-related errors"""
        try:
            import subprocess
            
            # Check backend logs for payment errors
            result = subprocess.run(
                ["tail", "-n", "200", "/var/log/supervisor/backend.err.log"],
                capture_output=True,
                text=True
            )
            
            log_content = result.stdout.lower()
            
            # Look for payment-related errors
            stripe_errors = "stripe" in log_content and ("error" in log_content or "exception" in log_content)
            payment_errors = "payment" in log_content and ("error" in log_content or "failed" in log_content)
            key_errors = "api key" in log_content or "api_key" in log_content
            
            if stripe_errors or payment_errors or key_errors:
                self.log_test(
                    "Backend Payment Logs",
                    False,
                    "Payment-related errors found in backend logs",
                    {
                        "stripe_errors": stripe_errors,
                        "payment_errors": payment_errors,
                        "key_errors": key_errors,
                        "log_sample": log_content[:500] if log_content else "No logs"
                    }
                )
            else:
                self.log_test(
                    "Backend Payment Logs",
                    True,
                    "No payment-related errors found in backend logs",
                    {"log_check": "Clean - no payment errors detected"}
                )
                return True
                
        except Exception as e:
            self.log_test(
                "Backend Payment Logs",
                False,
                f"Exception during log check: {str(e)}"
            )
        
        return False
    
    def run_all_tests(self):
        """Run all payment system tests"""
        print("🚀 Starting Payment System Test Suite")
        print(f"📍 Testing against: {BASE_URL}")
        print("=" * 60)
        
        # Setup authentication first
        if not self.setup_admin_auth():
            print("❌ Failed to setup admin authentication - aborting tests")
            return False
        
        # Test sequence as specified in the review request
        tests = [
            self.test_create_published_product,
            self.test_product_checkout,
            self.test_subscription_payment,
            self.test_admin_settings_stripe_keys,
            self.test_user_payment_config,
            self.test_backend_logs_for_errors
        ]
        
        passed = 0
        total = len(tests)
        
        for test in tests:
            success = test()
            if success:
                passed += 1
            time.sleep(1)  # Delay between tests
        
        print("=" * 60)
        print(f"📊 Test Results: {passed}/{total} tests passed")
        
        if passed == total:
            print("🎉 All payment system tests PASSED!")
            return True
        else:
            print(f"⚠️  {total - passed} tests FAILED")
            return False
    
    def get_summary(self):
        """Get test summary"""
        passed = sum(1 for result in self.test_results if result["success"])
        total = len(self.test_results)
        
        summary = {
            "total_tests": total,
            "passed": passed,
            "failed": total - passed,
            "success_rate": (passed / total * 100) if total > 0 else 0,
            "results": self.test_results
        }
        
        return summary


def main():
    """Main function to run payment system tests"""
    test_suite = PaymentSystemTestSuite()
    
    print("🔍 TESTING COMPLETE PAYMENT SYSTEM")
    print("Testing all payment routes and configurations...")
    print()
    
    success = test_suite.run_all_tests()
    
    print("\n" + "=" * 60)
    print("📋 DETAILED TEST SUMMARY")
    print("=" * 60)
    
    summary = test_suite.get_summary()
    
    for result in summary["results"]:
        status = "✅" if result["success"] else "❌"
        print(f"{status} {result['test']}: {result['message']}")
        if not result["success"] and result.get("details"):
            print(f"   → {result['details']}")
    
    print(f"\n📊 Final Results: {summary['passed']}/{summary['total_tests']} tests passed ({summary['success_rate']:.1f}%)")
    
    if not success:
        print("\n🚨 PAYMENT SYSTEM ISSUES DETECTED:")
        failed_tests = [r for r in summary["results"] if not r["success"]]
        for test in failed_tests:
            print(f"   • {test['test']}: {test['message']}")
    
    return success


if __name__ == "__main__":
    main()