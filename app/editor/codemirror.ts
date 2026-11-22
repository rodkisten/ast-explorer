/**
 * CodeMirror 6 provider boundary.
 *
 * The implementation will be loaded lazily when the CodeMirror host and
 * dependencies are integrated. This module intentionally imports no Monaco
 * runtime and does not claim to provide an editor instance yet.
 */
export const codeMirrorProviderId = 'codemirror' as const
