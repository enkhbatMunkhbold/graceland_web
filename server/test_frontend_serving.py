import unittest

from app import app


class FrontendServingTest(unittest.TestCase):
    def setUp(self):
        app.config['TESTING'] = True
        self.client = app.test_client()

    def test_serves_react_app_and_pwa_assets(self):
        home = self.client.get('/')
        self.assertEqual(home.status_code, 200)
        self.assertIn(b'<div id="root"></div>', home.data)

        client_route = self.client.get('/home')
        self.assertEqual(client_route.status_code, 200)
        self.assertIn(b'<div id="root"></div>', client_route.data)

        manifest = self.client.get('/manifest.json')
        self.assertEqual(manifest.status_code, 200)
        self.assertEqual(manifest.get_json()['name'], 'Graceland Bible Church')

        service_worker = self.client.get('/service-worker.js')
        self.assertEqual(service_worker.status_code, 200)
        self.assertIn(b'graceland-pwa-v1', service_worker.data)

    def test_api_routes_take_precedence_over_spa_fallback(self):
        response = self.client.get('/check_session')
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.get_json()['error'], 'Not authenticated')


if __name__ == '__main__':
    unittest.main()
