/** Shipped ~/.browsershellrc — keybindings, bangs, and aliases enabled out of the box. */

export const DEFAULT_RC = `# BrowserShell 1.0 — edit with: edit /config/rc

# Global page hotkeys (Vimium-style — work when terminal is closed)
bind f hints-current
bind F hints-newtab
bind yf hints-copy
bind j scroll-down
bind k scroll-up
bind h scroll-left
bind l scroll-right
bind gg scroll-top
bind G scroll-bottom
bind d scroll-half-down
bind u scroll-half-up
bind zH scroll-edge-left
bind zL scroll-edge-right
bind H history-back
bind L history-forward
bind gi focus-first-input
bind i insert-mode
bind / seek
bind n seek-next
bind N seek-prev
bind v visual-mode
bind V visual-line
bind yc visual-word
bind y yank-selection
bind p paste-go
bind P paste-go-newtab
bind yy yank-url
bind r reload-page
bind gs view-source
bind gf frame-next
bind gF frame-main
bind gu url-up
bind gU url-root
bind ge edit-url
bind gE edit-url-newtab
bind o open-url
bind O open-url-newtab
bind b bookmark-open
bind B bookmark-newtab
bind ? help-overlay
bind \`\` mark-jump-back
bind t tab-new
bind x tab-close
bind yt tab-duplicate
bind J tab-next
bind K tab-prev
bind gt tab-next
bind gT tab-prev
bind g0 tab-first
bind g$ tab-last
bind ^ tab-previous
bind X tab-restore
bind W tab-move-window
bind <a-p> tab-pin-toggle
bind T tab-search
bind ]] pagination-next
bind [[ pagination-prev
bind <a-f> open-multiple-links
bind <leader>e edit
bind <c-s> save-selection

# Terminal
bind <c-l> clear
bind <c-r> reverse-search

# Editor (when edit is active — arrow keys work by default)
edit-bind <c-s> save-and-exit

leader = "<space>"
global-hotkeys = true
insert-mode-auto = true
hint-chars = "asdfghjklqwertyuiopzxcvbnm"
hint-max = 220
scroll-step = 0.8

# Bangs
bang gh https://github.com/search?q=%s
bang yt https://www.youtube.com/results?search_query=%s
bang so https://stackoverflow.com/search?q=%s
bang mdn https://developer.mozilla.org/en-US/search?q=%s

# Aliases
alias g=go
alias .=qf
alias n=tab next
alias p=tab prev
alias k=tab close current
alias b=bookmark add
alias r=reload
alias ll=tabs
alias lt=ps
alias wv=workview
alias side=layout side-by-side
`;

/** Bump when default rc content changes — triggers one-time migration for existing installs. */
export const RC_VERSION = 8;