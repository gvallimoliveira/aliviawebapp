/**
 * Deprecated: this component used to coordinate aggressive Service Worker
 * updates. The global PWA SW was removed because it was interfering with
 * authentication on desktop. Kept as a no-op so existing imports continue
 * to compile.
 */
const PwaUpdateGuard = () => null;

export default PwaUpdateGuard;
