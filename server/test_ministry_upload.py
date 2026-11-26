import os
import tempfile
import unittest
from pathlib import Path

from PIL import Image

from ministry_upload import optimize_ministry_image


class MinistryImageOptimizationTest(unittest.TestCase):
    def test_existing_large_image_is_reduced_to_320_pixels(self):
        with tempfile.TemporaryDirectory() as directory:
            path = os.path.join(directory, 'existing.jpg')
            Image.new('RGB', (1600, 900), color=(45, 110, 175)).save(path, quality=95)
            original_size = os.path.getsize(path)

            self.assertTrue(optimize_ministry_image(path))

            with Image.open(path) as optimized:
                self.assertEqual(optimized.size, (320, 180))
            self.assertLess(os.path.getsize(path), original_size)

    def test_animated_gif_is_left_unchanged(self):
        with tempfile.TemporaryDirectory() as directory:
            path = os.path.join(directory, 'animation.gif')
            Image.new('RGB', (800, 600), color='red').save(path, format='GIF')
            original = Path(path).read_bytes()

            self.assertFalse(optimize_ministry_image(path))
            self.assertEqual(Path(path).read_bytes(), original)


if __name__ == '__main__':
    unittest.main()
