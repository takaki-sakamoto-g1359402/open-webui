"""Tkinter UI for the VTS Motion Console."""

from __future__ import annotations

import asyncio
import json
import threading
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable, Dict, List, Optional

import tkinter as tk
from tkinter import filedialog, simpledialog, ttk

from .vts_client import VTSCallbacks, VTSClient


SETTINGS_FILE = Path(".motion_console_settings.json")
DEFAULT_PARAMETERS = [
    "ParamAngleX",
    "ParamAngleY",
    "ParamMouthOpen",
    "ParamEyeSmile",
    "ParamBrowInnerUp",
]


class AsyncioLoopThread(threading.Thread):
    """Runs an asyncio event loop on a dedicated daemon thread."""

    def __init__(self) -> None:
        super().__init__(daemon=True)
        self.loop = asyncio.new_event_loop()
        self.start()

    def run(self) -> None:  # pragma: no cover - thread bootstrap
        asyncio.set_event_loop(self.loop)
        self.loop.run_forever()

    def stop(self) -> None:
        self.loop.call_soon_threadsafe(self.loop.stop)


@dataclass
class MacroEvent:
    timestamp: float
    parameter: str
    value: float


@dataclass
class Macro:
    name: str = "Untitled"
    events: List[MacroEvent] = field(default_factory=list)

    def to_json(self) -> Dict[str, object]:
        return {
            "name": self.name,
            "events": [
                {"timestamp": e.timestamp, "param": e.parameter, "value": e.value}
                for e in self.events
            ],
        }

    @staticmethod
    def from_json(payload: Dict[str, object]) -> "Macro":
        name = str(payload.get("name", "Untitled"))
        events: List[MacroEvent] = []
        for item in payload.get("events", []):
            if not isinstance(item, dict):
                continue
            try:
                param = item.get("param")
                value = item.get("value")
                timestamp = item.get("timestamp")
                if param is None or value is None or timestamp is None:
                    continue
                events.append(
                    MacroEvent(
                        timestamp=float(timestamp),
                        parameter=str(param),
                        value=float(value),
                    )
                )
            except (TypeError, ValueError):
                continue
        events.sort(key=lambda e: e.timestamp)
        return Macro(name=name, events=events)


