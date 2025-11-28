"""
Closed-loop fusion visualization between real (R) and virtual (V) states.
Run with: python fusion_viz.py
"""
import numpy as np
import matplotlib.pyplot as plt


def simulate(
    R0,
    V0,
    alpha_R,
    alpha_V,
    A_RV_mag,
    A_VR_mag,
    dt=0.1,
    steps=100,
):
    """Simulate the coupled linear dynamics.

    Returns histories of R, V, and their difference norms.
    """
    R = np.array(R0, dtype=float).reshape(2)
    V = np.array(V0, dtype=float).reshape(2)
    A_RV = A_RV_mag * np.eye(2)
    A_VR = A_VR_mag * np.eye(2)

    R_hist = np.zeros((steps + 1, 2))
    V_hist = np.zeros((steps + 1, 2))
    diff_hist = np.zeros(steps + 1)

    R_hist[0] = R
    V_hist[0] = V
    diff_hist[0] = np.linalg.norm(R - V)

    for t in range(steps):
        u = A_VR @ V
        y = A_RV @ R
        R = R + dt * (alpha_R * R + u)
        V = V + dt * (alpha_V * V + y)
        R_hist[t + 1] = R
        V_hist[t + 1] = V
        diff_hist[t + 1] = np.linalg.norm(R - V)

    return R_hist, V_hist, diff_hist


def plot_timeseries(R_hist, V_hist, dt):
    """Overlay time traces of each dimension of R and V."""
    t = np.arange(R_hist.shape[0]) * dt
    fig, axes = plt.subplots(2, 1, sharex=True)
    labels = [("R1", "V1"), ("R2", "V2")]
    for i, ax in enumerate(axes):
        ax.plot(t, R_hist[:, i], label=labels[i][0], linestyle="-")
        ax.plot(t, V_hist[:, i], label=labels[i][1], linestyle="--")
        ax.set_ylabel(f"Dim {i+1}")
        ax.grid(True, linestyle=":")
        ax.legend()
    axes[-1].set_xlabel("Time")
    fig.suptitle("Real vs Virtual States")
    fig.tight_layout()
    return fig


def plot_difference(diff_hist, dt):
    """Plot the norm of the state difference over time."""
    t = np.arange(diff_hist.shape[0]) * dt
    fig, ax = plt.subplots()
    ax.plot(t, diff_hist)
    ax.set_xlabel("Time")
    ax.set_ylabel("||R - V||")
    ax.set_title("State Difference Norm")
    ax.grid(True, linestyle=":")
    fig.tight_layout()
    return fig


def sweep_coupling_map(
    R0,
    V0,
    alpha_R,
    alpha_V,
    dt,
    steps,
    mag_values,
):
    """Sweep coupling magnitudes and plot heatmap of final differences."""
    grid = np.zeros((len(mag_values), len(mag_values)))
    for i, a_rv in enumerate(mag_values):
        for j, a_vr in enumerate(mag_values):
            _, _, diff_hist = simulate(R0, V0, alpha_R, alpha_V, a_rv, a_vr, dt, steps)
            grid[i, j] = np.log10(diff_hist[-1] + 1e-9)

    fig, ax = plt.subplots()
    im = ax.imshow(
        grid,
        origin="lower",
        extent=[mag_values[0], mag_values[-1], mag_values[0], mag_values[-1]],
        aspect="auto",
    )
    ax.set_xlabel("A_VR magnitude")
    ax.set_ylabel("A_RV magnitude")
    ax.set_title("log10(final ||R - V||)")
    ax.set_xticks(np.linspace(mag_values[0], mag_values[-1], 5))
    ax.set_yticks(np.linspace(mag_values[0], mag_values[-1], 5))
    fig.colorbar(im, ax=ax, label="log10 diff")
    fig.tight_layout()
    return fig


def main():
    R0 = np.array([1.0, -1.0])
    V0 = np.array([0.5, 0.5])
    alpha_R = -0.1
    alpha_V = -0.1
    A_RV_mag = 0.5
    A_VR_mag = 0.5
    dt = 0.1
    steps = 100

    R_hist, V_hist, diff_hist = simulate(
        R0, V0, alpha_R, alpha_V, A_RV_mag, A_VR_mag, dt=dt, steps=steps
    )
    plot_timeseries(R_hist, V_hist, dt)
    plot_difference(diff_hist, dt)

    mag_values = np.linspace(-1.0, 1.5, 40)
    sweep_coupling_map(R0, V0, alpha_R, alpha_V, dt, steps, mag_values)
    plt.show()


if __name__ == "__main__":
    main()
