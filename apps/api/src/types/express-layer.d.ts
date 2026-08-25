declare module 'express/lib/router/layer' {
  const ExpressLayer: { prototype: Record<string, unknown> };
  export default ExpressLayer;
}
