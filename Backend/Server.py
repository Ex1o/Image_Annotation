import time
import uuid
from pathlib import Path
from typing import Optional, Set

import cv2
import numpy as np
from fastapi import FastAPI, File, UploadFile, Form, Query, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from ultralytics import YOLO

# Import authentication modules
from database import init_db, User
from auth_routes import router as auth_router
from auth_middleware import CurrentUser

BASE_DIR = Path(__file__).resolve().parent
OUTPUT_DIR = BASE_DIR / "outputs"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# ══════════════════════════════════════════════════════════════════════════════
# IMPROVED DETECTION PARAMETERS - Optimized for ALL objects including small/distant
# ══════════════════════════════════════════════════════════════════════════════
CONF_THRESHOLD = 0.15           # Very low threshold to catch small/occluded/distant objects
IOU_THRESHOLD = 0.60            # Higher IoU to preserve overlapping objects
POST_NMS_IOU_THRESHOLD = 0.65   # More permissive to keep nearby objects
MAX_DETECTIONS = 50             # Support crowded scenes with many objects
MAX_DETECTIONS_PER_CLASS = 15   # Allow more instances per class
MIN_BOX_AREA_RATIO = 0.0001     # Very small threshold for distant/tiny objects
MIN_MASK_AREA_RATIO = 0.00005   # Keep even tiny masks for distant/small objects
MASK_THRESHOLD = 0.35           # Lower threshold for thin structures and partial masks
MASK_BLEND_ALPHA = 0.28         # Slightly higher opacity for visibility

# Multi-scale detection settings for improved small object detection
MULTI_SCALE_SIZES = [640, 1280]  # Multiple inference sizes
SCALE_CONF_BOOST = 0.05          # Confidence boost for multi-scale matches

# Vibrant, visually distinct palette (RGB tuples)
PALETTE_RGB = [
    (255,  56,  56),  # red
    ( 76, 201, 240),  # sky blue
    ( 56, 255, 101),  # green
    (255, 157,  51),  # orange
    (132,  56, 255),  # purple
    (255, 222,  51),  # yellow
    ( 82, 255, 165),  # mint
    (255,  56, 200),  # hot pink
    ( 56, 194, 255),  # light blue
    (201,  56, 255),  # violet
    (255, 120,  56),  # coral
    ( 56, 255, 200),  # aquamarine
    (255, 195,  56),  # gold
    (100, 255,  56),  # lime
    ( 56,  56, 255),  # blue
    (255,  56, 120),  # rose
]
# Pre-compute BGR versions (OpenCV uses BGR)
PALETTE_BGR = [(b, g, r) for r, g, b in PALETTE_RGB]
# Pre-compute hex strings for the JSON response
PALETTE_HEX = ["#{:02x}{:02x}{:02x}".format(r, g, b) for r, g, b in PALETTE_RGB]

print("Loading YOLOv8 model...")
model = YOLO(str(BASE_DIR / "yolov8n-seg.pt"))

# Build class name lookup for search functionality
CLASS_NAMES = model.names  # {0: 'person', 1: 'bicycle', ...}
CLASS_NAME_TO_ID = {name.lower(): idx for idx, name in CLASS_NAMES.items()}

app = FastAPI(title="VisionRapid API - YOLOv8 Detection & Authentication")

# Initialize database
init_db()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include authentication routes
app.include_router(auth_router)

app.mount("/outputs", StaticFiles(directory=OUTPUT_DIR), name="outputs")


def bbox_iou(box_a: np.ndarray, box_b: np.ndarray) -> float:
    ax1, ay1, ax2, ay2 = box_a
    bx1, by1, bx2, by2 = box_b
    inter_x1 = max(ax1, bx1)
    inter_y1 = max(ay1, by1)
    inter_x2 = min(ax2, bx2)
    inter_y2 = min(ay2, by2)
    inter_w = max(0.0, inter_x2 - inter_x1)
    inter_h = max(0.0, inter_y2 - inter_y1)
    inter_area = inter_w * inter_h
    area_a = max(0.0, (ax2 - ax1) * (ay2 - ay1))
    area_b = max(0.0, (bx2 - bx1) * (by2 - by1))
    union = area_a + area_b - inter_area
    if union <= 0:
        return 0.0
    return float(inter_area / union)


def parse_search_query(query: Optional[str]) -> Set[int]:
    """
    Parse comma-separated class names into a set of class IDs.
    Returns empty set if no query (meaning detect all classes).
    """
    if not query or query.strip() == "":
        return set()
    
    target_ids = set()
    terms = [t.strip().lower() for t in query.split(",")]
    
    for term in terms:
        if not term:
            continue
        # Exact match first
        if term in CLASS_NAME_TO_ID:
            target_ids.add(CLASS_NAME_TO_ID[term])
        else:
            # Partial match only if term is a substring (helps with plurals, typos)
            # But don't match if the class name just contains the term
            for name, idx in CLASS_NAME_TO_ID.items():
                if term in name:  # Only match if search term is IN the class name
                    target_ids.add(idx)
    
    return target_ids


