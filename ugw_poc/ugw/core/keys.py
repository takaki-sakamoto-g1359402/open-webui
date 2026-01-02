from __future__ import annotations

import json
import os
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Dict, List

from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey, Ed25519PublicKey

from ugw.core.config import settings
from ugw.utils.crypto import b64encode, b64decode


@dataclass
class KeyRecord:
    key_id: str
    created_at: str
    status: str
    public_key: str
    private_key: str


class KeyStore:
    def __init__(self, path: str) -> None:
        self.path = path
        os.makedirs(os.path.dirname(path), exist_ok=True)
        if not os.path.exists(path):
            self._write({"active_key_id": None, "keys": []})

    def _read(self) -> Dict:
        with open(self.path, "r", encoding="utf-8") as handle:
            return json.load(handle)

    def _write(self, data: Dict) -> None:
        with open(self.path, "w", encoding="utf-8") as handle:
            json.dump(data, handle, indent=2)

    def load_keys(self) -> Dict:
        return self._read()

    def ensure_active_key(self) -> KeyRecord:
        data = self._read()
        if data["active_key_id"] is None:
            record = self.rotate_key()
            return record
        key_id = data["active_key_id"]
        for record in data["keys"]:
            if record["key_id"] == key_id:
                return KeyRecord(**record)
        raise RuntimeError("Active key not found")

    def rotate_key(self) -> KeyRecord:
        data = self._read()
        private_key = Ed25519PrivateKey.generate()
        public_key = private_key.public_key()
        key_id = f"key-{len(data['keys']) + 1}"
        created_at = datetime.now(timezone.utc).isoformat()
        record = KeyRecord(
            key_id=key_id,
            created_at=created_at,
            status="active",
            public_key=b64encode(public_key.public_bytes(
                encoding=serialization.Encoding.Raw,
                format=serialization.PublicFormat.Raw,
            )),
            private_key=b64encode(private_key.private_bytes(
                encoding=serialization.Encoding.Raw,
                format=serialization.PrivateFormat.Raw,
                encryption_algorithm=serialization.NoEncryption(),
            )),
        )
        for existing in data["keys"]:
            if existing["status"] == "active":
                existing["status"] = "retired"
        data["keys"].append(record.__dict__)
        data["active_key_id"] = key_id
        self._write(data)
        return record

    def get_key(self, key_id: str) -> KeyRecord:
        data = self._read()
        for record in data["keys"]:
            if record["key_id"] == key_id:
                return KeyRecord(**record)
        raise KeyError(key_id)


class EncryptionKey:
    def __init__(self, path: str) -> None:
        self.path = path
        os.makedirs(os.path.dirname(path), exist_ok=True)
        if not os.path.exists(path):
            with open(path, "wb") as handle:
                handle.write(Fernet.generate_key())

    def load(self) -> bytes:
        with open(self.path, "rb") as handle:
            return handle.read()


class OracleKeys:
    def __init__(self, path: str) -> None:
        self.path = path
        os.makedirs(os.path.dirname(path), exist_ok=True)
        if not os.path.exists(path):
            self._generate()

    def _generate(self) -> None:
        private_key = Ed25519PrivateKey.generate()
        public_key = private_key.public_key()
        data = {
            "key_id": "oracle-key-1",
            "public_key": b64encode(public_key.public_bytes(
                encoding=serialization.Encoding.Raw,
                format=serialization.PublicFormat.Raw,
            )),
            "private_key": b64encode(private_key.private_bytes(
                encoding=serialization.Encoding.Raw,
                format=serialization.PrivateFormat.Raw,
                encryption_algorithm=serialization.NoEncryption(),
            )),
        }
        with open(self.path, "w", encoding="utf-8") as handle:
            json.dump(data, handle, indent=2)

    def load(self) -> Dict[str, str]:
        with open(self.path, "r", encoding="utf-8") as handle:
            return json.load(handle)


def get_keystore() -> KeyStore:
    return KeyStore(settings.audit_key_path)


def get_encryption_key() -> EncryptionKey:
    return EncryptionKey(settings.encryption_key_path)


def get_oracle_keys() -> OracleKeys:
    return OracleKeys(settings.oracle_key_path)


def load_public_key(encoded: str) -> Ed25519PublicKey:
    return Ed25519PublicKey.from_public_bytes(b64decode(encoded))


def load_private_key(encoded: str) -> Ed25519PrivateKey:
    return Ed25519PrivateKey.from_private_bytes(b64decode(encoded))
