"""Tests for data_loader."""

from pathlib import Path

from ade import data_loader


def test_load_local_data(tmp_path: Path) -> None:
    contacts, interactions, events = data_loader.load_local_data(tmp_path)
    assert not contacts.empty
    assert not interactions.empty
    assert not events.empty
