from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class TrechoBoundingBoxFilterDTO:
    top_left_lat: float
    top_left_lng: float
    bottom_right_lat: float
    bottom_right_lng: float
