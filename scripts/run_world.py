import os
import asyncio
import uvicorn


async def main():
    port = int(os.getenv("PORT", 8000))
    config = uvicorn.Config("open_webui.main:app", host="0.0.0.0", port=port)
    server = uvicorn.Server(config)
    await server.startup()
    print(f"Server started on port {port}")
    print(f"curl -X POST http://localhost:{port}/world/edit")
    print(f"curl http://localhost:{port}/agent/meta")
    await server.main_loop()
    await server.shutdown()


if __name__ == "__main__":
    asyncio.run(main())
