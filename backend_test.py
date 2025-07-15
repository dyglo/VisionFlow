#!/usr/bin/env python3
"""
VisionFlow Backend API Testing Suite
Tests the YOLOv8 object detection backend functionality
"""

import requests
import json
import base64
import io
import time
from PIL import Image, ImageDraw
import os
from pathlib import Path

# Backend URL from frontend/.env
BACKEND_URL = "https://3340e6b5-1d9a-4d73-bb2a-aefa294d52ba.preview.emergentagent.com/api"

class VisionFlowTester:
    def __init__(self):
        self.backend_url = BACKEND_URL
        self.test_results = {}
        self.analysis_id = None
        
    def create_test_image(self, width=640, height=480, format='JPEG'):
        """Create a test image with some shapes for object detection"""
        img = Image.new('RGB', (width, height), color='white')
        draw = ImageDraw.Draw(img)
        
        # Draw some shapes that might be detected
        draw.rectangle([50, 50, 150, 150], fill='red', outline='black', width=2)
        draw.ellipse([200, 100, 300, 200], fill='blue', outline='black', width=2)
        draw.rectangle([400, 200, 500, 350], fill='green', outline='black', width=2)
        
        # Convert to bytes
        img_buffer = io.BytesIO()
        img.save(img_buffer, format=format)
        img_buffer.seek(0)
        return img_buffer.getvalue()

    def test_api_health(self):
        """Test basic API health check"""
        print("🔍 Testing API Health Check...")
        try:
            response = requests.get(f"{self.backend_url}/", timeout=30)
            if response.status_code == 200:
                data = response.json()
                if "VisionFlow API" in data.get("message", ""):
                    print("✅ API Health Check: PASSED")
                    self.test_results["api_health"] = {"status": "PASSED", "details": data}
                    return True
                else:
                    print("❌ API Health Check: FAILED - Unexpected response")
                    self.test_results["api_health"] = {"status": "FAILED", "details": "Unexpected response format"}
            else:
                print(f"❌ API Health Check: FAILED - Status {response.status_code}")
                self.test_results["api_health"] = {"status": "FAILED", "details": f"HTTP {response.status_code}"}
        except Exception as e:
            print(f"❌ API Health Check: FAILED - {str(e)}")
            self.test_results["api_health"] = {"status": "FAILED", "details": str(e)}
        return False

    def test_image_upload_and_detection(self):
        """Test /api/detect endpoint with image upload"""
        print("🔍 Testing Image Upload and YOLOv8 Detection...")
        try:
            # Create test image
            test_image = self.create_test_image()
            
            # Prepare file upload
            files = {
                'file': ('test_image.jpg', test_image, 'image/jpeg')
            }
            
            print("   Uploading image for detection...")
            response = requests.post(f"{self.backend_url}/detect", files=files, timeout=60)
            
            if response.status_code == 200:
                data = response.json()
                
                # Validate response structure
                required_fields = ['id', 'filename', 'file_type', 'image_data', 'detections', 'total_objects', 'processing_time', 'timestamp']
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    print(f"❌ Detection API: FAILED - Missing fields: {missing_fields}")
                    self.test_results["detection_api"] = {"status": "FAILED", "details": f"Missing fields: {missing_fields}"}
                    return False
                
                # Validate data types and content
                if not isinstance(data['detections'], list):
                    print("❌ Detection API: FAILED - Detections should be a list")
                    self.test_results["detection_api"] = {"status": "FAILED", "details": "Invalid detections format"}
                    return False
                
                if not isinstance(data['image_data'], str):
                    print("❌ Detection API: FAILED - Image data should be base64 string")
                    self.test_results["detection_api"] = {"status": "FAILED", "details": "Invalid image_data format"}
                    return False
                
                # Store analysis ID for later tests
                self.analysis_id = data['id']
                
                print(f"✅ Detection API: PASSED")
                print(f"   - Objects detected: {data['total_objects']}")
                print(f"   - Processing time: {data['processing_time']:.3f}s")
                print(f"   - Analysis ID: {data['id']}")
                
                self.test_results["detection_api"] = {
                    "status": "PASSED", 
                    "details": {
                        "objects_detected": data['total_objects'],
                        "processing_time": data['processing_time'],
                        "analysis_id": data['id']
                    }
                }
                return True
            else:
                print(f"❌ Detection API: FAILED - Status {response.status_code}")
                print(f"   Response: {response.text}")
                self.test_results["detection_api"] = {"status": "FAILED", "details": f"HTTP {response.status_code}: {response.text}"}
                
        except Exception as e:
            print(f"❌ Detection API: FAILED - {str(e)}")
            self.test_results["detection_api"] = {"status": "FAILED", "details": str(e)}
        return False

    def test_invalid_file_upload(self):
        """Test invalid file upload handling"""
        print("🔍 Testing Invalid File Upload Handling...")
        try:
            # Test with text file
            files = {
                'file': ('test.txt', b'This is not an image', 'text/plain')
            }
            
            response = requests.post(f"{self.backend_url}/detect", files=files, timeout=30)
            
            if response.status_code == 400:
                print("✅ Invalid File Handling: PASSED - Correctly rejected non-image file")
                self.test_results["invalid_file_handling"] = {"status": "PASSED", "details": "Correctly rejected non-image file"}
                return True
            else:
                print(f"❌ Invalid File Handling: FAILED - Expected 400, got {response.status_code}")
                self.test_results["invalid_file_handling"] = {"status": "FAILED", "details": f"Expected 400, got {response.status_code}"}
                
        except Exception as e:
            print(f"❌ Invalid File Handling: FAILED - {str(e)}")
            self.test_results["invalid_file_handling"] = {"status": "FAILED", "details": str(e)}
        return False

    def test_analysis_history(self):
        """Test analysis history retrieval"""
        print("🔍 Testing Analysis History API...")
        try:
            response = requests.get(f"{self.backend_url}/analyses", timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    print(f"✅ Analysis History: PASSED - Retrieved {len(data)} analyses")
                    self.test_results["analysis_history"] = {"status": "PASSED", "details": f"Retrieved {len(data)} analyses"}
                    return True
                else:
                    print("❌ Analysis History: FAILED - Response should be a list")
                    self.test_results["analysis_history"] = {"status": "FAILED", "details": "Response should be a list"}
            else:
                print(f"❌ Analysis History: FAILED - Status {response.status_code}")
                self.test_results["analysis_history"] = {"status": "FAILED", "details": f"HTTP {response.status_code}"}
                
        except Exception as e:
            print(f"❌ Analysis History: FAILED - {str(e)}")
            self.test_results["analysis_history"] = {"status": "FAILED", "details": str(e)}
        return False

    def test_specific_analysis_retrieval(self):
        """Test retrieving specific analysis by ID"""
        if not self.analysis_id:
            print("⚠️  Specific Analysis Retrieval: SKIPPED - No analysis ID available")
            self.test_results["specific_analysis"] = {"status": "SKIPPED", "details": "No analysis ID available"}
            return False
            
        print("🔍 Testing Specific Analysis Retrieval...")
        try:
            response = requests.get(f"{self.backend_url}/analyses/{self.analysis_id}", timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                if data.get('id') == self.analysis_id:
                    print("✅ Specific Analysis Retrieval: PASSED")
                    self.test_results["specific_analysis"] = {"status": "PASSED", "details": "Successfully retrieved analysis by ID"}
                    return True
                else:
                    print("❌ Specific Analysis Retrieval: FAILED - ID mismatch")
                    self.test_results["specific_analysis"] = {"status": "FAILED", "details": "ID mismatch"}
            else:
                print(f"❌ Specific Analysis Retrieval: FAILED - Status {response.status_code}")
                self.test_results["specific_analysis"] = {"status": "FAILED", "details": f"HTTP {response.status_code}"}
                
        except Exception as e:
            print(f"❌ Specific Analysis Retrieval: FAILED - {str(e)}")
            self.test_results["specific_analysis"] = {"status": "FAILED", "details": str(e)}
        return False

    def test_export_functionality(self):
        """Test export functionality"""
        if not self.analysis_id:
            print("⚠️  Export Functionality: SKIPPED - No analysis ID available")
            self.test_results["export_functionality"] = {"status": "SKIPPED", "details": "No analysis ID available"}
            return False
            
        print("🔍 Testing Export Functionality...")
        try:
            # Test YOLO format export
            response = requests.post(f"{self.backend_url}/export/{self.analysis_id}?format=yolo", timeout=30)
            
            if response.status_code == 200:
                if response.headers.get('content-type') == 'application/zip':
                    print("✅ Export Functionality (YOLO): PASSED")
                    
                    # Test COCO format export
                    response_coco = requests.post(f"{self.backend_url}/export/{self.analysis_id}?format=coco", timeout=30)
                    if response_coco.status_code == 200:
                        print("✅ Export Functionality (COCO): PASSED")
                        self.test_results["export_functionality"] = {"status": "PASSED", "details": "Both YOLO and COCO export working"}
                        return True
                    else:
                        print(f"❌ Export Functionality (COCO): FAILED - Status {response_coco.status_code}")
                        self.test_results["export_functionality"] = {"status": "PARTIAL", "details": "YOLO works, COCO failed"}
                else:
                    print("❌ Export Functionality: FAILED - Not a ZIP file")
                    self.test_results["export_functionality"] = {"status": "FAILED", "details": "Response not a ZIP file"}
            else:
                print(f"❌ Export Functionality: FAILED - Status {response.status_code}")
                self.test_results["export_functionality"] = {"status": "FAILED", "details": f"HTTP {response.status_code}"}
                
        except Exception as e:
            print(f"❌ Export Functionality: FAILED - {str(e)}")
            self.test_results["export_functionality"] = {"status": "FAILED", "details": str(e)}
        return False

    def test_mongodb_storage(self):
        """Test MongoDB storage by checking if data persists"""
        print("🔍 Testing MongoDB Storage...")
        try:
            # First, get current count
            response1 = requests.get(f"{self.backend_url}/analyses", timeout=30)
            if response1.status_code != 200:
                print("❌ MongoDB Storage: FAILED - Cannot retrieve analyses")
                self.test_results["mongodb_storage"] = {"status": "FAILED", "details": "Cannot retrieve analyses"}
                return False
                
            count1 = len(response1.json())
            
            # Upload a new image
            test_image = self.create_test_image(width=320, height=240)
            files = {'file': ('storage_test.jpg', test_image, 'image/jpeg')}
            
            response2 = requests.post(f"{self.backend_url}/detect", files=files, timeout=60)
            if response2.status_code != 200:
                print("❌ MongoDB Storage: FAILED - Detection failed")
                self.test_results["mongodb_storage"] = {"status": "FAILED", "details": "Detection failed"}
                return False
            
            # Check if count increased
            time.sleep(1)  # Brief delay to ensure DB write
            response3 = requests.get(f"{self.backend_url}/analyses", timeout=30)
            if response3.status_code != 200:
                print("❌ MongoDB Storage: FAILED - Cannot retrieve analyses after upload")
                self.test_results["mongodb_storage"] = {"status": "FAILED", "details": "Cannot retrieve analyses after upload"}
                return False
                
            count2 = len(response3.json())
            
            if count2 > count1:
                print("✅ MongoDB Storage: PASSED - Data persisted successfully")
                self.test_results["mongodb_storage"] = {"status": "PASSED", "details": f"Count increased from {count1} to {count2}"}
                return True
            else:
                print("❌ MongoDB Storage: FAILED - Data not persisted")
                self.test_results["mongodb_storage"] = {"status": "FAILED", "details": f"Count did not increase: {count1} -> {count2}"}
                
        except Exception as e:
            print(f"❌ MongoDB Storage: FAILED - {str(e)}")
            self.test_results["mongodb_storage"] = {"status": "FAILED", "details": str(e)}
        return False

    def run_all_tests(self):
        """Run all backend tests in priority order"""
        print("=" * 60)
        print("🚀 VisionFlow Backend API Testing Suite")
        print("=" * 60)
        
        # High Priority Tests
        print("\n📋 HIGH PRIORITY TESTS")
        print("-" * 30)
        self.test_api_health()
        self.test_image_upload_and_detection()
        self.test_invalid_file_upload()
        
        # Medium Priority Tests
        print("\n📋 MEDIUM PRIORITY TESTS")
        print("-" * 30)
        self.test_mongodb_storage()
        self.test_export_functionality()
        
        # Low Priority Tests
        print("\n📋 LOW PRIORITY TESTS")
        print("-" * 30)
        self.test_analysis_history()
        self.test_specific_analysis_retrieval()
        
        # Summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        passed = 0
        failed = 0
        skipped = 0
        
        for test_name, result in self.test_results.items():
            status = result["status"]
            if status == "PASSED":
                print(f"✅ {test_name}: PASSED")
                passed += 1
            elif status == "FAILED":
                print(f"❌ {test_name}: FAILED - {result['details']}")
                failed += 1
            elif status == "SKIPPED":
                print(f"⚠️  {test_name}: SKIPPED - {result['details']}")
                skipped += 1
            elif status == "PARTIAL":
                print(f"🔶 {test_name}: PARTIAL - {result['details']}")
                failed += 1
        
        print(f"\n📈 Results: {passed} passed, {failed} failed, {skipped} skipped")
        
        return self.test_results

if __name__ == "__main__":
    tester = VisionFlowTester()
    results = tester.run_all_tests()