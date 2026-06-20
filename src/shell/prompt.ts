export function formatPromptTemplate(
  template: string,
  vars: { user: string; host: string; cwd: string }
): string {
  const shortCwd = vars.cwd === '/' ? '~' : vars.cwd.replace(/^\/+/, '');
  return template
    .replace(/\\u/g, vars.user)
    .replace(/\\h/g, vars.host)
    .replace(/\\w/g, shortCwd)
    .replace(/\\\$/g, '$');
}