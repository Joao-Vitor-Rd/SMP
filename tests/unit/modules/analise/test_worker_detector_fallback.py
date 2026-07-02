from src.modules.analise.infrastructure.tasks.worker import _get_yolo_detector
from src.modules.analise.infrastructure.services.detector_defeitos_stub import DetectorDefeitosStub


def test_get_yolo_detector_falls_back_to_stub_without_api_key(monkeypatch):
    monkeypatch.delenv("ROBOFLOW_API_KEY", raising=False)

    detector = _get_yolo_detector()

    assert isinstance(detector, DetectorDefeitosStub)
