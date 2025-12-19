import random
import string
import time
from typing import Optional


class ProofOfPersonhood:
    def __init__(self):
        self.current_code: Optional[str] = None
        self.code_ts: float = 0.0

    def issue_challenge(self) -> str:
        self.current_code = "".join(random.choices(string.ascii_uppercase + string.digits, k=6))
        self.code_ts = time.time()
        return self.current_code

    def verify(self, code: str) -> Optional[str]:
        if not self.current_code or time.time() - self.code_ts > 300:
            return None
        if code != self.current_code:
            return None
        token = "".join(random.choices(string.ascii_lowercase + string.digits, k=12))
        return token

