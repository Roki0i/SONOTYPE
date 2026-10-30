"""Security regression checks for the local-only conversion service."""
import http.client
import threading
import unittest
from http.server import ThreadingHTTPServer
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from server import Handler


class SecurityTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        cls.port = cls.server.server_address[1]
        cls.origin = f"http://127.0.0.1:{cls.port}"
        cls.worker = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.worker.start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.worker.join(timeout=5)

    def request(self, method, path, headers=None, body=None):
        conn = http.client.HTTPConnection("127.0.0.1", self.port, timeout=5)
        try:
            conn.request(method, path, body=body, headers=headers or {})
            res = conn.getresponse()
            data = res.read()
            return res.status, dict(res.getheaders()), data
        finally:
            conn.close()

    def test_valid_loopback_get_and_secure_headers(self):
        status, headers, _ = self.request("GET", "/")
        self.assertEqual(status, 200)
        self.assertEqual(headers.get("X-Content-Type-Options"), "nosniff")
        self.assertIn("frame-ancestors 'none'", headers.get("Content-Security-Policy", ""))

    def test_dns_rebinding_host_rejected(self):
        status, _, _ = self.request("GET", "/", {"Host": "attacker.example"})
        self.assertEqual(status, 403)

    def test_internal_files_are_not_served(self):
        for path in ["/.git/config", "/.github/workflows/ci.yml",
                     "/server.py", "/requirements-e2e.txt",
                     "/src/../server.py", "/?secret=1/../server.py"]:
            with self.subTest(path=path):
                status, _, _ = self.request("GET", path)
                self.assertEqual(status, 404)

    def test_head_rejects_internal_files(self):
        status, _, _ = self.request("HEAD", "/.git/config")
        self.assertEqual(status, 404)

    def test_no_origin_cannot_convert(self):
        status, _, _ = self.request("POST", "/api/convert", {
            "Content-Type": "video/webm",
        }, b"\x1a\x45\xdf\xa3")
        self.assertEqual(status, 403)

    def test_foreign_origin_cannot_convert(self):
        status, _, _ = self.request("POST", "/api/convert", {
            "Origin": "https://attacker.example",
            "Content-Type": "video/webm",
        }, b"\x1a\x45\xdf\xa3")
        self.assertEqual(status, 403)

    def test_wrong_mime_rejected(self):
        status, _, _ = self.request("POST", "/api/convert", {
            "Origin": self.origin,
            "Content-Type": "text/plain",
        }, b"\x1a\x45\xdf\xa3")
        self.assertEqual(status, 415)

    def test_oversized_payload_rejected_before_read(self):
        status, _, _ = self.request("POST", "/api/convert", {
            "Origin": self.origin,
            "Content-Type": "video/webm",
            "Content-Length": "999999999",
        }, b"")
        self.assertEqual(status, 413)

    def test_chunked_transfer_rejected(self):
        status, _, _ = self.request("POST", "/api/convert", {
            "Origin": self.origin,
            "Content-Type": "video/webm",
            "Transfer-Encoding": "chunked",
        }, b"")
        self.assertEqual(status, 400)


if __name__ == "__main__":
    unittest.main()
