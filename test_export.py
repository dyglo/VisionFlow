#!/usr/bin/env python3
"""
Quick test for export functionality
"""

import requests
import io
from PIL import Image, ImageDraw

BACKEND_URL = "https://3340e6b5-1d9a-4d73-bb2a-aefa294d52ba.preview.emergentagent.com/api"

def create_test_image():
    img = Image.new('RGB', (640, 480), color='white')
    draw = ImageDraw.Draw(img)
    draw.rectangle([50, 50, 150, 150], fill='red', outline='black', width=2)
    
    img_buffer = io.BytesIO()
    img.save(img_buffer, format='JPEG')
    img_buffer.seek(0)
    return img_buffer.getvalue()

# Upload image first
test_image = create_test_image()
files = {'file': ('test_image.jpg', test_image, 'image/jpeg')}

print("Uploading image...")
response = requests.post(f"{BACKEND_URL}/detect", files=files, timeout=60)
if response.status_code == 200:
    data = response.json()
    analysis_id = data['id']
    print(f"Analysis ID: {analysis_id}")
    
    # Test export
    print("Testing export...")
    export_response = requests.post(f"{BACKEND_URL}/export/{analysis_id}?format=yolo", timeout=30)
    print(f"Export status: {export_response.status_code}")
    print(f"Content type: {export_response.headers.get('content-type')}")
    print(f"Content length: {len(export_response.content)}")
    
    if export_response.status_code == 200:
        print("✅ Export working!")
    else:
        print(f"❌ Export failed: {export_response.text}")
else:
    print(f"Upload failed: {response.status_code}")