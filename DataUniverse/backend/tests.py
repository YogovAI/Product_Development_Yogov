from fastapi.testclient import TestClient
from backend.main import app
import pytest

client = TestClient(app)

def test_read_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Welcome to DataUniverse API"}

def test_list_sources():
    response = client.get("/sources/")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_list_spark_clusters():
    response = client.get("/spark/clusters")
    assert response.status_code == 200
    assert len(response.json()) > 0
    assert response.json()[0]["name"] == "Local Spark"
