export type UpdateErrorKind =
  | 'signature'
  | 'network'
  | 'metadata'
  | 'permission'
  | 'notarization'
  | 'generic';

export function classifyUpdaterError(error: unknown): UpdateErrorKind {
  const message = String(error).toLowerCase();

  if (message.includes('pubkey') || message.includes('signature') || message.includes('minisign')) {
    return 'signature';
  }

  if (
    message.includes('timed out')
    || message.includes('network')
    || message.includes('connection')
    || message.includes('dns')
    || message.includes('http')
  ) {
    return 'network';
  }

  if (
    message.includes('latest.json')
    || message.includes('metadata')
    || message.includes('json')
    || message.includes('empty')
  ) {
    return 'metadata';
  }

  if (
    message.includes('permission')
    || message.includes('access denied')
    || message.includes('read-only')
    || message.includes('locked')
    || message.includes('path')
  ) {
    return 'permission';
  }

  if (message.includes('gatekeeper') || message.includes('notar')) {
    return 'notarization';
  }

  return 'generic';
}
