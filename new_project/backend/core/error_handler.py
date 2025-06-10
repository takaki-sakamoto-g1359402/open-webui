from fastapi import Request
from fastapi.responses import JSONResponse
from pydantic import ValidationError


def error_handler(request: Request, exc: ValidationError) -> JSONResponse:
    """pydantic.ValidationError を JSON で返す共通ハンドラ."""
    return JSONResponse(status_code=422, content={"detail": exc.errors()})
