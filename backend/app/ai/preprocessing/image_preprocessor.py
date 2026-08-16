import io
import time
import logging
from typing import Any, Tuple, Dict
import numpy as np
from PIL import Image, ImageOps
import cv2

logger = logging.getLogger("civix_backend")

class ImagePreprocessor:
    """
    Standardized Image Preprocessing Layer for AI Models.
    Handles decoding, color space conversions, orientation correction, and resizing.
    """

    def prepare_image(
        self,
        image_input: Any,
        target_size: Tuple[int, int] = (640, 640),
        normalize: bool = False
    ) -> Tuple[np.ndarray, Dict[str, Any]]:
        start_time = time.perf_counter()

        if isinstance(image_input, bytes):
            try:
                img_pil = Image.open(io.BytesIO(image_input))
                img_pil = ImageOps.exif_transpose(img_pil).convert("RGB")
                img_np = np.array(img_pil)
            except Exception:
                nparr = np.frombuffer(image_input, np.uint8)
                cv_img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                if cv_img is None:
                    raise ValueError("Invalid image file format")
                img_np = cv2.cvtColor(cv_img, cv2.COLOR_BGR2RGB)
        elif isinstance(image_input, Image.Image):
            img_pil = ImageOps.exif_transpose(image_input).convert("RGB")
            img_np = np.array(img_pil)
        elif isinstance(image_input, np.ndarray):
            img_np = image_input
            if len(img_np.shape) == 2:
                img_np = cv2.cvtColor(img_np, cv2.COLOR_GRAY2RGB)
            elif img_np.shape[2] == 4:
                img_np = cv2.cvtColor(img_np, cv2.COLOR_RGBA2RGB)
        else:
            raise ValueError(f"Unsupported image input type: {type(image_input)}")

        orig_height, orig_width = img_np.shape[:2]

        if target_size and (orig_width, orig_height) != target_size:
            resized_np = cv2.resize(img_np, target_size, interpolation=cv2.INTER_LINEAR)
        else:
            resized_np = img_np

        if normalize:
            processed_matrix = resized_np.astype(np.float32) / 255.0
        else:
            processed_matrix = resized_np

        prep_time_ms = round((time.perf_counter() - start_time) * 1000, 2)

        meta = {
            "original_width": orig_width,
            "original_height": orig_height,
            "target_width": target_size[0] if target_size else orig_width,
            "target_height": target_size[1] if target_size else orig_height,
            "preprocessing_time_ms": prep_time_ms
        }

        return processed_matrix, meta
