# coding: utf-8
"""Visualization of ReLU linear regions and decision boundary on a spiral dataset.

This script generates a 2D two-class spiral dataset, trains a small two-hidden-layer
ReLU MLP using NumPy, and visualizes how the network partitions the input space into
piecewise-linear regions as layers stack. It saves several plots illustrating the
training loss, linear regions for each hidden layer, and the final decision boundary.
Only NumPy and Matplotlib are used.
"""

import numpy as np
import matplotlib.pyplot as plt


def make_spiral(n_samples: int = 600, noise: float = 0.15) -> tuple[np.ndarray, np.ndarray]:
    """Create a two-class spiral dataset.

    Parameters
    ----------
    n_samples: int
        Total number of points to generate (even number).
    noise: float
        Standard deviation of Gaussian noise added to the data.

    Returns
    -------
    X: ndarray of shape (n_samples, 2)
        2D coordinates of generated points.
    y: ndarray of shape (n_samples,)
        Class labels (0 or 1).
    """
    n = n_samples // 2
    t = np.linspace(0, 3 * np.pi, n)
    r = t
    x = r * np.cos(t)
    y = r * np.sin(t)
    X0 = np.stack([x, y], axis=1) + noise * np.random.randn(n, 2)
    X1 = np.stack([-x, -y], axis=1) + noise * np.random.randn(n, 2)
    X = np.vstack([X0, X1])
    y = np.array([0] * n + [1] * n)
    return X, y


def relu(x: np.ndarray) -> np.ndarray:
    """ReLU activation."""
    return np.maximum(0, x)


def softmax(x: np.ndarray) -> np.ndarray:
    """Softmax function applied row-wise."""
    x = x - x.max(axis=1, keepdims=True)
    exp_x = np.exp(x)
    return exp_x / exp_x.sum(axis=1, keepdims=True)


class MLP:
    """Two-hidden-layer ReLU multilayer perceptron implemented with NumPy."""

    def __init__(self, hidden: int = 8):
        """Initialize weights with He initialization."""
        self.params = {
            'W1': np.random.randn(2, hidden) * np.sqrt(2 / 2),
            'b1': np.zeros(hidden),
            'W2': np.random.randn(hidden, hidden) * np.sqrt(2 / hidden),
            'b2': np.zeros(hidden),
            'W3': np.random.randn(hidden, 2) * np.sqrt(2 / hidden),
            'b3': np.zeros(2),
        }

    def forward(self, X: np.ndarray) -> tuple[np.ndarray, dict]:
        """Forward pass.

        Parameters
        ----------
        X: ndarray of shape (N, 2)
            Input data.

        Returns
        -------
        p: ndarray of shape (N, 2)
            Predicted class probabilities.
        cache: dict
            Intermediate values for backpropagation and analysis.
        """
        W1, b1 = self.params['W1'], self.params['b1']
        W2, b2 = self.params['W2'], self.params['b2']
        W3, b3 = self.params['W3'], self.params['b3']

        z1 = X @ W1 + b1
        a1 = relu(z1)
        z2 = a1 @ W2 + b2
        a2 = relu(z2)
        z3 = a2 @ W3 + b3
        p = softmax(z3)
        cache = {'X': X, 'z1': z1, 'a1': a1, 'z2': z2, 'a2': a2}
        return p, cache

    def _loss_grad(self, X: np.ndarray, y: np.ndarray, reg: float) -> tuple[float, dict]:
        """Compute loss and gradients for a batch."""
        p, cache = self.forward(X)
        N = X.shape[0]
        y_onehot = np.zeros_like(p)
        y_onehot[np.arange(N), y] = 1

        loss = -np.sum(y_onehot * np.log(p + 1e-8)) / N
        loss += 0.5 * reg * (np.sum(self.params['W1'] ** 2) +
                             np.sum(self.params['W2'] ** 2) +
                             np.sum(self.params['W3'] ** 2))

        dz3 = (p - y_onehot) / N
        dW3 = cache['a2'].T @ dz3 + reg * self.params['W3']
        db3 = dz3.sum(axis=0)
        da2 = dz3 @ self.params['W3'].T
        dz2 = da2 * (cache['z2'] > 0)
        dW2 = cache['a1'].T @ dz2 + reg * self.params['W2']
        db2 = dz2.sum(axis=0)
        da1 = dz2 @ self.params['W2'].T
        dz1 = da1 * (cache['z1'] > 0)
        dW1 = cache['X'].T @ dz1 + reg * self.params['W1']
        db1 = dz1.sum(axis=0)

        grads = {'W1': dW1, 'b1': db1,
                 'W2': dW2, 'b2': db2,
                 'W3': dW3, 'b3': db3}
        return loss, grads

    def fit(self, X: np.ndarray, y: np.ndarray, epochs: int = 2000,
            lr: float = 0.05, batch: int = 128, reg: float = 1e-4) -> list[float]:
        """Train the network with mini-batch SGD.

        Returns
        -------
        losses: list
            Training loss per epoch.
        """
        N = X.shape[0]
        losses = []
        for _ in range(epochs):
            idx = np.random.permutation(N)
            for i in range(0, N, batch):
                j = idx[i:i + batch]
                loss, grads = self._loss_grad(X[j], y[j], reg)
                for k in self.params:
                    self.params[k] -= lr * grads[k]
            loss_epoch, _ = self._loss_grad(X, y, reg)
            losses.append(loss_epoch)
        return losses

    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        """Return class probabilities for input X."""
        p, _ = self.forward(X)
        return p