def run_multi_scale_detection(image: np.ndarray, target_classes: Set[int]) -> tuple:
    """
    Run detection at multiple scales to catch small and distant objects.
    Merges results with NMS to avoid duplicates.
    """
    h, w = image.shape[:2]
    all_boxes = []
    all_classes = []
    all_scores = []
    all_masks = []
    
    for imgsz in MULTI_SCALE_SIZES:
        results = model.predict(
            image,
            conf=CONF_THRESHOLD,
            iou=IOU_THRESHOLD,
            imgsz=imgsz,
            verbose=False,
            retina_masks=True,  # Higher quality masks
        )
        result = results[0]
        
        if result.boxes is None or len(result.boxes) == 0:
            continue
        
        boxes = result.boxes.xyxy.cpu().numpy()
        classes = result.boxes.cls.cpu().numpy().astype(int)
        scores = result.boxes.conf.cpu().numpy()
        masks = result.masks.data.cpu().numpy() if result.masks is not None else None
        
        # Filter by target classes if specified
        if target_classes:
            mask_filter = np.array([int(c) in target_classes for c in classes])
            if not mask_filter.any():
                continue
            boxes = boxes[mask_filter]
            classes = classes[mask_filter]
            scores = scores[mask_filter]
            if masks is not None:
                masks = masks[mask_filter]
        
        # Give slight confidence boost to larger scale detections (better for small objects)
        if imgsz > MULTI_SCALE_SIZES[0]:
            scores = np.clip(scores + SCALE_CONF_BOOST, 0, 1)
        
        all_boxes.append(boxes)
        all_classes.append(classes)
        all_scores.append(scores)
        if masks is not None:
            # Resize masks to original image size for consistency
            resized_masks = []
            for m in masks:
                m_resized = cv2.resize(m, (w, h), interpolation=cv2.INTER_LINEAR)
                resized_masks.append(m_resized)
            all_masks.append(np.array(resized_masks))
    
    if not all_boxes:
        return np.array([]), np.array([]), np.array([]), None
    
    # Concatenate all detections
    boxes = np.vstack(all_boxes)
    classes = np.hstack(all_classes)
    scores = np.hstack(all_scores)
    masks = np.vstack(all_masks) if all_masks else None
    
    # Apply cross-scale NMS to remove duplicates
    kept_indices = []
    sorted_indices = np.argsort(scores)[::-1]
    
    for idx in sorted_indices:
        box = boxes[idx]
        cls = int(classes[idx])
        
        is_duplicate = False
        for kept_idx in kept_indices:
            if int(classes[kept_idx]) == cls:
                if bbox_iou(box, boxes[kept_idx]) > POST_NMS_IOU_THRESHOLD:
                    is_duplicate = True
                    break
        
        if not is_duplicate:
            kept_indices.append(idx)
    
    if kept_indices:
        boxes = boxes[kept_indices]
        classes = classes[kept_indices]
        scores = scores[kept_indices]
        if masks is not None:
            masks = masks[kept_indices]
    else:
        return np.array([]), np.array([]), np.array([]), None
    
    return boxes, classes, scores, masks


