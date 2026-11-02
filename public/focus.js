/** Restore keyboard position after a dialog or a replaced list. */
export function restoreFocus(preferred, fallback) {
  const usable = element => element?.isConnected && !element.disabled && !element.closest('[hidden], [inert]');
  const target = usable(preferred) ? preferred : usable(fallback) ? fallback : null;
  target?.focus();
  return target;
}
