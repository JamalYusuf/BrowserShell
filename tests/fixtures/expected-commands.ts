/** Canonical command list — update when adding or removing commands. */
export const EXPECTED_COMMAND_NAMES = [
  'help', 'man', 'apropos', 'ls', 'cd', 'pwd', 'cat', 'echo', 'clear',
  'source', 'alias', 'export', 'grep', 'head', 'tail', 'wc',
  'go', 'search', 'qf', 'here', 'reload', 'back', 'forward', 'open', 'close',
  'clip', 'quick', 'config', 'options', 'user', 'wait', 'watch', 'log', 'notify', 'overlay',
  'tabs', 'tab', 'title', 'discard', 'pinned', 'pin', 'unpin', 'domain',
  'windows', 'window', 'sessions', 'find', 'detach', 'mute', 'recent',
  'bookmarks', 'bookmark', 'history',
  'ai',
  'seek', 'zoom', 'scroll', 'volume', 'audible', 'links', 'link', 'shot',
  'click', 'fill', 'pick', 'read', 'inputs', 'input', 'press', 'meta', 'images', 'image',
  'audit', 'perf', 'tech', 'storage', 'reqs', 'viewport', 'frames', 'cookies', 'env', 'jsonld',
  'forget', 'siteinfo', 'permissions', 'downloads', 'extensions', 'session',
] as const;

export const EXPECTED_COMMAND_COUNT = EXPECTED_COMMAND_NAMES.length;