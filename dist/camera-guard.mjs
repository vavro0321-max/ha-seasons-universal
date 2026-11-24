/** HA Seasons AI — camera-safe inactivity guard.
 * Checks route fragments (#kamery), visible popups/dialogs and playing videos.
 * No access to the actual camera images or video stream contents.
 */
export const DEFAULT_CAMERA_VIEWS=['kamery','kamera','cameras','camera'];
const normalize=s=>String(s||'').trim().toLowerCase();
function segments(s){
  try{s=decodeURIComponent(String(s||''));}catch{ /* use unchanged if malformed */ }
  return normalize(s).split(/[/?#&=]+/).filter(Boolean);
}
export function isCameraRoute(pathname='',hash='',cameraViews=DEFAULT_CAMERA_VIEWS){
  const paths=[...segments(pathname),...segments(hash)];
  const configured=Array.isArray(cameraViews)?cameraViews:String(cameraViews||'').split(/[,;]+/);
  const names=configured.map(x=>segments(x).pop()).filter(Boolean);
  return names.some(name=>paths.includes(name));
}
function visible(el, doc){
  if(el?.getAttribute?.('hidden')!==null)return false;
  if(el?.getAttribute?.('aria-hidden')==='true')return false;
  const style=doc.defaultView?.getComputedStyle?.(el);
  if(style&&(style.display==='none'||style.visibility==='hidden'))return false;
  // An open dialog in a shadow root can have a zero-size host, so do not
  // require a rectangle for explicitly opened native/HA modal components.
  if(el?.matches?.('dialog[open],ha-dialog[open],mwc-dialog[open]'))return true;
  const rect=el?.getBoundingClientRect?.();
  return Boolean(rect&&rect.width>0&&rect.height>0&&rect.bottom>0&&rect.right>0&&rect.top<doc.defaultView.innerHeight&&rect.left<doc.defaultView.innerWidth);
}
function *rootsFrom(doc){
  const pending=[doc],seen=new Set();
  for(let i=0;i<pending.length&&i<130;i++){
    const root=pending[i];if(!root||seen.has(root))continue;seen.add(root);yield root;
    for(const el of root.querySelectorAll('*'))if(el.shadowRoot)pending.push(el.shadowRoot);
  }
}
const MODALS='dialog[open],ha-dialog[open],mwc-dialog[open],ha-more-info-dialog[open],browser-mod-popup[open],browser-mod-dialog[open],[role="dialog"][aria-modal="true"]';
export function cameraBlockReason(doc,location,config={}){
  if(config.block_when_camera_open===false)return '';
  const views=config.camera_views??DEFAULT_CAMERA_VIEWS;
  if(isCameraRoute(location?.pathname||'',location?.hash||'',views))return 'camera-view';
  if(doc.fullscreenElement||doc.pictureInPictureElement)return 'fullscreen-media';
  const extra=String(config.camera_block_selectors||'').trim();
  for(const root of rootsFrom(doc)){
    // Block opened HA more-info popups (including camera more-info), browser_mod,
    // and other visible modal dialogs so the screensaver never hides an open UI.
    for(const element of root.querySelectorAll(MODALS))if(visible(element,doc))return 'open-dialog';
    // A visible stream is blocked even if it is embedded, not a popup.
    for(const v of root.querySelectorAll('video'))if(!v.paused&&!v.ended&&visible(v,doc))return 'playing-video';
    if(extra){
      try{for(const element of root.querySelectorAll(extra))if(visible(element,doc))return 'custom-camera-popup';}
      catch{ /* ignore an invalid user selector rather than break the card */ }
    }
  }
  return '';
}
