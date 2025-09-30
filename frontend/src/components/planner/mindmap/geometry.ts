export type Pt = { x: number; y: number }

export function anchorLine(
    cx: number,
    cy: number,
    rxC: number,
    ryC: number,
    sx: number,
    sy: number,
    rxS = 42,
    ryS = 14
) {
    const dx = sx - cx
    const dy = sy - cy
    const len = Math.hypot(dx, dy) || 1
    const ux = dx / len
    const uy = dy / len
    const denomC = Math.sqrt((ux * ux) / (rxC * rxC) + (uy * uy) / (ryC * ryC)) || 1
    const tC = 1 / denomC
    const ax = cx + ux * tC
    const ay = cy + uy * tC
    const denomS = Math.sqrt((ux * ux) / (rxS * rxS) + (uy * uy) / (ryS * ryS)) || 1
    const tS = 1 / denomS
    const bx = sx - ux * tS
    const by = sy - uy * tS
    return { ax, ay, bx, by }
}
