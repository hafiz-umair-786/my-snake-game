import json
import threading
import unittest
from http.client import HTTPConnection
from http.server import ThreadingHTTPServer

import app


class SnakeServerTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        app.scores.clear()
        cls.server = ThreadingHTTPServer(("127.0.0.1", 0), app.GameServer)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.host, cls.port = cls.server.server_address

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join()

    def request(self, method, path, body=None):
        connection = HTTPConnection(self.host, self.port)
        headers = {"Content-Type": "application/json"} if body is not None else {}
        encoded_body = json.dumps(body).encode("utf-8") if body is not None else None
        connection.request(method, path, body=encoded_body, headers=headers)
        response = connection.getresponse()
        content = response.read()
        connection.close()
        return response.status, response.getheader("Content-Type"), content

    def test_homepage_and_static_files_are_served(self):
        for path, content_type in (("/", "text/html"), ("/style.css", "text/css"), ("/script.js", "text/javascript")):
            with self.subTest(path=path):
                status, response_type, content = self.request("GET", path)
                self.assertEqual(status, 200)
                self.assertIn(content_type, response_type)
                self.assertGreater(len(content), 0)

    def test_favicon_returns_no_content(self):
        status, _, content = self.request("GET", "/favicon.ico")
        self.assertEqual(status, 204)
        self.assertEqual(content, b"")

    def test_missing_file_returns_not_found(self):
        status, _, _ = self.request("GET", "/missing-file.txt")
        self.assertEqual(status, 404)

    def test_path_traversal_is_rejected(self):
        status, _, _ = self.request("GET", "/%2e%2e/app.py")
        self.assertEqual(status, 404)

    def test_scores_are_saved_sorted_and_limited_to_ten(self):
        app.scores.clear()
        for score in range(12):
            status, _, _ = self.request("POST", "/api/scores", {"name": f"P{score}", "score": score})
            self.assertEqual(status, 200)

        status, _, content = self.request("GET", "/api/scores")
        scores = json.loads(content)
        self.assertEqual(status, 200)
        self.assertEqual(len(scores), 10)
        self.assertEqual([item["score"] for item in scores], list(range(2, 12)))

    def test_score_name_is_trimmed_and_limited(self):
        app.scores.clear()
        status, _, content = self.request("POST", "/api/scores", {"name": "  " + "A" * 16, "score": 5})
        self.assertEqual(status, 200)
        self.assertEqual(json.loads(content)[0]["name"], "A" * 14)

    def test_invalid_scores_are_rejected(self):
        for body in ({}, {"score": "not-a-number"}):
            with self.subTest(body=str(body)):
                status, _, content = self.request("POST", "/api/scores", body)
                self.assertEqual(status, 400)
                self.assertEqual(json.loads(content), {"error": "Invalid score"})

    def test_unknown_api_route_returns_not_found(self):
        status, _, _ = self.request("POST", "/api/unknown", {})
        self.assertEqual(status, 404)

    def test_frontend_declares_all_game_functions(self):
        script = (app.ROOT / "script.js").read_text(encoding="utf-8")
        expected_functions = (
            "randomCell", "same", "freeCell", "reset", "updateHud", "moveObstacles",
            "drawCell", "drawHead", "updateSettings", "draw", "step", "loseLife",
            "start", "endRun", "setDirection", "loadScores", "downloadHistory", "clearHistory",
        )
        for function_name in expected_functions:
            with self.subTest(function_name=function_name):
                self.assertIn(f"function {function_name}(", script)

    def test_desktop_navigation_has_four_views(self):
        html = (app.ROOT / "index.html").read_text(encoding="utf-8")
        for view_name in ("home", "guide", "history", "settings"):
            with self.subTest(view_name=view_name):
                self.assertIn(f'data-view="{view_name}"', html)
                self.assertIn(f'id="{view_name}View"', html)

    def test_guide_is_an_ordered_user_facing_list(self):
        html = (app.ROOT / "index.html").read_text(encoding="utf-8")
        self.assertIn('<ul class="guide-list">', html)
        self.assertGreaterEqual(html.count('<li>'), 5)
        self.assertIn("Use the arrow keys or the touch controls.", html)

    def test_settings_view_contains_all_controls(self):
        html = (app.ROOT / "index.html").read_text(encoding="utf-8")
        for control_id in (
            "middleThemeButton", "middleMusicButton", "middleSpeedDown",
            "middleSpeedUp", "middleWrapButton",
        ):
            with self.subTest(control_id=control_id):
                self.assertIn(f'id="{control_id}"', html)

    def test_desktop_layout_is_one_two_one_and_mobile_is_unchanged(self):
        css = (app.ROOT / "style.css").read_text(encoding="utf-8")
        self.assertIn("grid-template-columns: minmax(135px, 1fr) minmax(0, 2fr) minmax(235px, 1fr)", css)
        self.assertIn("@media (min-width: 761px)", css)
        self.assertIn(".section-menu,", css)
        self.assertIn(".page-view:not(#homeView)", css)

    def test_theme_and_music_settings_are_wired(self):
        script = (app.ROOT / "script.js").read_text(encoding="utf-8")
        self.assertIn('const themes = ["garden", "midnight", "sunset"]', script)
        self.assertIn('localStorage.setItem("neon-coil-theme", activeTheme)', script)
        self.assertIn('document.querySelector("#middleMusicButton")', script)
        self.assertIn('document.querySelector("#soundButton").click()', script)

    def test_each_theme_has_a_board_palette(self):
        script = (app.ROOT / "script.js").read_text(encoding="utf-8")
        for theme_name in ("garden", "midnight", "sunset"):
            with self.subTest(theme_name=theme_name):
                self.assertIn(f"  {theme_name}: {{", script)
        for color_name in ("background", "grid", "food", "poison", "obstacle", "snake", "head", "ink"):
            with self.subTest(color_name=color_name):
                self.assertIn(f"    {color_name}:", script)


if __name__ == "__main__":
    unittest.main(verbosity=2)