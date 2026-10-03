import io
import os
import unittest

from fastapi.testclient import TestClient

from Backend.main import app


class PersonCaptureTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_person_capture_endpoint_generates_id_and_stores_record(self):
        image_bytes = b"fake-image-bytes"
        response = self.client.post(
            "/api/persons",
            files={"image": ("person_test.jpg", io.BytesIO(image_bytes), "image/jpeg")},
        )

        self.assertEqual(response.status_code, 200, response.text)
        payload = response.json()
        self.assertTrue(payload["success"])
        self.assertRegex(payload["person_id"], r"^P\d{3}$")
        self.assertIn("date", payload)
        self.assertIn("time", payload)
        self.assertIn("image_url", payload)

        list_response = self.client.get("/api/persons")
        self.assertEqual(list_response.status_code, 200, list_response.text)
        data = list_response.json()
        persons = data.get("persons") or data.get("active") or []
        self.assertTrue(any(item["person_id"] == payload["person_id"] for item in persons))

    def test_frontend_capture_contract_accepts_file_field_and_cleans_up_on_delete(self):
        image_bytes = b"capture-byte-stream"
        response = self.client.post(
            "/api/persons",
            files={"file": ("capture.jpg", io.BytesIO(image_bytes), "image/jpeg")},
        )

        self.assertEqual(response.status_code, 200, response.text)
        payload = response.json()
        self.assertTrue(payload["success"])
        person_id = payload["person_id"]
        filename = person_id + ".jpg"
        upload_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static", "uploads", filename)

        self.assertTrue(os.path.exists(upload_path), "Expected captured image to be saved to static/uploads")

        delete_response = self.client.delete(f"/api/persons/{person_id}")
        self.assertEqual(delete_response.status_code, 200, delete_response.text)
        self.assertFalse(os.path.exists(upload_path), "Expected image file to be deleted from static/uploads")

        list_response = self.client.get("/api/persons")
        persons = (list_response.json().get("persons") or list_response.json().get("active") or [])
        self.assertNotIn(person_id, [item["person_id"] for item in persons])


if __name__ == "__main__":
    unittest.main()