if __name__ == "__main__":
    seed = 7
    N = 600
    np.random.seed(seed)

    # データ生成
    X, y = make_spiral(N, noise=0.15)
    print(f"[INFO] seed={seed}, N={N}")

    # モデル学習
    model = MLP(hidden=8)
    losses = model.fit(X, y, epochs=2000, lr=0.05, batch=128, reg=1e-4)

    # 精度評価
    probs = model.predict_proba(X)
    y_pred = probs.argmax(axis=1)
    acc = (y_pred == y).mean()
    final_loss = losses[-1]
    print(f"[INFO] final loss={final_loss:.4f}, acc={acc:.3f}")

    # 学習曲線
    plt.figure()
    plt.plot(losses)
    plt.xlabel('epoch')
    plt.ylabel('loss')
    plt.tight_layout()
    plt.savefig('training_loss.png')
    print('[SAVE] training_loss.png')
    plt.close()

    # グリッド生成
    xmin, xmax = X[:, 0].min() - 0.5, X[:, 0].max() + 0.5
    ymin, ymax = X[:, 1].min() - 0.5, X[:, 1].max() + 0.5
    gx, gy = np.meshgrid(np.linspace(xmin, xmax, 300),
                         np.linspace(ymin, ymax, 300))
    grid = np.c_[gx.ravel(), gy.ravel()]

    # 領域ID計算
    p_grid, cache = model.forward(grid)
    bits = 1 << np.arange(8)
    ids1 = (cache['z1'] > 0).astype(int) @ bits
    ids2 = (cache['z2'] > 0).astype(int) @ bits

    # Layer1 regions with hyperplanes
    plt.figure()
    plt.imshow(ids1.reshape(gx.shape), extent=[xmin, xmax, ymin, ymax],
               origin='lower', alpha=0.6)
    plt.scatter(X[:, 0], X[:, 1], c=y, s=15)
    for k in range(8):
        w = model.params['W1'][:, k]
        b = model.params['b1'][k]
        z = w[0] * gx + w[1] * gy + b
        plt.contour(gx, gy, z, levels=[0], colors='k', linewidths=0.5)
    plt.xlim(xmin, xmax)
    plt.ylim(ymin, ymax)
    plt.tight_layout()
    plt.savefig('regions_layer1.png')
    print('[SAVE] regions_layer1.png')
    plt.close()

    # Layer2 regions
    plt.figure()
    plt.imshow(ids2.reshape(gx.shape), extent=[xmin, xmax, ymin, ymax],
               origin='lower', alpha=0.6)
    plt.scatter(X[:, 0], X[:, 1], c=y, s=15)
    plt.xlim(xmin, xmax)
    plt.ylim(ymin, ymax)
    plt.tight_layout()
    plt.savefig('regions_layer2.png')
    print('[SAVE] regions_layer2.png')
    plt.close()

    # 決定境界
    Z = p_grid.argmax(axis=1).reshape(gx.shape)
    plt.figure()
    plt.contourf(gx, gy, Z, levels=1, alpha=0.3)
    plt.scatter(X[:, 0], X[:, 1], c=y, s=15)
    plt.xlim(xmin, xmax)
    plt.ylim(ymin, ymax)
    plt.tight_layout()
    plt.savefig('decision_boundary.png')
    print('[SAVE] decision_boundary.png')
    plt.close()
