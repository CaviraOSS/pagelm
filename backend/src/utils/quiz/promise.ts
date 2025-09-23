export function withTimeout<T>(p: Promise<T>, ms: number, label = 'op'): Promise<T> {
  let t: any
  return new Promise<T>((resolve, reject) => {
    t = setTimeout(() => reject(new Error(`${label} timeout ${ms}ms`)), ms)
    p.then(v => { clearTimeout(t); resolve(v) })
     .catch(e => { clearTimeout(t); reject(e) })
  })
}