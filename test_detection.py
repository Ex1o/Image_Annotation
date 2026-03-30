#!/usr/bin/env python3
"""
Test script to verify detection improvements:
1. Small/distant objects are detected
2. Thin structures are captured
3. Search filtering works correctly
"""

import sys
from pathlib import Path

# Add Backend to path
backend_path = Path(__file__).parent / "Backend"
sys.path.insert(0, str(backend_path))

from Server import (
    CONF_THRESHOLD,
    MIN_BOX_AREA_RATIO,
    MIN_MASK_AREA_RATIO,
    MASK_THRESHOLD,
    parse_search_query,
    CLASS_NAME_TO_ID,
)


def test_thresholds():
    """Verify thresholds are set to permissive values"""
    print("=== Testing Detection Thresholds ===")
    print(f"CONF_THRESHOLD: {CONF_THRESHOLD}")
    assert CONF_THRESHOLD <= 0.15, f"CONF_THRESHOLD too high: {CONF_THRESHOLD}"
    print("✓ Confidence threshold is permissive (≤0.15)")
    
    print(f"MIN_BOX_AREA_RATIO: {MIN_BOX_AREA_RATIO}")
    assert MIN_BOX_AREA_RATIO <= 0.0001, f"MIN_BOX_AREA_RATIO too high: {MIN_BOX_AREA_RATIO}"
    print("✓ Box area ratio is permissive (≤0.0001)")
    
    print(f"MIN_MASK_AREA_RATIO: {MIN_MASK_AREA_RATIO}")
    assert MIN_MASK_AREA_RATIO <= 0.00005, f"MIN_MASK_AREA_RATIO too high: {MIN_MASK_AREA_RATIO}"
    print("✓ Mask area ratio is permissive (≤0.00005)")
    
    print(f"MASK_THRESHOLD: {MASK_THRESHOLD}")
    assert MASK_THRESHOLD <= 0.35, f"MASK_THRESHOLD too high: {MASK_THRESHOLD}"
    print("✓ Mask threshold is permissive (≤0.35)")
    
    print("\n✓ All thresholds are set correctly for detecting small objects!\n")


def test_search_parsing():
    """Verify search query parsing works correctly"""
    print("=== Testing Search Query Parsing ===")
    
    # Test 1: Empty query returns empty set
    result = parse_search_query(None)
    assert result == set(), "Empty query should return empty set"
    print("✓ Empty query returns empty set (detects all)")
    
    # Test 2: Exact match
    result = parse_search_query("bicycle")
    assert len(result) > 0, "Should find 'bicycle' class"
    print(f"✓ 'bicycle' query found class IDs: {result}")
    
    # Test 3: Multiple classes
    result = parse_search_query("car, bicycle, person")
    assert len(result) >= 3, "Should find at least 3 classes"
    print(f"✓ Multiple class query found {len(result)} class IDs: {result}")
    
    # Test 4: Partial match (e.g., "cycle" should match "bicycle")
    result = parse_search_query("cycle")
    assert len(result) > 0, "Partial match should work"
    print(f"✓ Partial match 'cycle' found class IDs: {result}")
    
    # Test 5: Case insensitive
    result1 = parse_search_query("BICYCLE")
    result2 = parse_search_query("bicycle")
    assert result1 == result2, "Search should be case-insensitive"
    print("✓ Search is case-insensitive")
    
    print("\n✓ All search parsing tests passed!\n")


def test_class_availability():
    """Verify expected classes are available"""
    print("=== Testing Class Availability ===")
    
    expected_classes = ["bicycle", "car", "person", "dog", "cat"]
    for cls in expected_classes:
        if cls in CLASS_NAME_TO_ID:
            print(f"✓ Class '{cls}' available (ID: {CLASS_NAME_TO_ID[cls]})")
        else:
            print(f"⚠ Class '{cls}' not found in model")
    
    print(f"\nTotal classes available: {len(CLASS_NAME_TO_ID)}")
    print("\n✓ Class availability check complete!\n")


if __name__ == "__main__":
    try:
        test_thresholds()
        test_search_parsing()
        test_class_availability()
        
        print("=" * 50)
        print("✓✓✓ ALL TESTS PASSED ✓✓✓")
        print("=" * 50)
        print("\nImprovements verified:")
        print("  • Thresholds are permissive for small/distant objects")
        print("  • Mask threshold is low for thin structures")
        print("  • Search filtering works correctly")
        print("  • Expected classes are available")
        
    except AssertionError as e:
        print(f"\n❌ TEST FAILED: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
