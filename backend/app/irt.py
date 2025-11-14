"""IRT (Item Response Theory) functions for 2PL/3PL models."""
from __future__ import annotations

import math
from typing import Iterable, Mapping


def logistic(a: float, b: float, theta: float) -> float:
    """Logistic function: 1/(1 + exp(-a*(theta - b)))."""
    z = a * (theta - b)
    if z > 700:
        return 1.0
    if z < -700:
        return 0.0
    return 1.0 / (1.0 + math.exp(-z))


def P_item(a: float, b: float, theta: float, c: float | None = None) -> float:
    """Probability of correct response for 2PL or 3PL model."""
    L = logistic(a, b, theta)
    if c is not None and not math.isnan(c):
        return c + (1 - c) * L
    return L


def dP_dtheta(a: float, b: float, theta: float, c: float | None = None) -> float:
    """Derivative of P with respect to theta."""
    L = logistic(a, b, theta)
    dL = a * L * (1 - L)
    if c is not None and not math.isnan(c):
        return (1 - c) * dL
    return dL


def info_item(a: float, b: float, theta: float, c: float | None = None) -> float:
    """Fisher information for an item at theta."""
    P = P_item(a, b, theta, c)
    dP = dP_dtheta(a, b, theta, c)
    if P <= 0 or P >= 1:
        return 0.0
    return (dP * dP) / (P * (1 - P))


def estimate_se(info_sum: float) -> float:
    """Estimate standard error from information sum."""
    if not math.isfinite(info_sum) or info_sum <= 0:
        return float('inf')
    return math.sqrt(1.0 / info_sum)


def clamp(value: float, low: float, high: float) -> float:
    """Clamp value between low and high."""
    return max(low, min(high, value))


def update_theta_map(
    theta_init: float,
    responses: Iterable[Mapping[str, float | bool]],
    *,
    theta_clamp: float = 4.0,
    newton_max_iter: int = 12,
    newton_tol: float = 1e-4,
    newton_max_step: float = 1.0,
) -> float:
    """Update theta using MAP (Maximum A Posteriori) via Newton iterations."""
    theta = theta_init
    responses_list = list(responses)

    for _ in range(newton_max_iter):
        grad = -theta
        hess = -1.0

        for r in responses_list:
            a = float(r['a'])
            b = float(r['b'])
            c_val = r.get('c')  # type: ignore[arg-type]
            c = float(c_val) if c_val is not None else None

            P = P_item(a, b, theta, c)
            dP = dP_dtheta(a, b, theta, c)
            y = 1.0 if r['correct'] else 0.0  # type: ignore[index]

            if 0 < P < 1:
                grad += (y - P) * (dP / (P * (1 - P)))

            approx_info = info_item(a, b, theta, c)
            hess -= approx_info

        if not math.isfinite(hess) or abs(hess) < 1e-8:
            hess = -1e-8 if hess >= 0 else hess
        elif hess > -1e-8:
            hess = -1e-8

        delta = grad / hess
        step = -delta
        step = max(-newton_max_step, min(newton_max_step, step))

        theta_new = theta + step
        if abs(theta_new - theta) < newton_tol:
            theta = clamp(theta_new, -theta_clamp, theta_clamp)
            break

        theta = clamp(theta_new, -theta_clamp, theta_clamp)

    return clamp(theta, -theta_clamp, theta_clamp)


def recompute_information_sum(theta: float, responses: Iterable[Mapping[str, float]]) -> float:
    """Recompute information sum at current theta using answered items."""
    info_sum = 0.0
    for r in responses:
        a = float(r['a'])
        b = float(r['b'])
        c_val = r.get('c')  # type: ignore[arg-type]
        c = float(c_val) if c_val is not None else None
        info_sum += info_item(a, b, theta, c)
    return info_sum
