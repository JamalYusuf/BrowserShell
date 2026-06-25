import type { Command } from '@/shared/types';
import { alias } from './builtin/alias';
import { apropos } from './builtin/apropos';
import { cat } from './builtin/cat';
import { clear } from './builtin/clear';
import { echo } from './builtin/echo';
import { exportCmd } from './builtin/export';
import { help } from './builtin/help';
import { ls } from './builtin/ls';
import { man } from './builtin/man';
import { pwd } from './builtin/pwd';
import { source } from './builtin/source';
import { bookmark } from './bookmarks/bookmark';
import { bookmarks } from './bookmarks/bookmarks';
import { history } from './history/history';
import { cd } from './navigation/cd';
import { close } from './navigation/close';
import { go } from './navigation/go';
import { search } from './navigation/search';
import { qf } from './navigation/qf';
import { here } from './navigation/here';
import { reload } from './navigation/reload';
import { back } from './navigation/back';
import { forward } from './navigation/forward';
import { open } from './navigation/open';
import { clip } from './utility/clip';
import { config } from './utility/config';
import { optionsPage } from './utility/options-page';
import { userCmd } from './utility/user';
import { grep } from './utility/grep';
import { head } from './utility/head';
import { quick } from './utility/quick';
import { tail } from './utility/tail';
import { wc } from './utility/wc';
import { tab } from './tabs/tab';
import { tabs } from './tabs/tabs';
import { windows } from './windows/windows';
import { window } from './windows/window';
import { sessions } from './windows/sessions';
import { find } from './windows/find';
import { mute } from './windows/mute';
import { detach } from './windows/detach';
import { ai } from './ai/ai';
import { seek } from './page/seek';
import { zoom } from './page/zoom';
import { scroll } from './page/scroll';
import { volume } from './page/volume';
import { audible } from './page/audible';
import { hints } from './page/hints';
import { links } from './page/links';
import { link } from './page/link';
import { shot } from './page/shot';
import { click } from './page/click';
import { fill } from './page/fill';
import { pick } from './page/pick';
import { read } from './page/read';
import { inputs } from './page/inputs';
import { input } from './page/input';
import { press } from './page/press';
import { meta } from './page/meta';
import { images } from './page/images';
import { image } from './page/image';
import { title } from './tabs/title';
import { discard } from './tabs/discard';
import { pinned } from './tabs/pinned';
import { domain } from './tabs/domain';
import { wait } from './utility/wait';
import { audit } from './dev/audit';
import { tech } from './dev/tech';
import { storage } from './dev/storage';
import { reqs } from './dev/reqs';
import { viewport } from './dev/viewport';
import { frames } from './dev/frames';
import { cookies } from './dev/cookies';
import { env } from './dev/env';
import { jsonld } from './dev/jsonld';
import { downloads } from './downloads/downloads';
import { extensions } from './extensions/extensions';
import { forget } from './privacy/forget';
import { siteinfo } from './privacy/siteinfo';
import { session } from './utility/session';
import { log } from './utility/log';
import { notify } from './utility/notify';
import { watch } from './utility/watch';
import { overlay } from './utility/overlay';
import { recent } from './windows/recent';
import { pin } from './tabs/pin';
import { unpin } from './tabs/unpin';
import { perf } from './dev/perf';
import { permissions } from './privacy/permissions';
import { bind, editBind } from './utility/bind';
import { importVimiumKeys } from './utility/import-vimium-keys';
import { touch } from './builtin/touch';
import { rm } from './builtin/rm';
import { bang } from './bang/bang';
import { edit } from './edit/edit';
import { ps } from './process/ps';
import { kill, pkill, top, renice } from './process/kill';
import { workspace, split, layout, workview } from './workspace/workspace';

export const commandManifest: Command[] = [
  help,
  man,
  apropos,
  ls,
  cd,
  pwd,
  cat,
  echo,
  clear,
  touch,
  rm,
  source,
  alias,
  exportCmd,
  grep,
  head,
  tail,
  wc,
  go,
  search,
  qf,
  here,
  reload,
  back,
  forward,
  open,
  close,
  clip,
  quick,
  config,
  optionsPage,
  userCmd,
  tabs,
  tab,
  windows,
  window,
  sessions,
  find,
  mute,
  detach,
  bookmarks,
  bookmark,
  history,
  ai,
  seek,
  zoom,
  scroll,
  volume,
  audible,
  hints,
  links,
  link,
  shot,
  click,
  fill,
  pick,
  read,
  inputs,
  input,
  press,
  meta,
  images,
  image,
  title,
  discard,
  pinned,
  pin,
  unpin,
  domain,
  wait,
  watch,
  log,
  notify,
  overlay,
  audit,
  perf,
  tech,
  storage,
  reqs,
  viewport,
  frames,
  cookies,
  env,
  jsonld,
  forget,
  siteinfo,
  permissions,
  downloads,
  extensions,
  session,
  recent,
  bind,
  editBind,
  importVimiumKeys,
  bang,
  edit,
  ps,
  top,
  kill,
  pkill,
  renice,
  workspace,
  workview,
  split,
  layout,
];