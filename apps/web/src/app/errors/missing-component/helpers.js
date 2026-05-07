export const SomethingElse = () => 'not what you wanted';

/** Demo route: exists for the bundler; throws at runtime for error UI testing */
export function DoesNotExist() {
  throw new Error('Missing component (demo route)');
}
