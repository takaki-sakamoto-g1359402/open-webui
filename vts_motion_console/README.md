# VTS Motion Console

The VTS Motion Console is a lightweight Tkinter desktop tool for live tuning a Live2D model in [VTube Studio](https://store.steampowered.com/app/1325860/VTube_Studio/). It provides real-time parameter sliders, expression shortcuts, and a macro recorder so motions can be tweaked without leaving VTube Studio.

## Features

- **VTS WebSocket client** with token-based authentication. A `.vts_token.json` file is created on the first successful connection and re-used afterwards.
- **Parameter sliders** for the most common Live2D parameters with safe debouncing (≤30 updates/sec).
- **Expression controls** with quick buttons and a dropdown populated from the active VTS model.
- **Macro recorder and player** that records parameter changes with timing, supports looping, and can save/load JSON macros.
- **Parameter manager** to add or remove sliders if your model uses custom parameter names.
- **Resilient connection handling** – the UI stays responsive if VTS is not running, logs warnings instead of crashing, and offers a dry-run mode.

## Requirements

- Python 3.10+
- VTube Studio running locally with the WebSocket API enabled (default `ws://127.0.0.1:8001`).
- Dependencies listed in `requirements.txt` (`pip install -r requirements.txt`).

## Running

1. Start VTube Studio and enable the WebSocket API (`Settings → Plugins`).
2. Ensure the API is listening on `ws://127.0.0.1:8001` (default).
3. Install dependencies (from the project root):
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # On Windows use `.venv\\Scripts\\activate`
   pip install -r vts_motion_console/requirements.txt
   ```
4. Launch the console:
   ```bash
   python -m vts_motion_console.main
   ```
5. Click **Connect**. On the first run VTS will prompt to approve the plugin named `RiaiMotionTester`. After approving, `.vts_token.json` will be written next to the script.
6. Adjust sliders, trigger expressions, or record macros. Logs are shown at the bottom of the window.

## Macro Files

Macros are stored as JSON with the following structure:

```json
{
  "name": "Wave",
  "events": [
    { "timestamp": 0.0, "param": "ParamAngleX", "value": 0.2 },
    { "timestamp": 0.5, "param": "ParamAngleX", "value": -0.2 }
  ]
}
```

Use **Save Macro** and **Load Macro** to persist and replay recordings. Place reusable macros inside a `samples/` folder if desired.

## Troubleshooting

- If VTS is closed or unreachable the status indicator stays red and the console will log dry-run messages when you move sliders.
- Invalid parameter names result in a warning but the UI continues to operate. Use **Manage Parameters** to update the slider list.
- Delete `.vts_token.json` if you need to re-authorise the plugin.

## License

MIT
