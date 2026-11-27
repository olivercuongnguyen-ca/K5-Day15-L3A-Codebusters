"""Tests never call a real model or start the reminder loop, whatever .env says."""
import os

os.environ["MODEL_PROVIDER"] = "fake"
os.environ["NOTIFY_LOOP"] = "0"