@app.post("/detect")
async def detect(
    file: UploadFile = File(...),
    search: Optional[str] = Form(default=None),
    # current_user: CurrentUser = None  # Uncomment to require authentication
):
    """
    Detect objects in an image with optional class filtering.
    
    NOTE: To make this endpoint protected (require authentication),
    uncomment the current_user parameter above.
    
    Args:
        file: Image file to analyze
        search: Optional comma-separated list of class names to search for
                (e.g., "car, bus, truck" or "person")
    """
    try:
        start_time = time.time()

        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if image is None:
            return JSONResponse(
                status_code=400,
                content={"error": "Could not decode image"},
            )

        h, w = image.shape[:2]
        
        # Parse search query
        target_classes = parse_search_query(search)
        
        # Run multi-scale detection for better small object detection
        boxes, classes, scores, masks = run_multi_scale_detection(image, target_classes)

        # Post-filter detections for crowded scenes
        if len(boxes) > 0:
            image_area = float(w * h)
            min_box_area = max(1.0, image_area * MIN_BOX_AREA_RATIO)
            class_counts: dict[int, int] = {}
            kept_indices: list[int] = []
            sorted_indices = np.argsort(scores)[::-1]

            for idx in sorted_indices:
                box = boxes[idx]
                cls = int(classes[idx])

                # Skip tiny boxes (likely noise)
                box_area = float(max(0.0, (box[2] - box[0]) * (box[3] - box[1])))
                if box_area < min_box_area:
                    continue

                # Per-class limit
                if class_counts.get(cls, 0) >= MAX_DETECTIONS_PER_CLASS:
                    continue

                # Mask area check (very lenient for small objects)
                if masks is not None and idx < len(masks):
                    mask_ratio = float((masks[idx] > MASK_THRESHOLD).mean())
                    # Adaptive threshold: smaller boxes get much lower mask requirements
                    adaptive_mask_thresh = MIN_MASK_AREA_RATIO * (0.2 if box_area < image_area * 0.01 else 0.5)
                    if mask_ratio < adaptive_mask_thresh:
                        continue

                # Cross-class overlap check (different classes can overlap)
                overlap_rejected = False
                for kept_idx in kept_indices:
                    if int(classes[kept_idx]) != cls:
                        continue
                    if bbox_iou(box, boxes[kept_idx]) > POST_NMS_IOU_THRESHOLD:
                        overlap_rejected = True
                        break
                if overlap_rejected:
                    continue

                kept_indices.append(int(idx))
                class_counts[cls] = class_counts.get(cls, 0) + 1
                if len(kept_indices) >= MAX_DETECTIONS:
                    break

            if kept_indices:
                boxes = boxes[kept_indices]
                classes = classes[kept_indices]
                scores = scores[kept_indices]
                if masks is not None:
                    masks = masks[kept_indices]
            else:
                boxes = np.array([])
                classes = np.array([])
                scores = np.array([])
                masks = None

        # ── Build mask overlay (masks only – boxes are drawn by the frontend) ──
        output = image.copy()
        overlay = image.copy()
        min_contour_area = max(5, int(h * w * 0.00005))  # Very low threshold to keep small objects
        morph_kernel_size = max(3, int(min(h, w) * 0.0015))  # Smaller kernel to preserve detail
        if morph_kernel_size % 2 == 0:
            morph_kernel_size += 1
        morph_kernel = np.ones((morph_kernel_size, morph_kernel_size), np.uint8)

        if masks is not None and len(masks) > 0:
            for i, mask in enumerate(masks):
                color_bgr = PALETTE_BGR[i % len(PALETTE_BGR)]

                # Mask is already at full resolution from multi-scale detection
                if mask.shape[:2] != (h, w):
                    mask = cv2.resize(mask, (w, h), interpolation=cv2.INTER_LINEAR)
                
                binary_mask = (mask > MASK_THRESHOLD).astype(np.uint8)
                
                # Minimal morphology to preserve small objects and thin structures
                box_area = float((boxes[i][2] - boxes[i][0]) * (boxes[i][3] - boxes[i][1]))
                # Only apply light morphology to large objects (>5% of image)
                if box_area > h * w * 0.05:
                    # Use smaller kernel for less aggressive smoothing
                    small_kernel = np.ones((max(3, morph_kernel_size - 2), max(3, morph_kernel_size - 2)), np.uint8)
                    binary_mask = cv2.morphologyEx(binary_mask, cv2.MORPH_CLOSE, small_kernel, iterations=1)

                if int(binary_mask.sum()) == 0:
                    continue

                # Solid colour fill
                overlay[binary_mask == 1] = color_bgr

                # Draw contour with adaptive thickness
                contours, _ = cv2.findContours(binary_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
                contours = [c for c in contours if cv2.contourArea(c) >= min_contour_area]
                if contours:
                    thickness = 2 if box_area > h * w * 0.02 else 1
                    cv2.drawContours(output, contours, -1, color_bgr, thickness, cv2.LINE_AA)

        # Blend mask fill
        output = cv2.addWeighted(overlay, MASK_BLEND_ALPHA, output, 1 - MASK_BLEND_ALPHA, 0)

        detections = []
        for i, box in enumerate(boxes):
            x1, y1, x2, y2 = box.astype(int)
            x1, y1 = max(0, x1), max(0, y1)
            x2, y2 = min(w, x2), min(h, y2)

            class_id = int(classes[i])
            score = float(scores[i])
            label = model.names[class_id]
            hex_color = PALETTE_HEX[i % len(PALETTE_HEX)]

            detections.append(
                {
                    "id": f"det-{i}",
                    "class": label,
                    "class_id": class_id,
                    "confidence": score,
                    "box": {
                        "x1": float(x1),
                        "y1": float(y1),
                        "x2": float(x2),
                        "y2": float(y2),
                    },
                    "color": hex_color,
                }
            )

        # Save as lossless PNG to preserve mask-edge quality
        filename = f"{uuid.uuid4().hex}.png"
        output_path = OUTPUT_DIR / filename
        cv2.imwrite(str(output_path), output)

        processing_time_ms = int((time.time() - start_time) * 1000)
        
        # Build search info for response
        search_info = None
        if search:
            matched_classes = [model.names[cid] for cid in target_classes if cid in model.names]
            search_info = {
                "query": search,
                "matched_classes": matched_classes,
                "total_matched": len([d for d in detections if d["class_id"] in target_classes]) if target_classes else len(detections),
            }

        return {
            "objects_detected": len(detections),
            "detections": detections,
            "output_image_url": f"/outputs/{filename}",
            "processing_time_ms": processing_time_ms,
            "search_info": search_info,
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"error": str(e)},
        )


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/classes")
async def get_classes():
    """
    Return all available COCO class names that can be used for search filtering.
    """
    return {
        "classes": list(CLASS_NAMES.values()),
        "class_map": CLASS_NAMES,
        "total": len(CLASS_NAMES),
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
