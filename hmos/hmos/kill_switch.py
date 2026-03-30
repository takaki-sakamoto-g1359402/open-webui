from __future__ import annotations

from hmos.storage import Storage


def is_kill_switch_enabled(storage: Storage) -> bool:
    return storage.get_kill_switch()


def enable_kill_switch(storage: Storage) -> None:
    storage.set_kill_switch(True)


def disable_kill_switch(storage: Storage) -> None:
    storage.set_kill_switch(False)