class MotionConsoleUI:
    """Main Tkinter application."""

    def __init__(self, loop_thread: AsyncioLoopThread) -> None:
        self.loop_thread = loop_thread
        self.root = tk.Tk()
        self.root.title("VTS Motion Console")
        self.root.geometry("960x720")
        self.root.protocol("WM_DELETE_WINDOW", self._on_close)

        self.client: Optional[VTSClient] = None
        self.parameter_names = self._load_parameter_settings()
        self.slider_vars: Dict[str, tk.DoubleVar] = {}
        self.changed_params: Dict[str, float] = {}
        self.is_recording = False
        self.record_start = 0.0
        self.current_macro = Macro()
        self.record_events: List[MacroEvent] = []
        self.playback_handles: List[str] = []
        self.loop_playback = False
        self._ignore_slider_events = False
        self._connection_state = "disconnected"
        self.expression_var = tk.StringVar(value="")
        self.expression_names: List[str] = []
        self.parameter_frame: Optional[ttk.LabelFrame] = None

        self._build_ui()

    # ------------------------------------------------------------------
    # Callbacks wiring
    # ------------------------------------------------------------------
    def create_callbacks(self) -> VTSCallbacks:
        return VTSCallbacks(
            on_status_change=self._dispatch_to_ui(self._update_status),
            on_log=self._dispatch_to_ui(self._append_log),
            on_warning=self._dispatch_to_ui(self._show_warning),
            on_expressions=self._dispatch_to_ui(self._update_expression_list),
        )

    def set_client(self, client: VTSClient) -> None:
        self.client = client

    # ------------------------------------------------------------------
    # UI construction
    # ------------------------------------------------------------------
    def _build_ui(self) -> None:
        self.root.columnconfigure(0, weight=1)
        self.root.rowconfigure(1, weight=1)

        control_frame = ttk.Frame(self.root, padding=12)
        control_frame.grid(row=0, column=0, sticky="ew")
        control_frame.columnconfigure(3, weight=1)

        self.connect_button = ttk.Button(control_frame, text="Connect", command=self._on_connect_pressed)
        self.connect_button.grid(row=0, column=0, padx=(0, 8))

        self.status_canvas = tk.Canvas(control_frame, width=18, height=18, highlightthickness=0)
        self.status_canvas.grid(row=0, column=1)
        self.status_indicator = self.status_canvas.create_oval(2, 2, 16, 16, fill="#f44336", outline="")

        self.status_label = ttk.Label(control_frame, text="Not connected")
        self.status_label.grid(row=0, column=2, sticky="w")

        ttk.Button(control_frame, text="Manage Parameters", command=self._open_parameter_manager).grid(
            row=0, column=4, padx=8
        )
        ttk.Button(control_frame, text="Reset", command=self._reset_changed_parameters).grid(
            row=0, column=5
        )

        main_pane = ttk.PanedWindow(self.root, orient=tk.HORIZONTAL)
        main_pane.grid(row=1, column=0, sticky="nsew")

        sliders_frame = ttk.LabelFrame(main_pane, text="Parameters", padding=12)
        sliders_frame.columnconfigure(1, weight=1)
        self.parameter_frame = sliders_frame
        self._build_sliders(sliders_frame)
        main_pane.add(sliders_frame, weight=3)

        right_pane = ttk.Notebook(main_pane)
        main_pane.add(right_pane, weight=2)

        expressions_frame = ttk.Frame(right_pane, padding=12)
        self._build_expressions(expressions_frame)
        right_pane.add(expressions_frame, text="Expressions")

        macro_frame = ttk.Frame(right_pane, padding=12)
        self._build_macro_controls(macro_frame)
        right_pane.add(macro_frame, text="Macros")

        log_frame = ttk.Frame(self.root, padding=12)
        log_frame.grid(row=2, column=0, sticky="nsew")
        log_frame.columnconfigure(0, weight=1)
        log_frame.rowconfigure(0, weight=1)

        self.log_text = tk.Text(log_frame, height=10, state=tk.DISABLED, wrap=tk.WORD)
        self.log_text.grid(row=0, column=0, sticky="nsew")
        scrollbar = ttk.Scrollbar(log_frame, command=self.log_text.yview)
        scrollbar.grid(row=0, column=1, sticky="ns")
        self.log_text.configure(yscrollcommand=scrollbar.set)

    def _build_sliders(self, frame: ttk.Frame) -> None:
        for idx, name in enumerate(self.parameter_names):
            self._add_slider(frame, idx, name)

    def _add_slider(self, frame: ttk.Frame, row: int, name: str) -> None:
        label = ttk.Label(frame, text=name)
        label.grid(row=row, column=0, sticky="w", padx=(0, 8), pady=4)

        var = tk.DoubleVar(value=0.0)
        slider = ttk.Scale(
            frame,
            from_=0.0,
            to=1.0,
            orient=tk.HORIZONTAL,
            variable=var,
            command=lambda value, parameter=name: self._on_slider_change(parameter, float(value)),
        )
        slider.grid(row=row, column=1, sticky="ew", pady=4)

        value_label = ttk.Label(frame, text="0.00")
        value_label.grid(row=row, column=2, padx=(8, 0))

        self.slider_vars[name] = var
        var.trace_add("write", lambda *_args, p=name, l=value_label, v=var: l.config(text=f"{v.get():.2f}"))

    def _build_expressions(self, frame: ttk.Frame) -> None:
        quick_frame = ttk.Frame(frame)
        quick_frame.grid(row=0, column=0, sticky="ew")
        quick_frame.columnconfigure(0, weight=1)

        ttk.Label(quick_frame, text="Quick Expressions").grid(row=0, column=0, sticky="w")
        btn_frame = ttk.Frame(quick_frame)
        btn_frame.grid(row=1, column=0, pady=(4, 12), sticky="w")

        for idx, (label, name) in enumerate(
            [("Smile", "Smile"), ("Sad", "Sad"), ("Angry", "Angry")]
        ):
            ttk.Button(
                btn_frame,
                text=label,
                command=lambda expr=name: self._activate_expression(expr, True),
            ).grid(row=0, column=idx, padx=4)

        ttk.Button(
            quick_frame,
            text="Deactivate",
            command=lambda: self._activate_expression(self.expression_var.get(), False),
        ).grid(row=2, column=0, sticky="w")

        ttk.Separator(frame, orient=tk.HORIZONTAL).grid(row=1, column=0, sticky="ew", pady=8)

        ttk.Label(frame, text="All Expressions").grid(row=2, column=0, sticky="w")
        combo = ttk.Combobox(frame, textvariable=self.expression_var, values=self.expression_names, state="readonly")
        combo.grid(row=3, column=0, sticky="ew", pady=4)
        self.expression_combo = combo

        activate_frame = ttk.Frame(frame)
        activate_frame.grid(row=4, column=0, pady=4, sticky="w")
        ttk.Button(activate_frame, text="Activate", command=lambda: self._activate_expression(self.expression_var.get(), True)).grid(
            row=0, column=0, padx=(0, 6)
        )
        ttk.Button(activate_frame, text="Deactivate", command=lambda: self._activate_expression(self.expression_var.get(), False)).grid(
            row=0, column=1
        )

    def _build_macro_controls(self, frame: ttk.Frame) -> None:
        frame.columnconfigure(0, weight=1)
        control_row = ttk.Frame(frame)
        control_row.grid(row=0, column=0, sticky="w")

        ttk.Button(control_row, text="Record", command=self._start_recording).grid(row=0, column=0, padx=4)
        ttk.Button(control_row, text="Stop", command=self._stop_actions).grid(row=0, column=1, padx=4)
        ttk.Button(control_row, text="Play", command=lambda: self._play_macro(loop=False)).grid(row=0, column=2, padx=4)
        ttk.Button(control_row, text="Loop", command=lambda: self._play_macro(loop=True)).grid(row=0, column=3, padx=4)

        file_row = ttk.Frame(frame)
        file_row.grid(row=1, column=0, sticky="w", pady=8)
        ttk.Button(file_row, text="Save Macro", command=self._save_macro).grid(row=0, column=0, padx=4)
        ttk.Button(file_row, text="Load Macro", command=self._load_macro).grid(row=0, column=1, padx=4)

        self.macro_status = ttk.Label(frame, text="No macro recorded")
        self.macro_status.grid(row=2, column=0, sticky="w", pady=(8, 0))

    # ------------------------------------------------------------------
    # Event handling
    # ------------------------------------------------------------------
    def _dispatch_to_ui(self, handler: Callable) -> Callable:
        def wrapper(*args, **kwargs) -> None:
            self.root.after(0, lambda: handler(*args, **kwargs))

        return wrapper

    def _update_status(self, status: str) -> None:
        self._connection_state = status
        color = {"connected": "#4CAF50", "connecting": "#FFC107"}.get(status, "#f44336")
        label = {"connected": "Connected", "connecting": "Connecting…"}.get(status, "Not connected")
        self.status_canvas.itemconfigure(self.status_indicator, fill=color)
        self.status_label.configure(text=label)
        if status == "connected":
            self.connect_button.configure(text="Disconnect")
        else:
            self.connect_button.configure(text="Connect")

    def _append_log(self, message: str) -> None:
        timestamp = time.strftime("%H:%M:%S")
        self.log_text.configure(state=tk.NORMAL)
        self.log_text.insert(tk.END, f"[{timestamp}] {message}\n")
        self.log_text.configure(state=tk.DISABLED)
        self.log_text.see(tk.END)

    def _show_warning(self, message: str) -> None:
        self._append_log(f"⚠️ {message}")

    def _update_expression_list(self, expressions: List[str]) -> None:
        self.expression_names = expressions
        self.expression_combo.configure(values=expressions)
        if expressions:
            self.expression_var.set(expressions[0])
        else:
            self.expression_var.set("")

    def _on_connect_pressed(self) -> None:
        if not self.client:
            return
        if self._connection_state == "connected":
            self.client.disconnect()
        else:
            self._update_status("connecting")
            self.client.connect()

    def _on_close(self) -> None:
        if self.client:
            self.client.disconnect()
        self.root.destroy()

    def _on_slider_change(self, parameter: str, value: float) -> None:
        if self._ignore_slider_events:
            return
        self._handle_parameter_change(parameter, value, source="user")

    def _handle_parameter_change(self, parameter: str, value: float, source: str) -> None:
        self.changed_params[parameter] = value
        if self.client:
            self.client.queue_parameter_update(parameter, value)
        self._append_log(f"{parameter} → {value:.2f}")
        if self.is_recording and source == "user":
            timestamp = time.perf_counter() - self.record_start
            self.record_events.append(MacroEvent(timestamp=timestamp, parameter=parameter, value=value))
            self.macro_status.configure(text=f"Recording… {timestamp:.1f}s")

    def _activate_expression(self, expression: str, active: bool) -> None:
        if not expression:
            self._show_warning("Select an expression first.")
            return
        if self.client:
            self.client.activate_expression(expression, active)

    # ------------------------------------------------------------------
    # Macro controls
    # ------------------------------------------------------------------
    def _start_recording(self) -> None:
        if self.is_recording:
            return
        self.is_recording = True
        self.record_start = time.perf_counter()
        self.record_events = []
        self.macro_status.configure(text="Recording…")
        self._append_log("Macro recording started.")

    def _stop_actions(self) -> None:
        if self.is_recording:
            self._finish_recording()
        self._stop_playback()

    def _finish_recording(self) -> None:
        self.is_recording = False
        if not self.record_events:
            self.macro_status.configure(text="No events recorded")
            self._append_log("Macro recording cancelled (no events).")
            return
        duration = self.record_events[-1].timestamp if self.record_events else 0.0
        self.current_macro = Macro(name="Recorded Macro", events=list(self.record_events))
        self.macro_status.configure(text=f"Recorded {len(self.record_events)} events over {duration:.1f}s")
        self._append_log("Macro recording finished.")

    def _stop_playback(self) -> None:
        for handle in self.playback_handles:
            self.root.after_cancel(handle)
        self.playback_handles.clear()
        self.loop_playback = False
        self.macro_status.configure(text=f"Stopped. {len(self.current_macro.events)} events loaded.")

    def _play_macro(self, loop: bool) -> None:
        if not self.current_macro.events:
            self._show_warning("No macro to play. Record or load one first.")
            return
        self._stop_playback()
        self.loop_playback = loop
        self._append_log(f"Playing macro{' in loop' if loop else ''}…")
        start_time = time.perf_counter()
        events = list(self.current_macro.events)

        def schedule_event(index: int) -> None:
            if index >= len(events):
                if self.loop_playback:
                    next_handle = self.root.after(10, lambda: start_playback())
                    self.playback_handles.append(next_handle)
                else:
                    self.macro_status.configure(text="Playback finished.")
                return
            event = events[index]
            delay_ms = max(0, int((event.timestamp - (time.perf_counter() - start_time)) * 1000))

            def apply_event() -> None:
                self._apply_macro_event(event)
                schedule_event(index + 1)

            handle = self.root.after(delay_ms, apply_event)
            self.playback_handles.append(handle)

        def start_playback() -> None:
            nonlocal start_time
            start_time = time.perf_counter()
            schedule_event(0)

        start_playback()

    def _apply_macro_event(self, event: MacroEvent) -> None:
        if event.parameter not in self.slider_vars:
            return
        self._ignore_slider_events = True
        self.slider_vars[event.parameter].set(event.value)
        self._ignore_slider_events = False
        self._handle_parameter_change(event.parameter, event.value, source="macro")

    def _save_macro(self) -> None:
        if not self.current_macro.events:
            self._show_warning("Record a macro first.")
            return
        path = filedialog.asksaveasfilename(
            title="Save Macro",
            defaultextension=".json",
            filetypes=[("JSON", "*.json"), ("All Files", "*.*")],
        )
        if not path:
            return
        payload = self.current_macro.to_json()
        Path(path).write_text(json.dumps(payload, indent=2))
        self._append_log(f"Saved macro to {path}")

    def _load_macro(self) -> None:
        path = filedialog.askopenfilename(
            title="Load Macro",
            filetypes=[("JSON", "*.json"), ("All Files", "*.*")],
        )
        if not path:
            return
        try:
            payload = json.loads(Path(path).read_text())
            macro = Macro.from_json(payload)
        except (OSError, json.JSONDecodeError) as exc:
            self._show_warning(f"Could not read macro: {exc!s}")
            return
        if not macro.events:
            self._show_warning("Macro file contained no events.")
            return
        self.current_macro = macro
        self.macro_status.configure(text=f"Loaded {len(macro.events)} events from {macro.name}")
        self._append_log(f"Loaded macro from {path}")

    # ------------------------------------------------------------------
    # Parameter management
    # ------------------------------------------------------------------
    def _open_parameter_manager(self) -> None:
        dialog = tk.Toplevel(self.root)
        dialog.title("Manage Parameters")
        dialog.grab_set()

        frame = ttk.Frame(dialog, padding=12)
        frame.grid(row=0, column=0, sticky="nsew")
        dialog.columnconfigure(0, weight=1)
        dialog.rowconfigure(0, weight=1)

        listbox = tk.Listbox(frame, selectmode=tk.SINGLE)
        for name in self.parameter_names:
            listbox.insert(tk.END, name)
        listbox.grid(row=0, column=0, columnspan=2, sticky="nsew")
        frame.columnconfigure(0, weight=1)
        frame.rowconfigure(0, weight=1)

        ttk.Button(frame, text="Add", command=lambda: self._add_parameter_dialog(listbox)).grid(
            row=1, column=0, pady=8, sticky="w"
        )
        ttk.Button(frame, text="Remove", command=lambda: self._remove_selected_parameter(listbox)).grid(
            row=1, column=1, pady=8, sticky="e"
        )

    def _add_parameter_dialog(self, listbox: tk.Listbox) -> None:
        name = simpledialog.askstring("Add Parameter", "Parameter name:", parent=self.root)
        if not name:
            return
        if name in self.parameter_names:
            self._show_warning("Parameter already exists.")
            return
        self.parameter_names.append(name)
        listbox.insert(tk.END, name)
        self._recreate_sliders()
        self._save_parameter_settings()

    def _remove_selected_parameter(self, listbox: tk.Listbox) -> None:
        selection = listbox.curselection()
        if not selection:
            return
        index = selection[0]
        name = self.parameter_names.pop(index)
        listbox.delete(index)
        self.slider_vars.pop(name, None)
        self.changed_params.pop(name, None)
        self._recreate_sliders()
        self._save_parameter_settings()

    def _recreate_sliders(self) -> None:
        frame = self.parameter_frame
        if frame is None:
            return
        for child in frame.winfo_children():
            child.destroy()
        frame.columnconfigure(1, weight=1)
        self.slider_vars.clear()
        for idx, name in enumerate(self.parameter_names):
            self._add_slider(frame, idx, name)

    def _reset_changed_parameters(self) -> None:
        if not self.changed_params:
            self._append_log("No parameters to reset.")
            return
        for param in list(self.changed_params):
            if param not in self.slider_vars:
                continue
            self._ignore_slider_events = True
            self.slider_vars[param].set(0.0)
            self._ignore_slider_events = False
            self._handle_parameter_change(param, 0.0, source="reset")
        self.changed_params.clear()
        self._append_log("Parameters reset to 0.")

    # ------------------------------------------------------------------
    # Settings persistence
    # ------------------------------------------------------------------
    def _load_parameter_settings(self) -> List[str]:
        if not SETTINGS_FILE.exists():
            return list(DEFAULT_PARAMETERS)
        try:
            payload = json.loads(SETTINGS_FILE.read_text())
            params = payload.get("parameters", [])
            if isinstance(params, list) and params:
                return [str(p) for p in params]
        except json.JSONDecodeError:
            pass
        return list(DEFAULT_PARAMETERS)

    def _save_parameter_settings(self) -> None:
        SETTINGS_FILE.write_text(json.dumps({"parameters": self.parameter_names}, indent=2))

    # ------------------------------------------------------------------
    def run(self) -> None:
        self.root.mainloop()
